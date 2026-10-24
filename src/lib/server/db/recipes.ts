export interface Recipe {
	id: number;
	name: string;
}

/** The same dish written with other spacing or case gets the same key. */
export function nameKey(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv');
}

/** Inserts a recipe with just a name, unless one with the same key exists. */
export function upsertRecipeStatement(db: D1Database, name: string): D1PreparedStatement {
	return db
		.prepare('INSERT INTO recipe (name, name_key) VALUES (?, ?) ON CONFLICT (name_key) DO NOTHING')
		.bind(name.trim(), nameKey(name));
}

/** Returns the recipe with this name, creating it with just the name if needed. */
export async function findOrCreateRecipe(db: D1Database, name: string): Promise<Recipe> {
	const [, found] = await db.batch<Recipe>([
		upsertRecipeStatement(db, name),
		db.prepare('SELECT id, name FROM recipe WHERE name_key = ?').bind(nameKey(name))
	]);
	return found.results[0];
}
