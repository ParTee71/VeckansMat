import { nameKey } from '../../names';
import { isDish, LUNCHBOX_TAG } from '../../recipes';
import { upsertRecipeStatement } from './recipes';

export type Meal = 'dinner' | 'lunch';

export interface NewMenuItem {
	/** The line as written. */
	text: string;
	/** The dish the line is, or null for lines like "Leftovers". */
	recipeName: string | null;
	meal: Meal;
	/** ISO weekday, 1 = Monday. */
	weekday?: number | null;
}

export interface NewMenu {
	/** The Monday of the week, YYYY-MM-DD, or null when unknown. */
	weekStart: string | null;
	source: 'photo' | 'app';
	note?: string | null;
	items: NewMenuItem[];
}

export interface MenuItem {
	text: string;
	meal: Meal;
	weekday: number | null;
	recipeId: number | null;
	recipeName: string | null;
}

export interface Menu {
	id: number;
	weekStart: string | null;
	source: 'photo' | 'app';
	note: string | null;
	items: MenuItem[];
}

/** Saves a week and creates name-only recipes for dishes not seen before, all or nothing. */
export async function saveMenu(db: D1Database, menu: NewMenu): Promise<number> {
	// The first spelling of a new dish names it; blank names count as no dish.
	const dishes = new Map<string, string>();
	for (const item of menu.items) {
		const key = item.recipeName ? nameKey(item.recipeName) : '';
		if (key && !dishes.has(key)) dishes.set(key, item.recipeName!);
	}
	// A batch is one transaction, and a new row gets an id above all others,
	// so max(id) is the menu inserted first in this batch.
	const [inserted] = await db.batch([
		db
			.prepare('INSERT INTO menu (week_start, source, note) VALUES (?, ?, ?) RETURNING id')
			.bind(menu.weekStart, menu.source, menu.note ?? null),
		...[...dishes.values()].map((name) => upsertRecipeStatement(db, name)),
		...menu.items.map((item, position) =>
			db
				.prepare(
					`INSERT INTO menu_item (menu_id, position, weekday, meal, text, recipe_id)
					 VALUES ((SELECT max(id) FROM menu), ?, ?, ?, ?, (SELECT id FROM recipe WHERE name_key = ?))`
				)
				.bind(
					position,
					item.weekday ?? null,
					item.meal,
					item.text,
					item.recipeName ? nameKey(item.recipeName) || null : null
				)
		)
	]);
	return (inserted.results[0] as { id: number }).id;
}

interface MenuRow {
	id: number;
	week_start: string | null;
	source: 'photo' | 'app';
	note: string | null;
}

interface MenuItemRow {
	menu_id: number;
	text: string;
	meal: Meal;
	weekday: number | null;
	recipe_id: number | null;
	recipe_name: string | null;
}

/** All weeks, newest first and undated last, with their lines in order. */
export async function listMenus(db: D1Database): Promise<Menu[]> {
	const [menus, items] = await db.batch([
		db.prepare(
			'SELECT id, week_start, source, note FROM menu ORDER BY week_start IS NULL, week_start DESC, id DESC'
		),
		db.prepare(
			`SELECT i.menu_id, i.text, i.meal, i.weekday, i.recipe_id, r.name AS recipe_name
			 FROM menu_item i LEFT JOIN recipe r ON r.id = i.recipe_id
			 ORDER BY i.menu_id, i.position`
		)
	]);
	const itemsByMenu = Map.groupBy(items.results as unknown as MenuItemRow[], (row) => row.menu_id);
	return (menus.results as unknown as MenuRow[]).map((row) => ({
		id: row.id,
		weekStart: row.week_start,
		source: row.source,
		note: row.note,
		items: (itemsByMenu.get(row.id) ?? []).map((item) => ({
			text: item.text,
			meal: item.meal,
			weekday: item.weekday,
			recipeId: item.recipe_id,
			recipeName: item.recipe_name
		}))
	}));
}

/** A day's dinner or lunch on a week planned in the app. */
export interface WeekRow {
	/** ISO weekday, 1 = Monday. */
	weekday: number;
	meal: Meal;
	text: string;
	recipeId: number | null;
	/** The dish is good for lunch boxes, so extra portions are cooked. */
	lunchbox: boolean;
}

export interface Week {
	weekStart: string;
	/** Whether the week has been written in yet. */
	saved: boolean;
	rows: WeekRow[];
	/** Who eats: those chosen for the week, or else those who ate the latest week before. */
	eaters: number[];
}

// One line per day and meal, dinners first, so the old weeks list them in that order.
const rowPosition = (weekday: number, meal: Meal) => (meal === 'dinner' ? 0 : 7) + weekday - 1;

/** A week as planned in the app. Lines without a weekday, from old notes, are left out. */
export async function getWeek(db: D1Database, weekStart: string): Promise<Week> {
	const [menu, rows, eaters, earlier] = await db.batch([
		db.prepare('SELECT id FROM menu WHERE week_start = ?').bind(weekStart),
		db
			.prepare(
				`SELECT i.weekday, i.meal, i.text, i.recipe_id AS recipeId,
				 EXISTS (SELECT 1 FROM recipe_tag t WHERE t.recipe_id = i.recipe_id AND t.tag = ?) AS lunchbox
				 FROM menu_item i JOIN menu m ON m.id = i.menu_id
				 WHERE m.week_start = ? AND i.weekday IS NOT NULL
				 ORDER BY i.position`
			)
			.bind(LUNCHBOX_TAG, weekStart),
		db
			.prepare(
				'SELECT p.person_id AS id FROM menu_person p JOIN menu m ON m.id = p.menu_id WHERE m.week_start = ?'
			)
			.bind(weekStart),
		db
			.prepare(
				`SELECT person_id AS id FROM menu_person WHERE menu_id = (
				   SELECT m.id FROM menu m
				   WHERE m.week_start < ? AND EXISTS (SELECT 1 FROM menu_person p WHERE p.menu_id = m.id)
				   ORDER BY m.week_start DESC LIMIT 1)`
			)
			.bind(weekStart)
	]);
	const saved = menu.results.length > 0;
	const ids = (result: D1Result) => (result.results as { id: number }[]).map((r) => r.id);
	return {
		weekStart,
		saved,
		rows: (rows.results as unknown as WeekRow[]).map((row) => ({
			...row,
			lunchbox: Boolean(row.lunchbox)
		})),
		eaters: saved ? ids(eaters) : ids(earlier)
	};
}

/**
 * The week's menu, made when the week is first written in. A new week takes the eaters it was
 * shown with.
 */
async function ensureMenu(db: D1Database, weekStart: string, eaters: number[]): Promise<number> {
	const created = await db
		.prepare(
			`INSERT INTO menu (week_start, source) VALUES (?, 'app')
			 ON CONFLICT (week_start) WHERE week_start IS NOT NULL DO NOTHING RETURNING id`
		)
		.bind(weekStart)
		.first<{ id: number }>();
	if (!created) {
		const row = await db
			.prepare('SELECT id FROM menu WHERE week_start = ?')
			.bind(weekStart)
			.first<{ id: number }>();
		return row!.id;
	}
	if (eaters.length) await db.batch(eaterStatements(db, created.id, eaters));
	return created.id;
}

const eaterStatements = (db: D1Database, menuId: number, eaters: number[]) =>
	eaters.map((id) =>
		db
			.prepare(
				'INSERT INTO menu_person (menu_id, person_id) SELECT ?, id FROM person WHERE id = ? ON CONFLICT DO NOTHING'
			)
			.bind(menuId, id)
	);

/**
 * Writes a day's dinner or lunch. A dish not seen before becomes a recipe with just a name, and
 * blank text empties the day.
 */
export async function setWeekRow(
	db: D1Database,
	weekStart: string,
	row: { weekday: number; meal: Meal; text: string },
	eaters: number[]
): Promise<void> {
	const menuId = await ensureMenu(db, weekStart, eaters);
	const text = row.text.trim().replace(/\s+/g, ' ');
	if (!text) {
		await db
			.prepare('DELETE FROM menu_item WHERE menu_id = ? AND weekday = ? AND meal = ?')
			.bind(menuId, row.weekday, row.meal)
			.run();
		return;
	}
	const dish = isDish(text);
	await db.batch([
		...(dish ? [upsertRecipeStatement(db, text)] : []),
		db
			.prepare(
				`INSERT INTO menu_item (menu_id, position, weekday, meal, text, recipe_id)
				 VALUES (?1, ?2, ?3, ?4,
				   -- A dish already in the collection is written as it is named there.
				   coalesce((SELECT name FROM recipe WHERE name_key = ?5), ?6),
				   (SELECT id FROM recipe WHERE name_key = ?5))
				 ON CONFLICT (menu_id, position) DO UPDATE SET
				   weekday = excluded.weekday, meal = excluded.meal, text = excluded.text,
				   recipe_id = excluded.recipe_id`
			)
			.bind(
				menuId,
				rowPosition(row.weekday, row.meal),
				row.weekday,
				row.meal,
				dish ? nameKey(text) : null,
				text
			)
	]);
}

/** Sets who eats the week. */
export async function setWeekEaters(
	db: D1Database,
	weekStart: string,
	eaters: number[]
): Promise<void> {
	const menuId = await ensureMenu(db, weekStart, []);
	await db.batch([
		db.prepare('DELETE FROM menu_person WHERE menu_id = ?').bind(menuId),
		...eaterStatements(db, menuId, eaters)
	]);
}
