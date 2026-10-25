import { nameKey } from '../../names';
import type { Meal } from './menus';

/** Inserts a recipe with just a name, unless one with the same key exists. */
export function upsertRecipeStatement(db: D1Database, name: string): D1PreparedStatement {
	return db
		.prepare('INSERT INTO recipe (name, name_key) VALUES (?, ?) ON CONFLICT (name_key) DO NOTHING')
		.bind(name.trim(), nameKey(name));
}

export interface RecipeSummary {
	id: number;
	name: string;
	/** How many lines in the weeks are this dish. */
	timesEaten: number;
	/** The Monday of the latest dated week with the dish, or null. */
	lastWeek: string | null;
}

/** All recipes with how often and when they were last eaten, in no particular order. */
export async function listRecipes(db: D1Database): Promise<RecipeSummary[]> {
	const { results } = await db
		.prepare(
			`SELECT r.id, r.name, count(i.id) AS timesEaten, max(m.week_start) AS lastWeek
			 FROM recipe r
			 LEFT JOIN menu_item i ON i.recipe_id = r.id
			 LEFT JOIN menu m ON m.id = i.menu_id
			 GROUP BY r.id`
		)
		.all<RecipeSummary>();
	return results;
}

export interface RecipeWeek {
	menuId: number;
	weekStart: string | null;
	meal: Meal;
}

export interface Recipe {
	id: number;
	name: string;
	servings: number | null;
	timeMinutes: number | null;
	instructions: string | null;
	sourceUrl: string | null;
	/** The ingredient lines as written. */
	ingredients: string[];
	tags: string[];
	/** The weeks with the dish, newest first and undated last. */
	weeks: RecipeWeek[];
}

/** One recipe with everything about it, or null when there is none with the id. */
export async function getRecipe(db: D1Database, id: number): Promise<Recipe | null> {
	const [recipe, ingredients, tags, weeks] = await db.batch([
		db
			.prepare(
				`SELECT id, name, servings, time_minutes AS timeMinutes, instructions, source_url AS sourceUrl
				 FROM recipe WHERE id = ?`
			)
			.bind(id),
		db.prepare('SELECT raw FROM recipe_ingredient WHERE recipe_id = ? ORDER BY position').bind(id),
		db.prepare('SELECT tag FROM recipe_tag WHERE recipe_id = ? ORDER BY tag').bind(id),
		db
			.prepare(
				`SELECT m.id AS menuId, m.week_start AS weekStart, i.meal
				 FROM menu_item i JOIN menu m ON m.id = i.menu_id
				 WHERE i.recipe_id = ?
				 ORDER BY m.week_start IS NULL, m.week_start DESC, m.id DESC, i.position`
			)
			.bind(id)
	]);
	const row = recipe.results[0] as Omit<Recipe, 'ingredients' | 'tags' | 'weeks'> | undefined;
	if (!row) return null;
	return {
		...row,
		ingredients: (ingredients.results as { raw: string }[]).map((r) => r.raw),
		tags: (tags.results as { tag: string }[]).map((r) => r.tag),
		weeks: weeks.results as unknown as RecipeWeek[]
	};
}

/** Adds a recipe with just a name, or finds the one that already has it. */
export async function addRecipe(db: D1Database, name: string): Promise<number> {
	const key = nameKey(name);
	if (!key) throw new Error('A recipe needs a name');
	const [, found] = await db.batch([
		upsertRecipeStatement(db, name),
		db.prepare('SELECT id FROM recipe WHERE name_key = ?').bind(key)
	]);
	return (found.results[0] as { id: number }).id;
}

export type RecipeInput = Omit<Recipe, 'id' | 'weeks'>;

/** Thrown when a recipe is renamed to a name another recipe has. */
export class NameTakenError extends Error {}

/** Replaces everything about a recipe, all or nothing. False when there is no recipe with the id. */
export async function updateRecipe(
	db: D1Database,
	id: number,
	input: RecipeInput
): Promise<boolean> {
	const key = nameKey(input.name);
	const { results } = await db
		.prepare('SELECT id FROM recipe WHERE id = ? OR name_key = ?')
		.bind(id, key)
		.all<{ id: number }>();
	if (!results.some((row) => row.id === id)) return false;
	if (results.some((row) => row.id !== id)) throw new NameTakenError(input.name);
	await db.batch([
		db
			.prepare(
				`UPDATE recipe SET name = ?, name_key = ?, servings = ?, time_minutes = ?, instructions = ?,
				 source_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
				 WHERE id = ?`
			)
			.bind(
				input.name.trim(),
				key,
				input.servings,
				input.timeMinutes,
				input.instructions,
				input.sourceUrl,
				id
			),
		...detailStatements(db, id, input)
	]);
	return true;
}

/**
 * Replaces the ingredients and tags of a recipe. The recipe is given by its id, or by an SQL
 * expression that finds it when it is inserted in the same batch.
 */
function detailStatements(
	db: D1Database,
	recipe: number | { nameKey: string },
	input: RecipeInput
): D1PreparedStatement[] {
	const isNew = typeof recipe !== 'number';
	const [id, arg] = isNew
		? ['(SELECT id FROM recipe WHERE name_key = ?)', recipe.nameKey]
		: ['?', recipe];
	return [
		// A recipe inserted in the same batch has nothing to replace.
		...(isNew
			? []
			: [
					db.prepare('DELETE FROM recipe_ingredient WHERE recipe_id = ?').bind(arg),
					db.prepare('DELETE FROM recipe_tag WHERE recipe_id = ?').bind(arg)
				]),
		...input.ingredients.map((raw, position) =>
			db
				.prepare(`INSERT INTO recipe_ingredient (recipe_id, position, raw) VALUES (${id}, ?, ?)`)
				.bind(arg, position, raw)
		),
		...input.tags.map((tag) =>
			db
				.prepare(`INSERT OR IGNORE INTO recipe_tag (recipe_id, tag) VALUES (${id}, ?)`)
				.bind(arg, tag)
		)
	];
}

/** Adds a whole recipe, all or nothing, and gives its id. */
export async function createRecipe(db: D1Database, input: RecipeInput): Promise<number> {
	const key = nameKey(input.name);
	if (!key) throw new Error('A recipe needs a name');
	try {
		// A batch is one transaction: a taken name fails the insert and nothing is written.
		const results = await db.batch([
			db
				.prepare(
					`INSERT INTO recipe (name, name_key, servings, time_minutes, instructions, source_url)
					 VALUES (?, ?, ?, ?, ?, ?)`
				)
				.bind(
					input.name.trim(),
					key,
					input.servings,
					input.timeMinutes,
					input.instructions,
					input.sourceUrl
				),
			...detailStatements(db, { nameKey: key }, input)
		]);
		return results[0].meta.last_row_id;
	} catch (e) {
		// D1 reports the constraint only in the message.
		if (String(e).includes('UNIQUE constraint failed: recipe.name_key'))
			throw new NameTakenError(input.name);
		throw e;
	}
}

export interface RecipeMatch {
	id: number;
	name: string;
	/** True when the recipe has no ingredients or steps yet, so an import may fill it in. */
	onlyName: boolean;
	timesEaten: number;
}

/** The recipe with the same name, written in any case or spacing, or null. */
export async function findRecipeByName(db: D1Database, name: string): Promise<RecipeMatch | null> {
	const row = await db
		.prepare(
			`SELECT r.id, r.name,
			   r.instructions IS NULL AND NOT EXISTS
			     (SELECT 1 FROM recipe_ingredient WHERE recipe_id = r.id) AS onlyName,
			   (SELECT count(*) FROM menu_item WHERE recipe_id = r.id) AS timesEaten
			 FROM recipe r WHERE r.name_key = ?`
		)
		.bind(nameKey(name))
		.first<Omit<RecipeMatch, 'onlyName'> & { onlyName: number }>();
	return row && { ...row, onlyName: row.onlyName === 1 };
}
