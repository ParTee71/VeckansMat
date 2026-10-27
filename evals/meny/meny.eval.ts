// Suggests every case's week with the real API and the app's own prompt, grades the answers by
// rules and compares them with the last saved run. See evals/meny/README.md.
import type Anthropic from '@anthropic-ai/sdk';
import { afterAll, it } from 'vitest';
import { nameKey } from '../../src/lib/names';
import { isDish } from '../../src/lib/recipes';
import type { Ask } from '../../src/lib/server/claude/claude';
import { MENU_PROMPT, menuContent, slotName } from '../../src/lib/server/claude/menu-prompt';
import {
	MenuSuggestError,
	suggestMenu,
	type SuggestedRow
} from '../../src/lib/server/menu-suggest';
import { liveClaude, type Effort } from '../live';
import { report, score, type Scored } from '../report';
import { CASES, COLLECTION, RECENT, type Case } from './cases';

const MODEL = process.env.MENU_MODEL ?? 'claude-sonnet-5-5';
// To compare efforts without changing the app.
const EFFORT = process.env.MENU_EFFORT as Effort;
const RESULTS = new URL('results/latest.json', import.meta.url);

interface Result extends Scored {
	seconds: number;
	cacheRead: number;
	answer: string[] | string;
}

const claude = liveClaude(MODEL, EFFORT);
const results: Result[] = [];

const byKey = new Map(COLLECTION.map((dish) => [nameKey(dish.name), dish]));
const tagged = (text: string, tag: string) => byKey.get(nameKey(text))?.tags.includes(tag) ?? false;
const hasWord = (text: string, words: string[]) =>
	words.some((word) => text.toLocaleLowerCase('sv').includes(word));

/** Every dish Claude named in its answer, before the app left any out, or null when unreadable. */
function answeredDishes(message: Anthropic.Message): string[] | null {
	const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
	try {
		const { rows } = JSON.parse(text) as { rows: Choice[] };
		return rows.flatMap((row) => [row.dish, ...row.alternatives.map((alt) => alt.dish)]);
	} catch {
		return null;
	}
}

interface Choice {
	dish: string;
	alternatives: { dish: string }[];
}

/** Each rule passed or failed, by its name. */
function grade(c: Case, rows: SuggestedRow[], answered: string[] | null): Record<string, boolean> {
	const { request } = c;
	const checks: Record<string, boolean> = {};
	// The app leaves these out in code too, so the answer itself is graded.
	if (request.neverSuggest.length) {
		const never = new Set(request.neverSuggest.map(nameKey));
		checks['inget som aldrig ska föreslås'] =
			!!answered && answered.every((dish) => !never.has(nameKey(dish)));
	}
	for (const slot of request.slots) {
		checks[`svar för ${slotName(slot)}`] = rows.some(
			(r) => r.weekday === slot.weekday && r.meal === slot.meal
		);
	}

	const week = [...request.planned, ...rows].filter((r) => isDish(r.text));
	const dinners = week.filter((r) => r.meal === 'dinner');
	const keys = week.map((r) => nameKey(r.text));
	checks['varje rätt en gång'] = new Set(keys).size === keys.length;

	for (const row of rows) {
		const where = slotName(row);
		const choices = [row.text, ...row.alternatives.map((a) => a.text)];
		checks[`två alternativ, ${where}`] = row.alternatives.length === 2;
		checks[`kort skäl, ${where}`] = !!row.reason && row.reason.split(/\s+/).length <= 6;
		if (isDish(row.text)) checks[`inte de två senaste veckorna, ${where}`] = !RECENT.has(row.text);
		checks[`alternativ inte i veckan, ${where}`] = row.alternatives.every(
			(alt) => !keys.includes(nameKey(alt.text))
		);
		// A new dish is only for when the collection has too few that fit, and says it is new.
		checks[`alternativ ur samlingen eller Ny idé, ${where}`] = row.alternatives.every(
			(alt) => !isDish(alt.text) || byKey.has(nameKey(alt.text)) || alt.reason.startsWith('Ny idé')
		);
		if (c.forbidden) {
			const bad = choices.filter(
				(text) => tagged(text, c.forbidden!.tag) || hasWord(text, c.forbidden!.words)
			);
			checks[`inget förbjudet, ${where}`] = bad.length === 0;
		}
		if (!byKey.has(nameKey(row.text)) && isDish(row.text)) {
			checks[`ny rätt märkt Ny idé, ${where}`] = row.reason.startsWith('Ny idé');
		}
	}

	if (request.passedOn) {
		const passed = new Set(request.passedOn.map(nameKey));
		const choices = rows.flatMap((r) => [r.text, ...r.alternatives.map((a) => a.text)]);
		checks['inget som valts bort'] = choices.every((text) => !passed.has(nameKey(text)));
		checks['ur samlingen'] = choices.every((text) => byKey.has(nameKey(text)));
	} else {
		const fresh = rows.filter(
			(r) => r.meal === 'dinner' && isDish(r.text) && !byKey.has(nameKey(r.text))
		);
		checks[`${request.newDishes} nya middagar`] = fresh.length === request.newDishes;
	}
	if (c.vegetarianMonday) {
		const monday = dinners.find((r) => r.weekday === 1);
		checks['vegetariskt på måndag'] =
			!!monday &&
			(byKey.has(nameKey(monday.text))
				? tagged(monday.text, 'vegetariskt')
				: !hasWord(monday.text, ['kött', 'korv', 'kyckling', 'fläsk', 'fisk', 'lax', 'färs']));
	}
	if (c.fishOnce) {
		checks['fisk en gång'] = dinners.filter((r) => tagged(r.text, 'fisk')).length === 1;
	}
	for (const word of c.wished ?? []) {
		checks[`önskat: ${word}`] = week.some((r) => hasWord(r.text, [word]));
	}
	return checks;
}

CASES.forEach((c, i) => {
	it.concurrent(c.id, async () => {
		const { ask: live, spent } = claude();
		let answered: string[] | null = null;
		const ask: Ask = async (params) => {
			const message = await live(params);
			answered = answeredDishes(message);
			return message;
		};
		const started = Date.now();
		let rows: SuggestedRow[] = [];
		let failure = '';
		try {
			rows = await suggestMenu(c.request, ask);
		} catch (e) {
			if (!(e instanceof MenuSuggestError)) throw e;
			failure = e.reason;
		}
		const checks = failure ? { svar: false } : grade(c, rows, answered);
		results[i] = {
			id: c.id,
			...score(checks),
			seconds: Math.round((Date.now() - started) / 1000),
			...spent,
			answer:
				failure ||
				rows.map(
					(r) =>
						`${slotName(r)}: ${r.text} (${r.reason}) | ${r.alternatives.map((a) => a.text).join(' | ')}`
				)
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
			prompt: MENU_PROMPT + menuContent(CASES[0].request).join('\n'),
			results
		},
		(r) => ({ sekunder: r.seconds })
	);
});
