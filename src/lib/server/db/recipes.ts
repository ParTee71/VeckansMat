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
		db.prepare('DELETE FROM recipe_ingredient WHERE recipe_id = ?').bind(id),
		...input.ingredients.map((raw, position) =>
			db
				.prepare('INSERT INTO recipe_ingredient (recipe_id, position, raw) VALUES (?, ?, ?)')
				.bind(id, position, raw)
		),
		db.prepare('DELETE FROM recipe_tag WHERE recipe_id = ?').bind(id),
		...input.tags.map((tag) =>
			db.prepare('INSERT OR IGNORE INTO recipe_tag (recipe_id, tag) VALUES (?, ?)').bind(id, tag)
		)
	]);
	return true;
}
