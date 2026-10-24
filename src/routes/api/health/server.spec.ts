import { env } from 'cloudflare:workers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pkg from '../../../../package.json' with { type: 'json' };
import { createTestDb } from '../../../../test/d1';
import { GET } from './+server';

type Event = Parameters<typeof GET>[0];

let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db: env.DB, dispose } = await createTestDb());
});
afterAll(() => dispose());

describe('GET /api/health', () => {
	it('answers ok with the package version when the database answers', async () => {
		const response = await GET({} as Event);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'ok',
			version: pkg.version,
			database: 'ok'
		});
	});

	it('answers 503 when the database does not', async () => {
		const db = env.DB;
		env.DB = {
			prepare: () => {
				throw new Error('no database');
			}
		} as unknown as D1Database;
		const response = await Promise.resolve(GET({} as Event)).finally(() => (env.DB = db));
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ status: 'error', database: 'error' });
	});
});
