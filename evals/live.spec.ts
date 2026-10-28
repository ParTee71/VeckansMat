import { describe, expect, it } from 'vitest';
import { budget, maxUsd } from './live';

describe('maxUsd', () => {
	it('is $1 unless EVAL_MAX_USD says otherwise', () => {
		expect(maxUsd(undefined)).toBe(1);
		expect(maxUsd('')).toBe(1);
		expect(maxUsd('0.05')).toBe(0.05);
	});

	it('refuses a cap that is not an amount, so a typo never turns it off', () => {
		expect(() => maxUsd('abc')).toThrow('EVAL_MAX_USD');
		expect(() => maxUsd('-1')).toThrow('EVAL_MAX_USD');
	});
});

describe('budget', () => {
	it('lets cases start until the whole run has cost the cap', () => {
		const run = budget(0.05);
		run.check();
		run.add(0.03);
		run.check();
		run.add(0.03);
		expect(() => run.check()).toThrow('EVAL_MAX_USD=$0.05 är nått ($0.0600)');
	});

	it('adds up cases that run at the same time', async () => {
		const run = budget(0.1);
		// Five cases start before any has an answer, as with it.concurrent.
		const cases = Array.from({ length: 5 }, () => {
			run.check();
			return Promise.resolve().then(() => run.add(0.04));
		});
		await Promise.all(cases);
		expect(() => run.check()).toThrow('är nått ($0.2000)');
	});
});
