import type Anthropic from '@anthropic-ai/sdk';
import { env } from 'cloudflare:workers';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTestDb, createTestDb } from '../../../../test/d1';
import { ask, ClaudeLimitError, costUsd, spentThisMonth } from './claude';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose());
beforeEach(async () => {
	await clearTestDb(db);
	env.CLAUDE_MONTHLY_LIMIT_USD = '5';
});

const usage = (input_tokens: number, output_tokens: number) =>
	({ input_tokens, output_tokens }) as Anthropic.Usage;

// A stand-in for the SDK client: no request leaves the test.
function fakeClaude(answer: Partial<Anthropic.Message> = {}) {
	const create = vi.fn().mockResolvedValue({ content: [], usage: usage(1000, 200), ...answer });
	return { client: { messages: { create } } as unknown as Anthropic, create };
}

const params = {
	model: 'claude-haiku-5-5',
	max_tokens: 100,
	messages: [{ role: 'user' as const, content: 'Hej' }]
};

const logged = async () =>
	(
		await db
			.prepare('SELECT purpose, model, input_tokens, output_tokens, cost_usd FROM claude_call')
			.all()
	).results;

describe('a call to Claude', () => {
	it('is sent as asked and logged with what it cost', async () => {
		const { client, create } = fakeClaude();
		await ask(db, 'recipe', params, client);
		expect(create).toHaveBeenCalledWith(params);
		expect(await logged()).toEqual([
			{
				purpose: 'recipe',
				model: 'claude-haiku-5-5',
				input_tokens: 1000,
				output_tokens: 200,
				cost_usd: (1000 * 0.1 + 200 * 0.5) / 1e6
			}
		]);
	});

	it('is not made once the month has cost the cap', async () => {
		await db
			.prepare(
				"INSERT INTO claude_call (purpose, model, input_tokens, output_tokens, cost_usd) VALUES ('recipe', 'x', 0, 0, 5)"
			)
			.run();
		const { client, create } = fakeClaude();
		await expect(ask(db, 'recipe', params, client)).rejects.toBeInstanceOf(ClaudeLimitError);
		expect(create).not.toHaveBeenCalled();
	});

	it('is not made without a cap', async () => {
		// @ts-expect-error A Worker set up without the var.
		env.CLAUDE_MONTHLY_LIMIT_USD = undefined;
		const { client, create } = fakeClaude();
		await expect(ask(db, 'recipe', params, client)).rejects.toBeInstanceOf(ClaudeLimitError);
		expect(create).not.toHaveBeenCalled();
	});

	it('gives its answer even when the cost cannot be logged', async () => {
		const { client } = fakeClaude();
		const broken = {
			prepare: (sql: string) => {
				if (sql.startsWith('INSERT')) throw new Error('D1 is down');
				return db.prepare(sql);
			}
		} as D1Database;
		await expect(ask(broken, 'recipe', params, client)).resolves.toMatchObject({ content: [] });
	});

	it('that fails is not logged', async () => {
		const { client, create } = fakeClaude();
		create.mockRejectedValue(new Error('overloaded'));
		await expect(ask(db, 'recipe', params, client)).rejects.toThrow('overloaded');
		expect(await logged()).toEqual([]);
	});
});

describe('the cost', () => {
	it('counts only this month', async () => {
		await db
			.prepare(
				"INSERT INTO claude_call (created_at, purpose, model, input_tokens, output_tokens, cost_usd) VALUES ('2020-01-31T23:59:59.000Z', 'recipe', 'x', 0, 0, 9), (strftime('%Y-%m-01T00:00:00.000Z', 'now'), 'recipe', 'x', 0, 0, 1.5)"
			)
			.run();
		expect(await spentThisMonth(db)).toBe(1.5);
	});

	it('counts what is written to and read from the cache', () => {
		const cached = {
			...usage(0, 0),
			cache_creation_input_tokens: 1e6,
			cache_read_input_tokens: 1e6
		};
		// Sonnet: $2 per million in, a quarter more to write the cache and a tenth to read it.
		expect(costUsd('claude-sonnet-5-5', cached)).toBeCloseTo(2.5 + 0.2);
	});

	it('of a model without a price is counted high, so the cap holds', () => {
		expect(costUsd('claude-okand', usage(1e6, 0))).toBeGreaterThan(
			costUsd('claude-sonnet-5-5', usage(1e6, 0))
		);
	});
});
