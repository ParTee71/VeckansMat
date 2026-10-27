import { describe, expect, it } from 'vitest';
import { conflictComment, labelAction, settledPull } from '../.github/scripts/pr-conflicts.mjs';

describe('labelAction', () => {
	it('labels a conflicted PR once', () => {
		expect(labelAction(false, false)).toBe('add');
		expect(labelAction(false, true)).toBeNull();
	});

	it('removes the label once the conflict is resolved', () => {
		expect(labelAction(true, true)).toBe('remove');
		expect(labelAction(true, false)).toBeNull();
	});

	it('leaves the PR alone while mergeability is unknown', () => {
		expect(labelAction(null, true)).toBeNull();
		expect(labelAction(null, false)).toBeNull();
	});
});

describe('settledPull', () => {
	it('asks again until GitHub has computed mergeability', async () => {
		const answers = [{ mergeable: null }, { mergeable: null }, { mergeable: false }];
		let calls = 0;
		const pull = await settledPull(1, async () => answers[calls++], { delayMs: 0 });
		expect(pull.mergeable).toBe(false);
		expect(calls).toBe(3);
	});

	it('gives up after the last attempt', async () => {
		let calls = 0;
		const pull = await settledPull(
			1,
			async () => {
				calls++;
				return { mergeable: null };
			},
			{ attempts: 2, delayMs: 0 }
		);
		expect(pull.mergeable).toBeNull();
		expect(calls).toBe(2);
	});
});

describe('conflictComment', () => {
	it('names the base branch', () => {
		expect(conflictComment('main')).toContain('`main`');
	});
});
