import { readdirSync, readFileSync } from 'node:fs';
import { getPlatformProxy } from 'wrangler';

const migrationsDir = new URL('../migrations/', import.meta.url);

/**
 * A real local D1 database, in memory and migrated, for tests. Call dispose() when done.
 */
export async function createTestDb() {
	const proxy = await getPlatformProxy<Env>({ persist: false });
	const db = proxy.env.DB;
	for (const file of readdirSync(migrationsDir).sort()) {
		const sql = readFileSync(new URL(file, migrationsDir), 'utf8');
		const statements = sql
			.split(/;\s*$/m)
			.map((statement) => statement.trim())
			.filter((statement) => statement.replace(/^--.*$/gm, '').trim() !== '');
		await db.batch(statements.map((statement) => db.prepare(statement)));
	}
	return { db, dispose: () => proxy.dispose() };
}

/** Empties every table, so each test starts from a clean database. */
export async function clearTestDb(db: D1Database) {
	await db.batch(
		['menu_item', 'menu', 'recipe_tag', 'recipe_ingredient', 'recipe'].map((table) =>
			db.prepare(`DELETE FROM ${table}`)
		)
	);
}
