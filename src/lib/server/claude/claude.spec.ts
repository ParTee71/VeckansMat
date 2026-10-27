import type Anthropic from '@anthropic-ai/sdk';
import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import {
	ask,
	askFor,
	askJson,
	ClaudeLimitError,
	costUsd,
	spentThisMonth,
	type Ask
} from './claude';

let db: D1Database;
useTestDb((test) => (db = test));
beforeEach(async () => {
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
		expect(create).toHaveBeenCalledWith(params, { timeout: 60_000 });
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

	it('logs how long it took', async () => {
		const { client, create } = fakeClaude();
		// The clock moves only while Claude answers.
		let time = 1_000;
		const now = vi.spyOn(Date, 'now').mockImplementation(() => time);
		create.mockImplementation(async () => {
			time += 3_250;
			return { content: [], usage: usage(1000, 200) };
		});
		try {
			await ask(db, 'recipe', params, client);
		} finally {
			now.mockRestore();
		}
		const row = await db.prepare('SELECT duration_ms FROM claude_call').first();
		expect(row).toEqual({ duration_ms: 3_250 });
	});

	it('logs what was written to and read from the cache apart', async () => {
		const { client } = fakeClaude({
			usage: { ...usage(100, 200), cache_creation_input_tokens: 3000, cache_read_input_tokens: 500 }
		});
		await ask(db, 'menu', params, client);
		const { results } = await db
			.prepare('SELECT input_tokens, cache_write_tokens, cache_read_tokens FROM claude_call')
			.all();
		expect(results).toEqual([
			{ input_tokens: 3600, cache_write_tokens: 3000, cache_read_tokens: 500 }
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

describe('a call for a purpose', () => {
	it('uses the model the app is set to for it', async () => {
		env.MENU_MODEL = 'claude-sonnet-5-5';
		env.SHOPPING_MODEL = 'claude-haiku-5-5';
		const { client, create } = fakeClaude();
		const unmodelled = { max_tokens: 100, messages: params.messages };
		await askFor('menu', db, client)(unmodelled);
		await askFor('shopping', db, client)(unmodelled);
		expect(create.mock.calls.map(([sent]) => sent.model)).toEqual([
			'claude-sonnet-5-5',
			'claude-haiku-5-5'
		]);
		expect((await logged()).map((row) => [row.purpose, row.model])).toEqual([
			['menu', 'claude-sonnet-5-5'],
			['shopping', 'claude-haiku-5-5']
		]);
	});

	it('gives the shopping list two minutes before it is given up, and the rest one', async () => {
		const { client, create } = fakeClaude();
		const unmodelled = { max_tokens: 100, messages: params.messages };
		await askFor('shopping', db, client)(unmodelled);
		await askFor('menu', db, client)(unmodelled);
		expect(create.mock.calls.map(([, options]) => options.timeout)).toEqual([120_000, 60_000]);
	});
});

describe('an answer in JSON', () => {
	class Failed extends Error {
		constructor(readonly reason: string) {
			super(reason);
		}
	}
	const answering = (text: string) =>
		vi.fn<Ask>().mockResolvedValue({
			content: [{ type: 'text', text }],
			stop_reason: 'end_turn',
			usage: usage(1, 1)
		} as unknown as Anthropic.Message);
	const reason = (send: Ask, list?: string) =>
		askJson(send, { max_tokens: 1, messages: [] }, (r) => new Failed(r), 'test', list).then(
			() => 'ok',
			(e: Failed) => e.reason
		);

	it('is given parsed', async () => {
		const answer = await askJson(
			answering('{"rows":[1]}'),
			{ max_tokens: 1, messages: [] },
			(r) => new Failed(r),
			'test',
			'rows'
		);
		expect(answer).toEqual({ rows: [1] });
	});

	it('fails when it is not an object, or lacks the list asked for', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await reason(answering('[{"rows":[]}]'))).toBe('failed');
		expect(await reason(answering('{"rows":'))).toBe('failed');
		expect(await reason(answering('{"rows":{}}'), 'rows')).toBe('failed');
		expect(await reason(vi.fn<Ask>().mockRejectedValue(new ClaudeLimitError()))).toBe('limit');
		expect(await reason(vi.fn<Ask>().mockRejectedValue(new Error('down')))).toBe('failed');
	});
});
