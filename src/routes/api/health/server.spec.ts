import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../../../package.json' with { type: 'json' };
import { GET } from './+server';

type Event = Parameters<typeof GET>[0];

// The real database is covered by the e2e test of the same endpoint.
const database = (first: () => Promise<unknown>) =>
	({ prepare: () => ({ first }) }) as unknown as D1Database;

afterEach(() => vi.restoreAllMocks());

describe('GET /api/health', () => {
	it('answers ok with the package version when the database answers', async () => {
		env.DB = database(async () => ({ 1: 1 }));
		const response = await GET({} as Event);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'ok',
			version: pkg.version,
			database: 'ok'
		});
	});

	it('answers 503 when the database does not', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		env.DB = database(() => Promise.reject(new Error('no database')));
		const response = await GET({} as Event);
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ status: 'error', database: 'error' });
	});
});
