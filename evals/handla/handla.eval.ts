// Makes every case's shopping list with the real API and the app's own prompt, grades the
// answers by rules and compares them with the last saved run. See evals/handla/README.md.
import Anthropic from '@anthropic-ai/sdk';
import { afterAll, beforeAll, it } from 'vitest';
import { costUsd, type Ask } from '../../src/lib/server/claude/claude';
import { SHOPPING_PROMPT, shoppingContent } from '../../src/lib/server/claude/shopping-prompt';
import { stripTags } from '../../src/lib/names';
import { sectionRank } from '../../src/lib/shopping';
import { askShoppingList, ShoppingListError } from '../../src/lib/server/shopping-make';
import type { NewShoppingItem } from '../../src/lib/server/db/shopping';
import { report, score, type Scored } from '../report';
import { CASES, type Case } from './cases';

const MODEL = process.env.SHOPPING_MODEL ?? 'claude-haiku-5-5';
// To compare efforts without changing the app.
const EFFORT = process.env.SHOPPING_EFFORT as 'low' | 'medium' | 'high' | undefined;
const RESULTS = new URL('results/latest.json', import.meta.url);

interface Result extends Scored {
	seconds: number;
	costUsd: number;
	answer: string[] | string;
}

let claude: Anthropic;
const results: Result[] = [];

beforeAll(() => {
	if (!process.env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY to run the eval.');
	claude = new Anthropic();
});

// "3 st" and "3" are the same amount.
const plain = (amount: string | null) =>
	(amount ?? '').toLocaleLowerCase('sv').replace(/\s|st$/g, '');
const has = (text: string, word: string) => text.toLocaleLowerCase('sv').includes(word);

/** Each rule passed or failed, by its name. */
function grade(
	c: Case,
	items: NewShoppingItem[],
	guesses: Map<string, string[]>
): Record<string, boolean> {
	const checks: Record<string, boolean> = {};
	const about = (word: string) => items.filter((item) => has(item.text, word));

	// Every dish is shopped for, and the list keeps the store's order.
	for (const d of c.dishes) {
		const name = stripTags(d.name);
		checks[`något till ${name}`] = items.some((i) => i.dishes?.split(', ').includes(name));
	}
	const order = items.map((i) => sectionRank(i.section));
	checks['avdelningarnas ordning'] = order.every((n, i) => i === 0 || order[i - 1] <= n);
	checks['text utan mängd'] = items.every((i) => !/^\d/.test(i.text));

	for (const word of c.merged ?? []) checks[`en rad ${word}`] = about(word).length === 1;
	for (const { word, amounts } of c.scaled ?? []) {
		checks[`mängd ${word}`] = about(word).some((i) => amounts.map(plain).includes(plain(i.amount)));
	}
	for (const [word, section] of Object.entries(c.sections ?? {})) {
		checks[`${word} i ${section}`] =
			about(word).length > 0 && about(word).every((i) => i.section === section);
	}
	for (const word of c.absent ?? []) {
		checks[`inget ${word}`] = items.every((i) => !has(`${i.text} ${i.amount}`, word));
	}

	// Guesses for the dishes with just a name, and none for those with lines.
	for (const [dish, needs] of Object.entries(c.guessed ?? {})) {
		const lines = (guesses.get(dish) ?? []).join(' ');
		for (const words of needs) {
			checks[`gissat ${words[0]} i ${dish}`] = words.some((w) => has(lines, w));
		}
	}
	const withLines = c.dishes.filter((d) => d.ingredients.length).map((d) => d.name);
	checks['inga gissningar för rätter med rader'] = withLines.every((d) => !guesses.has(d));
	return checks;
}

for (const c of CASES) {
	it.concurrent(c.id, async () => {
		let cost = 0;
		const ask: Ask = async (params) => {
			const message = await claude.messages.create({
				...params,
				...(EFFORT && { output_config: { ...params.output_config, effort: EFFORT } }),
				model: MODEL
			});
			cost += costUsd(MODEL, message.usage);
			return message;
		};
		const started = Date.now();
		let answer: Awaited<ReturnType<typeof askShoppingList>> | null = null;
		let failure = '';
		try {
			answer = await askShoppingList(c.dishes, ask);
		} catch (e) {
			if (!(e instanceof ShoppingListError)) throw e;
			failure = e.reason;
		}
		const checks = answer ? grade(c, answer.items, answer.guesses) : { svar: false };
		results.push({
			id: c.id,
			...score(checks),
			seconds: Math.round((Date.now() - started) / 1000),
			costUsd: cost,
			answer: answer
				? [
						...[...answer.guesses].map(([dish, lines]) => `Gissat ${dish}: ${lines.join(', ')}`),
						...answer.items.map(
							(i) => `${i.section}: ${i.text} ${i.amount ?? ''} (${i.dishes ?? ''})`
						)
					]
				: failure
		});
	});
}

afterAll(() => {
	results.sort(
		(a, b) => CASES.findIndex((c) => c.id === a.id) - CASES.findIndex((c) => c.id === b.id)
	);
	report(
		RESULTS,
		{
			model: MODEL,
			effort: EFFORT ?? null,
			// The prompt and how the material is written, so a change to either shows.
			prompt: SHOPPING_PROMPT + shoppingContent(CASES[0].dishes),
			costUsd: results.reduce((sum, r) => sum + r.costUsd, 0),
			results
		},
		(r) => ({ sekunder: r.seconds })
	);
});
