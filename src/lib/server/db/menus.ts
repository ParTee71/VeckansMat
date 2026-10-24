import { nameKey, upsertRecipeStatement } from './recipes';

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
	const recipeNames = menu.items.flatMap((item) => (item.recipeName ? [item.recipeName] : []));
	// A batch runs as one transaction on D1's single writer, so the newest menu
	// row is the one inserted just before the items.
	const results = await db.batch([
		...recipeNames.map((name) => upsertRecipeStatement(db, name)),
		db
			.prepare('INSERT INTO menu (week_start, source, note) VALUES (?, ?, ?) RETURNING id')
			.bind(menu.weekStart, menu.source, menu.note ?? null),
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
					item.recipeName ? nameKey(item.recipeName) : null
				)
		)
	]);
	return (results[recipeNames.length].results[0] as { id: number }).id;
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
