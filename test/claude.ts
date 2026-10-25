import type Anthropic from '@anthropic-ai/sdk';
import { vi } from 'vitest';
import type { Ask } from '../src/lib/server/claude/claude';

// Claude is never called in the tests: each test says what it answers.

/** Claude's message: text as written, anything else as JSON, and null as no text at all. */
export const message = (answer: unknown, stop_reason: Anthropic.StopReason = 'end_turn') =>
	({
		content:
			answer === null
				? []
				: [{ type: 'text', text: typeof answer === 'string' ? answer : JSON.stringify(answer) }],
		stop_reason,
		usage: { input_tokens: 1, output_tokens: 1 }
	}) as unknown as Anthropic.Message;

/** Claude, answering every call with `answer`. */
export const answering = (answer: unknown) => vi.fn<Ask>().mockResolvedValue(message(answer));

/** Claude, failing every call with `error`. */
export const failing = (error: Error) => vi.fn<Ask>().mockRejectedValue(error);

/** The reason the app gives for a failure, or 'ok' when there was none. */
export const reason = (promise: Promise<unknown>) =>
	promise.then(
		() => 'ok',
		(e: unknown) => (e instanceof Error && 'reason' in e ? String(e.reason) : String(e))
	);
