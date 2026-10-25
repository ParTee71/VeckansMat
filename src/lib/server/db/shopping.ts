import { cleanText } from '../../names';
import { LUNCHBOX_TAG } from '../../recipes';
import { ensureMenu } from './menus';
import { guessIngredientsStatements } from './recipes';

type Origin = 'recipe' | 'claude' | 'hand';

/** A dish an item is for, and whether its lines are Claude's guess. */
export interface ItemDish {
	name: string;
	guessed: boolean;
}

export interface ShoppingItem {
	id: number;
	text: string;
	/** How much, such as "400 g", when Claude has worked it out. */
	amount: string | null;
	/** The heading the item is listed under: the store section, or the dish for a recipe's line. */
	section: string | null;
	/** The dishes whose lines the item covers, in the order its lines were given. */
	dishes: ItemDish[];
	origin: Origin;
	checked: boolean;
}

/** A dish on the week. */
export interface WeekDish {
	id: number;
	name: string;
	servings: number | null;
	/** The ingredient lines as written. */
	ingredients: string[];
	ingredientsGuessed: boolean;
	lunchbox: boolean;
	/** How many dinners and lunches of the week it is. */
	times: number;
}

/** The week's dishes, each once, with when it is first eaten and how often, as `days`. */
const WEEK_DISHES = `WITH days AS (
	SELECT i.recipe_id, min(i.weekday * 2 + (i.meal = 'dinner')) AS first, count(*) AS times
	FROM menu_item i JOIN menu m ON m.id = i.menu_id
	WHERE m.week_start = ?1 AND i.weekday IS NOT NULL AND i.recipe_id IS NOT NULL
	GROUP BY i.recipe_id)`;

/** The dishes on a week, each once, in the order they are first eaten. */
export async function weekDishes(db: D1Database, weekStart: string): Promise<WeekDish[]> {
	const { results } = await db
		.prepare(
			`${WEEK_DISHES}
			 SELECT r.id, r.name, r.servings, r.ingredients_guessed AS ingredientsGuessed, d.times,
			   EXISTS (SELECT 1 FROM recipe_tag t WHERE t.recipe_id = r.id AND t.tag = ?2) AS lunchbox,
			   (SELECT json_group_array(raw) FROM
			     (SELECT raw FROM recipe_ingredient WHERE recipe_id = r.id ORDER BY position)) AS ingredients
			 FROM days d JOIN recipe r ON r.id = d.recipe_id
			 ORDER BY d.first`
		)
		.bind(weekStart, LUNCHBOX_TAG)
		.all<
			Omit<WeekDish, 'ingredients' | 'ingredientsGuessed' | 'lunchbox'> & {
				ingredients: string;
				ingredientsGuessed: number;
				lunchbox: number;
			}
		>();
	return results.map((dish) => ({
		...dish,
		ingredients: JSON.parse(dish.ingredients),
		ingredientsGuessed: Boolean(dish.ingredientsGuessed),
		lunchbox: Boolean(dish.lunchbox)
	}));
}

/** The week's shopping list in the order it was written. */
export async function getShoppingList(db: D1Database, weekStart: string): Promise<ShoppingItem[]> {
	const { results } = await db
		.prepare(
			`SELECT s.id, s.text, s.amount, s.section, s.origin, s.checked,
			   (SELECT json_group_array(json_object('name', name, 'guessed', guessed)) FROM
			     (SELECT r.name, r.ingredients_guessed AS guessed
			      FROM shopping_item_source l JOIN recipe r ON r.id = l.recipe_id
			      WHERE l.item_id = s.id GROUP BY r.id ORDER BY min(l.rowid))) AS dishes
			 FROM shopping_item s JOIN menu m ON m.id = s.menu_id
			 WHERE m.week_start = ? ORDER BY s.position, s.id`
		)
		.bind(weekStart)
		.all<Omit<ShoppingItem, 'checked' | 'dishes'> & { checked: number; dishes: string }>();
	return results.map((item) => ({
		...item,
		checked: Boolean(item.checked),
		dishes: (JSON.parse(item.dishes) as { name: string; guessed: number }[]).map((dish) => ({
			name: dish.name,
			guessed: Boolean(dish.guessed)
		}))
	}));
}

/** What the week's list was made from, or null when it has not been made. */
export async function getShoppingBasis(db: D1Database, weekStart: string): Promise<string | null> {
	const row = await db
		.prepare('SELECT shopping_basis AS basis FROM menu WHERE week_start = ?')
		.bind(weekStart)
		.first<{ basis: string | null }>();
	return row?.basis ?? null;
}

/** A recipe line, by its dish and its position among the dish's lines. */
export interface Line {
	recipeId: number;
	position: number;
}

/** An item for the new list, with the recipe lines it covers. */
export interface NewShoppingItem {
	text: string;
	amount: string | null;
	section: string;
	lines: Line[];
}

/** Ingredients Claude guessed for a dish that had only a name. */
export interface Guess {
	recipeId: number;
	ingredients: string[];
}

/**
 * Saves the week's list in place of the one before, with what it was made from (`basis`) and the
 * ingredients Claude guessed. What was written by hand and what is in the basket stays. An item
 * whose lines are all covered by items in the basket is not added again; an item that covers no
 * line is known by its text instead. All in one batch, so the basket is read as it is when the
 * list is written.
 */
export async function saveShoppingList(
	db: D1Database,
	weekStart: string,
	list: { origin: 'recipe' | 'claude'; items: NewShoppingItem[]; guesses?: Guess[]; basis: string }
): Promise<void> {
	const menuId = await ensureMenu(db, weekStart);
	await db.batch([
		db
			.prepare("DELETE FROM shopping_item WHERE menu_id = ? AND origin <> 'hand' AND checked = 0")
			.bind(menuId),
		db.prepare('UPDATE menu SET shopping_basis = ? WHERE id = ?').bind(list.basis, menuId),
		...(list.guesses ?? []).flatMap((g) =>
			guessIngredientsStatements(db, g.recipeId, g.ingredients)
		),
		// A batch is one transaction, so the newest item is the one inserted just before its lines.
		...list.items.flatMap((item) => [
			db
				.prepare(
					`INSERT INTO shopping_item (menu_id, position, text, amount, section, origin)
					 SELECT ?1, (SELECT coalesce(max(position) + 1, 0) FROM shopping_item WHERE menu_id = ?1),
					   ?2, ?3, ?4, ?5`
				)
				.bind(menuId, item.text, item.amount, item.section, list.origin),
			db
				.prepare(
					`INSERT OR IGNORE INTO shopping_item_source (item_id, recipe_id, position)
					 SELECT (SELECT max(id) FROM shopping_item), value ->> '$.recipeId', value ->> '$.position'
					 FROM json_each(?)`
				)
				.bind(JSON.stringify(item.lines))
		]),
		// The items just added are the only ones left out of the basket that are not written by hand.
		db
			.prepare(
				`DELETE FROM shopping_item AS s
				 WHERE s.menu_id = ?1 AND s.checked = 0 AND s.origin <> 'hand' AND CASE
				   WHEN EXISTS (SELECT 1 FROM shopping_item_source WHERE item_id = s.id)
				   THEN NOT EXISTS (SELECT 1 FROM shopping_item_source l WHERE l.item_id = s.id AND NOT EXISTS
				     (SELECT 1 FROM shopping_item_source b JOIN shopping_item c ON c.id = b.item_id
				      WHERE c.menu_id = ?1 AND c.checked = 1 AND b.recipe_id = l.recipe_id
				        AND b.position = l.position))
				   ELSE EXISTS (SELECT 1 FROM shopping_item c
				     WHERE c.menu_id = ?1 AND c.checked = 1 AND c.origin <> 'hand' AND lower(c.text) = lower(s.text))
				 END`
			)
			.bind(menuId)
	]);
}

/** Adds an item written by hand. Blank text adds nothing. */
export async function addShoppingItem(
	db: D1Database,
	weekStart: string,
	text: string
): Promise<void> {
	const clean = cleanText(text);
	if (!clean) return;
	await db
		.prepare(
			`INSERT INTO shopping_item (menu_id, position, text, origin)
			 SELECT ?1, (SELECT coalesce(max(position) + 1, 0) FROM shopping_item WHERE menu_id = ?1), ?2, 'hand'`
		)
		.bind(await ensureMenu(db, weekStart), clean)
		.run();
}

export async function setShoppingItemChecked(
	db: D1Database,
	id: number,
	checked: boolean
): Promise<void> {
	await db
		.prepare('UPDATE shopping_item SET checked = ? WHERE id = ?')
		.bind(checked ? 1 : 0, id)
		.run();
}

export async function deleteShoppingItem(db: D1Database, id: number): Promise<void> {
	await db.prepare('DELETE FROM shopping_item WHERE id = ?').bind(id).run();
}
