// What every eval asks Claude with: the real API, the model and effort it is run with, and what
// each case cost.
import Anthropic from '@anthropic-ai/sdk';
import { beforeAll } from 'vitest';
import { costUsd, type Ask } from '../src/lib/server/claude/claude';

/** Effort to compare with the app's, set by an environment variable such as MENU_EFFORT. */
export type Effort = 'low' | 'medium' | 'high' | undefined;

/**
 * Claude with the real API for the eval's cases. Each case asks for its own `ask`, which makes
 * every call with `model`, `effort` and, when given, `thinking`, and its own `spent`, which adds
 * up what they cost and how many of the tokens out went to thinking.
 */
export function liveClaude(
	model: string,
	effort?: Effort,
	thinking?: Anthropic.ThinkingConfigParam
) {
	let claude: Anthropic;
	beforeAll(() => {
		if (!process.env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY to run the eval.');
		claude = new Anthropic();
	});
	return () => {
		const spent = { costUsd: 0, cacheRead: 0, outputTokens: 0, thinkingTokens: 0 };
		const ask: Ask = async (params) => {
			const message = await claude.messages.create({
				...params,
				...(effort && { output_config: { ...params.output_config, effort } }),
				...(thinking && { thinking }),
				model
			});
			spent.costUsd += costUsd(model, message.usage);
			spent.cacheRead += message.usage.cache_read_input_tokens ?? 0;
			spent.outputTokens += message.usage.output_tokens;
			spent.thinkingTokens += message.usage.output_tokens_details?.thinking_tokens ?? 0;
			return message;
		};
		return { ask, spent };
	};
}
