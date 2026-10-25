// Sorts every case with the real API and the app's own prompt, grades the answers by rules and
// compares them with the last saved run. See evals/sort/README.md.
import { afterAll, expect, it } from 'vitest';
import { CATEGORY_PROMPT, categoryContent } from '../../src/lib/server/claude/category-prompt';
import { askCategories } from '../../src/lib/server/recipe-category';
import { liveClaude, type Effort } from '../live';
import { report, score, type Scored } from '../report';
import { CASES } from './cases';

const MODEL = process.env.CATEGORY_MODEL ?? 'claude-haiku-5-5';
// To compare efforts without changing the app.
const EFFORT = process.env.CATEGORY_EFFORT as Effort;
const RESULTS = new URL('results/latest.json', import.meta.url);

const claude = liveClaude(MODEL, EFFORT);
const dishes = CASES.map((c) => ({ name: c.name, ingredients: c.ingredients ?? [] }));
const results: (Scored & { answer: string })[] = [];

// All the dishes in one call, as the app asks about the old dishes.
it('sorts the dishes', async () => {
	const { ask, spent } = claude();
	const answer = await askCategories(dishes, ask);
	CASES.forEach((c, i) => {
		const got = answer.get(i);
		const bases = [c.base].flat();
		results.push({
			id: c.name,
			...score({
				[`sort ${c.category}`]: got?.category === c.category,
				[`bas ${bases.join('/')}`]: got?.base != null && bases.includes(got.base)
			}),
			// The one call's cost, shared by the dishes.
			costUsd: spent.costUsd / CASES.length,
			answer: got ? `${got.category} ${got.base}` : 'inget svar'
		});
	});
	const share = (rule: string) =>
		results.filter((r) => !r.failed.some((f) => f.startsWith(rule))).length / results.length;
	console.log(
		`Rätt sort ${Math.round(share('sort') * 100)} %, rätt bas ${Math.round(share('bas') * 100)} %`
	);
	expect(share('sort')).toBeGreaterThanOrEqual(0.95);
	expect(share('bas')).toBeGreaterThanOrEqual(0.9);
});

afterAll(() => {
	report(
		RESULTS,
		{
			model: MODEL,
			effort: EFFORT ?? null,
			// The prompt and how the material is written, so a change to either shows.
			prompt: CATEGORY_PROMPT + categoryContent(dishes.slice(0, 2)),
			results
		},
		(r) => ({ svar: r.answer })
	);
});
