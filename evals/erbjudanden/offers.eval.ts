// Sorts the made-up offers with the real API and the app's own prompt, grades the answer by rules
// and compares it with the last saved run. See evals/erbjudanden/README.md.
import { afterAll, expect, it } from 'vitest';
import { OFFER_PROMPT, offerContent } from '../../src/lib/server/claude/offer-prompt';
import { askIngredients } from '../../src/lib/server/offer-ingredients';
import { liveClaude, type Effort } from '../live';
import { report, score, type Scored } from '../report';
import { CASES } from './cases';

const MODEL = process.env.OFFER_MODEL ?? 'claude-haiku-5-5';
// To compare efforts without changing the app.
const EFFORT = process.env.OFFER_EFFORT as Effort;
const RESULTS = new URL('results/latest.json', import.meta.url);

const claude = liveClaude(MODEL, EFFORT);
const offers = CASES.map((c) => ({
	name: c.name,
	brand: c.brand ?? '',
	size: c.size ?? '',
	category: c.category ?? ''
}));
const results: (Scored & { answer: string })[] = [];

// All the offers in one call, as the app asks about a store's week.
it('sorts the offers', async () => {
	const { ask, spent } = claude();
	const answer = await askIngredients(offers, ask);
	CASES.forEach((c, i) => {
		const got = answer.get(i);
		const checks: Record<string, boolean> =
			c.ingredient === null
				? { utelämnad: got === undefined }
				: c.ingredient
					? {
							[`råvara ${c.ingredient.join('/')}`]:
								!!got && c.ingredient.some((w) => got.includes(w))
						}
					: {};
		if (got) checks['utan märke och vikt'] = !/\d|exempel/i.test(got);
		results.push({
			id: c.name,
			...score(Object.keys(checks).length ? checks : { 'vilket som': true }),
			// The one call's cost, shared by the offers.
			costUsd: spent.costUsd / CASES.length,
			answer: got ?? 'utelämnad'
		});
	});
	// Offers of the same thing get the same ingredient.
	const chicken = ['Kycklingfilé', 'Kycklingbröstfilé'].map((name) =>
		answer.get(CASES.findIndex((c) => c.name === name))
	);
	console.log(
		`Samma råvara för samma sak: ${chicken[0] === chicken[1] ? 'ja' : chicken.join(' / ')}`
	);
	const share = results.filter((r) => r.score === 1).length / results.length;
	console.log(
		`Rätt för ${Math.round(share * 100)} % av erbjudandena, $${spent.costUsd.toFixed(4)}`
	);
	expect(share).toBeGreaterThanOrEqual(0.9);
});

afterAll(() => {
	report(
		RESULTS,
		{
			model: MODEL,
			effort: EFFORT ?? null,
			// The prompt and how the material is written, so a change to either shows.
			prompt: OFFER_PROMPT + offerContent(offers.slice(0, 2)),
			results
		},
		(r) => ({ svar: r.answer })
	);
});
