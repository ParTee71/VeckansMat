import { cleanText, nameKey } from '../../names';
import { isDish, LUNCHBOX_TAG } from '../../recipes';
import { addWeeks } from '../../weeks';
import { upsertRecipeStatement, type RecipeSummary } from './recipes';

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

/** A dish Claude suggests, with why. */
export interface Choice {
	text: string;
	reason: string;
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
	/** Why Claude chose the dish, or null when it was written by hand. */
	reason: string | null;
	/** What a tap on swap goes through, in order. */
	alternatives: Choice[];
	/** The dishes swapped away from the day. */
	passedOn: string[];
}

export interface Week {
	weekStart: string;
	/** Whether the week has been written in yet. */
	saved: boolean;
	rows: WeekRow[];
	/** Who eats: those chosen for the week, or else those who ate the latest week before. */
	eaters: number[];
	/** What the household wished for the week when Claude suggested it. */
	wish: string | null;
}

/** The latest week before a week with eaters chosen, who eat a new week until others are chosen. */
const LATEST_EATERS_BEFORE = `SELECT m.id FROM menu m
	WHERE m.week_start < ? AND EXISTS (SELECT 1 FROM menu_person p WHERE p.menu_id = m.id)
	ORDER BY m.week_start DESC LIMIT 1`;

type WeekRowRow = Omit<WeekRow, 'lunchbox' | 'alternatives' | 'passedOn'> & {
	lunchbox: number;
	alternatives: string | null;
	passedOn: string | null;
};

/** A week as planned in the app. Lines without a weekday, from old notes, are left out. */
export async function getWeek(db: D1Database, weekStart: string): Promise<Week> {
	const [menu, rows, eaters, earlier] = await db.batch([
		db.prepare('SELECT id, wish FROM menu WHERE week_start = ?').bind(weekStart),
		db
			.prepare(
				`SELECT i.weekday, i.meal, i.text, i.recipe_id AS recipeId,
				 EXISTS (SELECT 1 FROM recipe_tag t WHERE t.recipe_id = i.recipe_id AND t.tag = ?) AS lunchbox,
				 i.reason, i.alternatives, i.passed_on AS passedOn
				 FROM menu_item i JOIN menu m ON m.id = i.menu_id
				 WHERE m.week_start = ? AND i.weekday IS NOT NULL
				 ORDER BY i.weekday, i.position`
			)
			.bind(LUNCHBOX_TAG, weekStart),
		db
			.prepare(
				'SELECT p.person_id AS id FROM menu_person p JOIN menu m ON m.id = p.menu_id WHERE m.week_start = ?'
			)
			.bind(weekStart),
		db
			.prepare(`SELECT person_id AS id FROM menu_person WHERE menu_id = (${LATEST_EATERS_BEFORE})`)
			.bind(weekStart)
	]);
	const saved = menu.results.length > 0;
	const ids = (result: D1Result) => (result.results as { id: number }[]).map((r) => r.id);
	return {
		weekStart,
		saved,
		rows: (rows.results as unknown as WeekRowRow[]).map((row) => ({
			...row,
			lunchbox: Boolean(row.lunchbox),
			alternatives: row.alternatives ? JSON.parse(row.alternatives) : [],
			passedOn: row.passedOn ? JSON.parse(row.passedOn) : []
		})),
		eaters: saved ? ids(eaters) : ids(earlier),
		wish: saved ? (menu.results[0] as { wish: string | null }).wish : null
	};
}

/**
 * The week's menu, made when the week is first written in. A new week takes the eaters it was
 * shown with, or when they are not given, those who ate the latest week before.
 */
export async function ensureMenu(
	db: D1Database,
	weekStart: string,
	eaters?: number[]
): Promise<number> {
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
	if (!eaters) {
		await db
			.prepare(
				`INSERT INTO menu_person (menu_id, person_id)
				 SELECT ?, person_id FROM menu_person WHERE menu_id = (${LATEST_EATERS_BEFORE})`
			)
			.bind(created.id, weekStart)
			.run();
	} else if (eaters.length) await db.batch(eaterStatements(db, created.id, eaters));
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

/** A day's line as it is written, with why and what to swap to when Claude suggested it. */
export interface RowInput {
	weekday: number;
	meal: Meal;
	text: string;
	reason?: string | null;
	alternatives?: Choice[];
	passedOn?: string[];
}

/**
 * Writes a day's dinner or lunch. A dish not seen before becomes a recipe with just a name, and
 * blank text empties the day.
 */
export function setWeekRow(
	db: D1Database,
	weekStart: string,
	row: RowInput,
	eaters: number[]
): Promise<void> {
	return setWeekRows(db, weekStart, [row], eaters);
}

/** Writes several days at once, all or nothing. */
export async function setWeekRows(
	db: D1Database,
	weekStart: string,
	rows: RowInput[],
	eaters: number[]
): Promise<void> {
	const menuId = await ensureMenu(db, weekStart, eaters);
	await db.batch(rows.flatMap((row) => rowStatements(db, menuId, row)));
}

function rowStatements(db: D1Database, menuId: number, row: RowInput): D1PreparedStatement[] {
	const text = cleanText(row.text);
	if (!text) {
		return [
			db
				.prepare('DELETE FROM menu_item WHERE menu_id = ? AND weekday = ? AND meal = ?')
				.bind(menuId, row.weekday, row.meal)
		];
	}
	const dish = isDish(text);
	const args = [
		menuId,
		row.weekday,
		row.meal,
		dish ? nameKey(text) : null,
		text,
		row.reason || null,
		row.alternatives?.length ? JSON.stringify(row.alternatives) : null,
		row.passedOn?.length ? JSON.stringify(row.passedOn) : null
	];
	return [
		...(dish ? [upsertRecipeStatement(db, text)] : []),
		// The day's line is changed where it is, or added after all others, so lines from an old
		// note for the same week are never written over.
		db
			.prepare(
				`UPDATE menu_item SET
				   -- A dish already in the collection is written as it is named there.
				   text = coalesce((SELECT name FROM recipe WHERE name_key = ?4), ?5),
				   recipe_id = (SELECT id FROM recipe WHERE name_key = ?4),
				   reason = ?6, alternatives = ?7, passed_on = ?8
				 WHERE menu_id = ?1 AND weekday = ?2 AND meal = ?3`
			)
			.bind(...args),
		db
			.prepare(
				`INSERT INTO menu_item (menu_id, position, weekday, meal, text, recipe_id, reason, alternatives, passed_on)
				 SELECT ?1, (SELECT coalesce(max(position) + 1, 0) FROM menu_item WHERE menu_id = ?1),
				   ?2, ?3, coalesce((SELECT name FROM recipe WHERE name_key = ?4), ?5),
				   (SELECT id FROM recipe WHERE name_key = ?4), ?6, ?7, ?8
				 WHERE NOT EXISTS (
				   SELECT 1 FROM menu_item WHERE menu_id = ?1 AND weekday = ?2 AND meal = ?3)`
			)
			.bind(...args)
	];
}

/** Keeps what the household wished for the week, or nothing when it is blank. */
export async function setWeekWish(
	db: D1Database,
	weekStart: string,
	wish: string,
	eaters: number[]
): Promise<void> {
	const menuId = await ensureMenu(db, weekStart, eaters);
	await db
		.prepare('UPDATE menu SET wish = ? WHERE id = ?')
		.bind(wish.trim() || null, menuId)
		.run();
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

/** A dish in the collection, with how often and when it was eaten before a week. */
export type DishHistory = Omit<RecipeSummary, 'id'> & { tags: string[] };

/** A week before, with its lines in order. Old notes do not always say the day. */
export interface PastWeek {
	weekStart: string;
	rows: { weekday: number | null; meal: Meal; text: string }[];
}

/** What a suggestion for a week builds on: every dish, and the weeks just before. */
export async function getMenuHistory(
	db: D1Database,
	weekStart: string,
	weeks: number
): Promise<{ dishes: DishHistory[]; pastWeeks: PastWeek[] }> {
	const [dishes, rows] = await db.batch([
		db
			.prepare(
				`SELECT r.name,
				   (SELECT json_group_array(tag) FROM (SELECT tag FROM recipe_tag WHERE recipe_id = r.id ORDER BY tag)) AS tags,
				   count(e.recipe_id) AS timesEaten, max(e.week_start) AS lastWeek
				 FROM recipe r
				 LEFT JOIN (
				   SELECT i.recipe_id, m.week_start FROM menu_item i JOIN menu m ON m.id = i.menu_id
				   WHERE m.week_start IS NULL OR m.week_start < ?1
				 ) e ON e.recipe_id = r.id
				 GROUP BY r.id
				 ORDER BY r.name`
			)
			.bind(weekStart),
		db
			.prepare(
				`SELECT m.week_start AS weekStart, i.weekday, i.meal, i.text
				 FROM menu m JOIN menu_item i ON i.menu_id = m.id
				 WHERE m.week_start < ?1 AND m.week_start >= ?2
				 ORDER BY m.week_start DESC, i.weekday IS NULL, i.weekday, i.meal DESC, i.position`
			)
			.bind(weekStart, addWeeks(weekStart, -weeks))
	]);
	type Row = PastWeek['rows'][number] & { weekStart: string };
	const byWeek = Map.groupBy(rows.results as unknown as Row[], (row) => row.weekStart);
	return {
		dishes: (dishes.results as unknown as (Omit<DishHistory, 'tags'> & { tags: string })[]).map(
			(dish) => ({ ...dish, tags: JSON.parse(dish.tags) })
		),
		pastWeeks: [...byWeek].map(([weekStart, rows]) => ({
			weekStart,
			rows: rows.map(({ weekday, meal, text }) => ({ weekday, meal, text }))
		}))
	};
}
