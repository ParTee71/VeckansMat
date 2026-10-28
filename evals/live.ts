// What every eval asks Claude with: the real API, the model and effort it is run with, and what
// each case cost.
import Anthropic from '@anthropic-ai/sdk';
import { beforeAll } from 'vitest';
import { costUsd, type Ask } from '../src/lib/server/claude/claude';

/** Effort to compare with the app's, set by an environment variable such as MENU_EFFORT. */
export type Effort = 'low' | 'medium' | 'high' | undefined;

/** What a run may cost before the cases left are stopped, from EVAL_MAX_USD; $1 when unset. */
export function maxUsd(value = process.env.EVAL_MAX_USD) {
	if (!value) return 1;
	const max = Number(value);
	if (!(max >= 0)) throw new Error(`EVAL_MAX_USD ska vara ett belopp i dollar, inte "${value}".`);
	return max;
}

/**
 * What the whole run has spent, shared by its cases. `check` throws once the cap is reached, so a
 * case that has not started yet fails before it asks and is left out of the results; cases already
 * running still finish, so a run can go a little over.
 */
export function budget(max: number) {
	let spentUsd = 0;
	return {
		check() {
			if (spentUsd >= max)
				throw new Error(
					`Taket EVAL_MAX_USD=$${max} är nått ($${spentUsd.toFixed(4)}), fallet kördes inte.`
				);
		},
		add(usd: number) {
			spentUsd += usd;
		},
		spent: () => spentUsd
	};
}

/**
 * Claude with the real API for the eval's cases. Each case asks for its own `ask`, which makes
 * every call with `model`, `effort` and, when given, `thinking`, and its own `spent`, which adds
 * up what they cost and how many of the tokens out went to thinking. A case asks in vain once the
 * whole run has cost EVAL_MAX_USD. `spentUsd` is what the whole run has cost.
 */
export function liveClaude(
	model: string,
	effort?: Effort,
	thinking?: Anthropic.ThinkingConfigParam
) {
	let claude: Anthropic;
	const run = budget(maxUsd());
	beforeAll(() => {
		if (!process.env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY to run the eval.');
		claude = new Anthropic();
	});
	const forCase = () => {
		run.check();
		const spent = { costUsd: 0, cacheRead: 0, outputTokens: 0, thinkingTokens: 0 };
		const ask: Ask = async (params) => {
			const message = await claude.messages.create({
				...params,
				...(effort && { output_config: { ...params.output_config, effort } }),
				...(thinking && { thinking }),
				model
			});
			const cost = costUsd(model, message.usage);
			run.add(cost);
			spent.costUsd += cost;
			spent.cacheRead += message.usage.cache_read_input_tokens ?? 0;
			spent.outputTokens += message.usage.output_tokens;
			spent.thinkingTokens += message.usage.output_tokens_details?.thinking_tokens ?? 0;
			return message;
		};
		return { ask, spent };
	};
	return Object.assign(forCase, { spentUsd: run.spent });
}
