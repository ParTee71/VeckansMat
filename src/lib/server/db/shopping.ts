import { cleanText } from '../../names';
import { ensureMenu } from './menus';

export type Origin = 'recipe' | 'claude' | 'hand';

export interface ShoppingItem {
	id: number;
	text: string;
	/** The heading the item is listed under: the dish for a line taken straight from a recipe. */
	section: string | null;
	origin: Origin;
	checked: boolean;
}

/** A dish on the week. */
export interface WeekDish {
	id: number;
	name: string;
	hasIngredients: boolean;
}

/** The week's dishes, each once, with when it is first eaten, as `days`. */
const WEEK_DISHES = `WITH days AS (
	SELECT i.recipe_id, min(i.weekday * 2 + (i.meal = 'dinner')) AS first
	FROM menu_item i JOIN menu m ON m.id = i.menu_id
	WHERE m.week_start = ?1 AND i.weekday IS NOT NULL AND i.recipe_id IS NOT NULL
	GROUP BY i.recipe_id)`;

/** The dishes on a week, each once, in the order they are first eaten. */
export async function weekDishes(db: D1Database, weekStart: string): Promise<WeekDish[]> {
	const { results } = await db
		.prepare(
			`${WEEK_DISHES}
			 SELECT r.id, r.name, EXISTS (SELECT 1 FROM recipe_ingredient WHERE recipe_id = r.id) AS hasIngredients
			 FROM days d JOIN recipe r ON r.id = d.recipe_id
			 ORDER BY d.first`
		)
		.bind(weekStart)
		.all<Omit<WeekDish, 'hasIngredients'> & { hasIngredients: number }>();
	return results.map((dish) => ({ ...dish, hasIngredients: Boolean(dish.hasIngredients) }));
}

/** The week's shopping list in the order it was written. */
export async function getShoppingList(db: D1Database, weekStart: string): Promise<ShoppingItem[]> {
	const { results } = await db
		.prepare(
			`SELECT s.id, s.text, s.section, s.origin, s.checked
			 FROM shopping_item s JOIN menu m ON m.id = s.menu_id
			 WHERE m.week_start = ? ORDER BY s.position, s.id`
		)
		.bind(weekStart)
		.all<Omit<ShoppingItem, 'checked'> & { checked: number }>();
	return results.map((item) => ({ ...item, checked: Boolean(item.checked) }));
}

/**
 * Makes the list from the week's dishes, a heading per dish with its lines as written. What was
 * written by hand and what is in the basket stays, and is not added twice.
 */
export async function makeShoppingList(db: D1Database, weekStart: string): Promise<void> {
	const menuId = await ensureMenu(db, weekStart);
	await db.batch([
		db
			.prepare("DELETE FROM shopping_item WHERE menu_id = ? AND origin <> 'hand' AND checked = 0")
			.bind(menuId),
		db
			.prepare(
				`${WEEK_DISHES}
				 INSERT INTO shopping_item (menu_id, position, text, section, origin)
				 SELECT ?2, (SELECT coalesce(max(position), -1) FROM shopping_item WHERE menu_id = ?2)
				     + row_number() OVER (ORDER BY d.first, i.position),
				   i.raw, r.name, 'recipe'
				 FROM days d JOIN recipe r ON r.id = d.recipe_id
				 JOIN recipe_ingredient i ON i.recipe_id = r.id
				 WHERE trim(i.raw) <> '' AND NOT EXISTS (SELECT 1 FROM shopping_item s
				   WHERE s.menu_id = ?2 AND s.checked = 1 AND s.text = i.raw AND s.section = r.name)`
			)
			.bind(weekStart, menuId)
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
