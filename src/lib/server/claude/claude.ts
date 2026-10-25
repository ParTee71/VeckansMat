// The app's calls to Claude: each one is logged with its cost, and none is made once the
// month's cap is spent. See docs/beslut/0006-claude-i-appen.md.
import Anthropic from '@anthropic-ai/sdk';
import { env } from 'cloudflare:workers';

/** What a call is for, kept with its cost. */
export type Purpose = 'recipe' | 'menu' | 'shopping';

/** Sends a request without its model, which the caller chooses. */
export type Ask = (
	params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>
) => Promise<Anthropic.Message>;

/**
 * Dollars per million tokens. Haiku's price is for prompts up to 100K tokens, which the app's
 * prompts stay well under.
 */
const PRICES: Record<string, { input: number; output: number }> = {
	'claude-haiku-5-5': { input: 0.1, output: 0.5 },
	'claude-sonnet-5-5': { input: 2, output: 10 }
};
// A model missing above is counted at the highest price, so the cap still holds.
const UNKNOWN_PRICE = { input: 10, output: 50 };

/** The month's cap is spent, so no call is made until next month. */
export class ClaudeLimitError extends Error {
	constructor() {
		super('The monthly Claude limit is reached');
	}
}

/** What a call cost. Writing to the cache costs a quarter more than input, reading a tenth. */
export function costUsd(model: string, usage: Anthropic.Usage): number {
	const price = PRICES[model] ?? UNKNOWN_PRICE;
	const input =
		usage.input_tokens +
		(usage.cache_creation_input_tokens ?? 0) * 1.25 +
		(usage.cache_read_input_tokens ?? 0) * 0.1;
	return (input * price.input + usage.output_tokens * price.output) / 1e6;
}

/** What calls have cost since the start of the month, in UTC. */
export async function spentThisMonth(db: D1Database): Promise<number> {
	const row = await db
		.prepare(
			"SELECT coalesce(sum(cost_usd), 0) AS spent FROM claude_call WHERE created_at >= strftime('%Y-%m-01', 'now')"
		)
		.first<{ spent: number }>();
	return row?.spent ?? 0;
}

function client(): Anthropic {
	return new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
		// Only the browser tests set it, to a stand-in for the API.
		baseURL: env.CLAUDE_BASE_URL || undefined,
		timeout: 60_000,
		maxRetries: 1
	});
}

const MODELS = {
	recipe: 'RECIPE_MODEL',
	menu: 'MENU_MODEL',
	shopping: 'SHOPPING_MODEL'
} as const satisfies Record<Purpose, keyof Env>;

/** Asks with the model chosen for the purpose. */
export const askFor =
	(purpose: Purpose): Ask =>
	(params) =>
		ask(env.DB, purpose, { ...params, model: env[MODELS[purpose]] });

/**
 * Asks for an answer in a JSON schema and gives it parsed. A spent cap is thrown as `fail('limit')`,
 * and any other failure, an answer cut short or refused too, is logged and thrown as
 * `fail('failed')`. What the answer holds is for the caller to check.
 */
export async function askJson(
	ask: Ask,
	params: Parameters<Ask>[0],
	fail: (reason: 'failed' | 'limit') => Error,
	what: string
): Promise<{ answer: Record<string, unknown>; message: Anthropic.Message }> {
	let message: Anthropic.Message;
	try {
		message = await ask(params);
	} catch (e) {
		if (e instanceof ClaudeLimitError) throw fail('limit');
		console.error(`Claude could not answer: ${what}`, e);
		throw fail('failed');
	}
	const text = message.content.find((block) => block.type === 'text')?.text;
	let answer: unknown;
	try {
		answer = text === undefined ? null : JSON.parse(text);
	} catch {
		// Cut short or refused; the answer is not the schema's.
	}
	if (typeof answer !== 'object' || answer === null) {
		console.error(`Claude gave no answer: ${what}`, message.stop_reason);
		throw fail('failed');
	}
	return { answer: answer as Record<string, unknown>, message };
}

/**
 * Sends one request and logs what it cost. Two calls at the same moment may both pass the cap
 * check, and a call that times out may still be billed without being logged, so a month can
 * end a little over the cap.
 */
export async function ask(
	db: D1Database,
	purpose: Purpose,
	params: Anthropic.MessageCreateParamsNonStreaming,
	claude: Anthropic = client()
): Promise<Anthropic.Message> {
	// A missing or broken cap stops every call rather than none.
	const limit = Number(env.CLAUDE_MONTHLY_LIMIT_USD);
	if (!((await spentThisMonth(db)) < limit)) throw new ClaudeLimitError();

	const message = await claude.messages.create(params);
	try {
		await db
			.prepare(
				'INSERT INTO claude_call (purpose, model, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?)'
			)
			.bind(
				purpose,
				params.model,
				// Everything read, also from and into the cache, which the cost prices apart.
				message.usage.input_tokens +
					(message.usage.cache_creation_input_tokens ?? 0) +
					(message.usage.cache_read_input_tokens ?? 0),
				message.usage.output_tokens,
				costUsd(params.model, message.usage)
			)
			.run();
	} catch (e) {
		// The answer is paid for, so it is used even when its cost could not be written down.
		console.error('The cost of a Claude call was not logged', e);
	}
	return message;
}
