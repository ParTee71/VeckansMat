import { describe, expect, it } from 'vitest';
import { linkedIssues, planProblem } from '../.claude/hooks/plan-approved.mjs';

const labels =
	(byIssue: Record<number, string[]>) =>
	async (issue: number): Promise<string[]> =>
		byIssue[issue] ?? [];

describe('linkedIssues', () => {
	it('finds issues linked with closing and reference keywords', () => {
		expect(linkedIssues('Closes #12\nFixes #3, refs #40. Resolved #12')).toEqual([12, 3, 40]);
	});

	it('ignores bare issue numbers', () => {
		expect(linkedIssues('Se #12 och PR #13')).toEqual([]);
	});
});

describe('planProblem', () => {
	it('allows a PR whose issue has an approved plan', async () => {
		expect(await planProblem('Closes #7', labels({ 7: ['plan-godkänd'] }))).toBeNull();
	});

	it('blocks a PR whose issue has no approved plan', async () => {
		expect(await planProblem('Closes #7', labels({ 7: ['bugg'] }))).toContain('#7');
	});

	it('blocks when any linked issue lacks an approved plan', async () => {
		const problem = await planProblem('Closes #7\nCloses #8', labels({ 7: ['plan-godkänd'] }));
		expect(problem).toContain('#8');
		expect(problem).not.toContain('#7');
	});

	it('blocks a PR that links no issue', async () => {
		expect(await planProblem('Liten fix', labels({}))).toContain('Closes #N');
		expect(await planProblem(undefined, labels({}))).toContain('Closes #N');
	});

	it('allows a PR where the owner waived the plan', async () => {
		expect(await planProblem('Utan plan: "kör bara" (ägaren 12:00)', labels({}))).toBeNull();
	});

	it('does not count an empty waiver', async () => {
		expect(await planProblem('Utan plan:', labels({}))).not.toBeNull();
	});
});
