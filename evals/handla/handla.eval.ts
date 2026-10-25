// Makes every case's shopping list with the real API and the app's own prompt, grades the
// answers by rules and compares them with the last saved run. See evals/handla/README.md.
import { afterAll, it } from 'vitest';
import { SHOPPING_PROMPT, shoppingContent } from '../../src/lib/server/claude/shopping-prompt';
import { stripTags } from '../../src/lib/names';
import { sectionRank } from '../../src/lib/shopping';
import {
	askShoppingList,
	ShoppingListError,
	type ClaudeItem
} from '../../src/lib/server/shopping-make';
import { liveClaude, type Effort } from '../live';
import { report, score, type Scored } from '../report';
import { CASES, type Case } from './cases';

const MODEL = process.env.SHOPPING_MODEL ?? 'claude-haiku-5-5';
// To compare efforts without changing the app.
const EFFORT = process.env.SHOPPING_EFFORT as Effort;
const RESULTS = new URL('results/latest.json', import.meta.url);

interface Result extends Scored {
	seconds: number;
	answer: string[] | string;
}

const claude = liveClaude(MODEL, EFFORT);
const results: Result[] = [];

// "3 st" and "3" are the same amount.
const plain = (amount: string | null) =>
	(amount ?? '').toLocaleLowerCase('sv').replace(/\s|st$/g, '');
const has = (text: string, word: string) => text.toLocaleLowerCase('sv').includes(word);

/** Each rule passed or failed, by its name. */
function grade(
	c: Case,
	items: ClaudeItem[],
	guesses: Map<number, string[]>
): Record<string, boolean> {
	const checks: Record<string, boolean> = {};
	const about = (word: string) => items.filter((item) => has(item.text, word));

	// Every line of every dish, given or guessed, is in exactly one item, except a line with
	// something that must stay off the list, and the list keeps the store's order.
	c.dishes.forEach((d, dish) => {
		const lines = guesses.get(dish) ?? d.ingredients;
		const covered = (line: number) =>
			items.filter((i) => i.lines.some(([a, b]) => a === dish && b === line)).length;
		const offList = (text: string) => (c.absent ?? []).some((word) => has(text, word));
		checks[`varje rad i ${stripTags(d.name)} på en vara`] =
			lines.length > 0 && lines.every((text, line) => covered(line) === (offList(text) ? 0 : 1));
	});
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
	const numberOf = (name: string) => c.dishes.findIndex((d) => d.name === name);
	for (const [dish, needs] of Object.entries(c.guessed ?? {})) {
		const lines = (guesses.get(numberOf(dish)) ?? []).join(' ');
		for (const words of needs) {
			checks[`gissat ${words[0]} i ${dish}`] = words.some((w) => has(lines, w));
		}
	}
	checks['inga gissningar för rätter med rader'] = [...guesses.keys()].every(
		(dish) => !c.dishes[dish].ingredients.length
	);
	return checks;
}

CASES.forEach((c, i) => {
	it.concurrent(c.id, async () => {
		const { ask, spent } = claude();
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
		results[i] = {
			id: c.id,
			...score(checks),
			seconds: Math.round((Date.now() - started) / 1000),
			costUsd: spent.costUsd,
			answer: answer
				? [
						...[...answer.guesses].map(
							([dish, lines]) => `Gissat ${c.dishes[dish].name}: ${lines.join(', ')}`
						),
						...answer.items.map(
							(i) =>
								`${i.section}: ${i.text} ${i.amount ?? ''} (${i.lines.map(([d, l]) => `${d + 1}.${l + 1}`).join(', ')})`
						)
					]
				: failure
		};
	});
});

afterAll(() => {
	report(
		RESULTS,
		{
			model: MODEL,
			effort: EFFORT ?? null,
			// The prompt and how the material is written, so a change to either shows.
			prompt: SHOPPING_PROMPT + shoppingContent(CASES[0].dishes),
			results
		},
		(r) => ({ sekunder: r.seconds })
	);
});
