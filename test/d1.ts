import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { getPlatformProxy } from 'wrangler';

/**
 * A real local D1 database with all migrations applied, of its own for each caller.
 * Call dispose() when done.
 */
export async function createTestDb() {
	const dir = mkdtempSync(join(tmpdir(), 'veckansmat-d1-test-'));
	cpSync(inject('migratedD1'), dir, { recursive: true });
	const proxy = await getPlatformProxy<Env>({ persist: { path: join(dir, 'v3') } });
	return {
		db: proxy.env.DB,
		dispose: async () => {
			await proxy.dispose();
			rmSync(dir, { recursive: true, force: true });
		}
	};
}

/** Empties the database, so each test starts clean. The other tables follow by cascade. */
export async function clearTestDb(db: D1Database) {
	await db.batch([
		db.prepare('DELETE FROM menu'),
		db.prepare('DELETE FROM recipe'),
		db.prepare('DELETE FROM claude_call')
	]);
}
