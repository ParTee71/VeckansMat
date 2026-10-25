// Reads every case with the real API and the app's own prompt, grades the answers by rules and
// compares them with the last saved run. See evals/recept/README.md.
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, it } from 'vitest';
import { nameKey } from '../../src/lib/names';
import { costUsd } from '../../src/lib/server/claude/claude';
import { RECIPE_PROMPT } from '../../src/lib/server/claude/recipe-prompt';
import { RecipeReadError, type RecipeDraft } from '../../src/lib/server/recipe-draft';
import { pageText } from '../../src/lib/server/recipe-link';
import { readRecipe, type Ask, type RecipeSource } from '../../src/lib/server/recipe-parse';
import { CASES, type Case } from './cases';

const MODEL = process.env.RECIPE_MODEL ?? 'claude-haiku-5-5';
const RESULTS = new URL('results/latest.json', import.meta.url);

interface Result {
	id: string;
	score: number;
	failed: string[];
	answer: RecipeDraft | string;
}

let claude: Anthropic;
let cost = 0;
const results: Result[] = [];

beforeAll(() => {
	if (!process.env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY to run the eval.');
	claude = new Anthropic();
});

const ask: Ask = async (params) => {
	const message = await claude.messages.create({ ...params, model: MODEL });
	cost += costUsd(MODEL, message.usage);
	return message;
};

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

for (const c of CASES) {
	it(c.id, async () => {
		let answer: RecipeDraft | RecipeReadError['reason'];
		try {
			answer = await readRecipe(source(c), ask);
		} catch (e) {
			if (!(e instanceof RecipeReadError)) throw e;
			answer = e.reason;
		}
		const checks = grade(c, typeof answer === 'string' ? null : answer);
		if (answer === 'failed') checks['svar'] = false;
		const passed = Object.values(checks).filter(Boolean).length;
		results.push({
			id: c.id,
			score: passed / Object.keys(checks).length,
			failed: Object.keys(checks).filter((k) => !checks[k]),
			answer
		});
	});
}

afterAll(() => {
	if (!results.length) return;
	const previous = existsSync(RESULTS)
		? (JSON.parse(readFileSync(RESULTS, 'utf8')) as { results: Result[]; score: number })
		: null;
	const score = results.reduce((sum, r) => sum + r.score, 0) / results.length;
	const percent = (n: number | undefined) => (n === undefined ? '–' : `${Math.round(n * 100)} %`);
	console.table(
		results.map((r) => ({
			fall: r.id,
			förut: percent(previous?.results.find((p) => p.id === r.id)?.score),
			nu: percent(r.score),
			fel: r.failed.join('; ')
		}))
	);
	console.log(
		`Totalt ${percent(score)} (förut ${percent(previous?.score)}), ${MODEL}, $${cost.toFixed(4)}`
	);
	mkdirSync(new URL('.', RESULTS), { recursive: true });
	writeFileSync(
		RESULTS,
		JSON.stringify(
			{
				date: new Date().toISOString(),
				model: MODEL,
				prompt: createHash('sha256').update(RECIPE_PROMPT).digest('hex').slice(0, 12),
				score,
				costUsd: cost,
				results
			},
			null,
			'\t'
		) + '\n'
	);
});
