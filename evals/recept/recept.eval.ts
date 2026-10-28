// Reads every case with the real API and the app's own prompt, grades the answers by rules and
// compares them with the last saved run. See evals/recept/README.md.
import { readFileSync } from 'node:fs';
import { afterAll, it } from 'vitest';
import { nameKey } from '../../src/lib/names';
import { RECIPE_PROMPT } from '../../src/lib/server/claude/recipe-prompt';
import { RecipeReadError, type RecipeDraft } from '../../src/lib/server/recipe-draft';
import { pageText } from '../../src/lib/server/recipe-link';
import { readRecipe, type RecipeSource } from '../../src/lib/server/recipe-parse';
import { liveClaude } from '../live';
import { report, score, type Scored } from '../report';
import { CASES, type Case } from './cases';

const MODEL = process.env.RECIPE_MODEL ?? 'claude-haiku-5-5';
const RESULTS = new URL('results/latest.json', import.meta.url);

interface Result extends Scored {
	answer: RecipeDraft | string;
}

const claude = liveClaude(MODEL);
const results: Result[] = [];

function source(c: Case): RecipeSource {
	if (c.html) return { text: pageText(c.html), sourceUrl: `https://recept.exempel.se/${c.id}` };
	const photos = (c.photos ?? []).map((file) => ({
		type: 'image/jpeg' as const,
		bytes: new Uint8Array(readFileSync(new URL(`photos/${file}`, import.meta.url)))
	}));
	return { text: c.text, photos };
}

// Lines match when they differ only in case, spacing or a full stop at the end.
const line = (text: string) =>
	text
		.toLocaleLowerCase('sv')
		.replace(/½/g, '1/2')
		.replace(/\s+/g, ' ')
		.replace(/[.\s]+$/, '')
		.trim();

/** Each rule passed or failed, by its name. */
function grade(c: Case, draft: RecipeDraft | null): Record<string, boolean> {
	const want = c.expected;
	if (!draft) return { 'ingen rätt hittad': !want.name };
	const got = draft.ingredients.map(line);
	const wanted = want.ingredients.map(line);
	const checks: Record<string, boolean> = {
		namn: want.name
			? nameKey(draft.name).includes(nameKey(want.name)) ||
				(!!draft.name && nameKey(want.name).includes(nameKey(draft.name)))
			: !draft.name,
		portioner: draft.servings === want.servings,
		tid: draft.timeMinutes === want.timeMinutes,
		steg: !!draft.instructions === want.steps > 0
	};
	for (const w of wanted) checks[`rad: ${w}`] = got.includes(w);
	for (const g of got) if (!wanted.includes(g)) checks[`påhittad rad: ${g}`] = false;
	return checks;
}

CASES.forEach((c, i) => {
	it.concurrent(c.id, async () => {
		const { ask, spent } = claude();
		let answer: RecipeDraft | RecipeReadError['reason'];
		try {
			answer = await readRecipe(source(c), ask);
		} catch (e) {
			if (!(e instanceof RecipeReadError)) throw e;
			answer = e.reason;
		}
		const checks = grade(c, typeof answer === 'string' ? null : answer);
		if (answer === 'failed') checks['svar'] = false;
		results[i] = { id: c.id, ...score(checks), costUsd: spent.costUsd, answer };
	});
});

afterAll(() =>
	report(
		RESULTS,
		{ cases: CASES.length, spentUsd: claude.spentUsd() },
		{ model: MODEL, prompt: RECIPE_PROMPT, results }
	)
);
