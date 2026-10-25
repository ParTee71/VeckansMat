// Claude suggests a week's dinners and lunches, and new dishes for a day the household swaps.
// See docs/beslut/0014-veckoforslag.md.
import { answerText, nameKey } from '../names';
import { askJson, type Ask } from './claude/claude';
import {
	MENU_PROMPT,
	MENU_SCHEMA,
	menuContent,
	type MenuRequest,
	type Slot
} from './claude/menu-prompt';
import { getSettings, listPeople } from './db/household';
import {
	getMenuHistory,
	getWeek,
	setWeekWish,
	setWeekRow,
	setWeekRows,
	type Choice,
	type RowInput,
	type Week
} from './db/menus';

/** Why there is no suggestion: Claude failed, or the month's cap for Claude is spent. */
export class MenuSuggestError extends Error {
	constructor(readonly reason: 'failed' | 'limit') {
		super(`No suggestion: ${reason}`);
	}
}

/** How many weeks back Claude sees day by day. Older weeks count in how often a dish is eaten. */
const PAST_WEEKS = 8;
/** Reserves kept for each day, so a swap needs no new call until they are used up. */
const RESERVES = 2;

/** A suggested day: the dish, why, and what to swap to. */
export type SuggestedRow = Slot & Choice & { alternatives: Choice[] };

const sameSlot = (a: Slot, b: Slot) => a.weekday === b.weekday && a.meal === b.meal;

/** Asks Claude, and keeps each day it answered right even when another is not. */
export async function suggestMenu(request: MenuRequest, ask: Ask): Promise<SuggestedRow[]> {
	const [material, plan] = menuContent(request);
	const { answer, message } = await askJson(
		ask,
		{
			max_tokens: 16000,
			system: MENU_PROMPT,
			output_config: { effort: 'medium', format: { type: 'json_schema', schema: MENU_SCHEMA } },
			messages: [
				{
					role: 'user',
					content: [
						// The same until a dish or a week changes, so a second call soon after is cheaper.
						{ type: 'text', text: material, cache_control: { type: 'ephemeral' } },
						{ type: 'text', text: plan }
					]
				}
			]
		},
		(reason) => new MenuSuggestError(reason),
		'menu'
	);
	const rows = answer.rows;
	if (!Array.isArray(rows)) {
		console.error('Claude gave no menu answer', message.stop_reason);
		throw new MenuSuggestError('failed');
	}

	const passedOn = new Set((request.passedOn ?? []).map(nameKey));
	const suggested: SuggestedRow[] = [];
	for (const slot of request.slots) {
		const row = rows.find((r) => r && sameSlot(r, slot));
		if (!row) continue;
		// The dish first, then its alternatives, each named once and none passed on before.
		const seen = new Set(passedOn);
		const choices: Choice[] = [];
		for (const c of [row, ...(Array.isArray(row.alternatives) ? row.alternatives : [])]) {
			// A reason marks a line as Claude's, so it is never blank.
			const choice = {
				text: answerText(c?.dish, 100),
				reason: answerText(c?.reason, 60) || 'Förslag'
			};
			const key = nameKey(choice.text);
			if (!key || seen.has(key)) continue;
			seen.add(key);
			choices.push(choice);
		}
		const [first, ...rest] = choices;
		if (first) suggested.push({ ...slot, ...first, alternatives: rest.slice(0, RESERVES) });
	}
	if (!suggested.length) throw new MenuSuggestError('failed');
	return suggested;
}

const DINNERS: Slot[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, meal: 'dinner' }));

/** Every day's dinner, lunch at the weekend, and lunch on a weekday that has one. */
function weekSlots(week: Week): Slot[] {
	const lunches = [1, 2, 3, 4, 5, 6, 7]
		.filter((d) => d >= 6 || week.rows.some((r) => r.weekday === d && r.meal === 'lunch'))
		.map((weekday): Slot => ({ weekday, meal: 'lunch' }));
	return [...DINNERS, ...lunches];
}

async function request(
	db: D1Database,
	week: Week,
	fill: Slot[],
	planned: Week['rows'],
	eaters = week.eaters,
	wish = week.wish ?? ''
): Promise<MenuRequest> {
	const [people, settings, history] = await Promise.all([
		listPeople(db),
		getSettings(db),
		getMenuHistory(db, week.weekStart, PAST_WEEKS)
	]);
	return {
		weekStart: week.weekStart,
		...history,
		rules: settings.menuRules,
		eaters: people.filter((p) => eaters.includes(p.id)),
		wish,
		planned: planned.map(({ weekday, meal, text }) => ({ weekday, meal, text })),
		slots: fill,
		newDishes: settings.newDishesPerWeek
	};
}

/**
 * Fills the week with Claude's suggestion for those who eat. What was written by hand stays, and
 * Claude's earlier suggestion is replaced. Nothing is written when Claude fails.
 */
export async function suggestWeek(
	db: D1Database,
	weekStart: string,
	wish: string,
	eaters: number[],
	ask: Ask
): Promise<void> {
	const week = await getWeek(db, weekStart);
	const byHand = week.rows.filter((r) => r.reason === null);
	const fill = weekSlots(week).filter((slot) => !byHand.some((r) => sameSlot(r, slot)));
	if (!fill.length) return;
	const rows = await suggestMenu(await request(db, week, fill, byHand, eaters, wish), ask);
	await setWeekWish(db, weekStart, wish, eaters);
	await setWeekRows(db, weekStart, rows, eaters);
}

/** A swap: the day as it was, so it can be put back, and the dish it got. */
export interface Swap {
	before: RowInput;
	text: string;
}

/**
 * Swaps the dish Claude chose for a day for the next alternative, or for new ones from Claude
 * when they are used up. Null when the day has no dish from Claude.
 */
export async function swapRow(
	db: D1Database,
	weekStart: string,
	slot: Slot,
	ask: Ask
): Promise<Swap | null> {
	const week = await getWeek(db, weekStart);
	const row = week.rows.find((r) => sameSlot(r, slot));
	if (!row || row.reason === null) return null;
	const others = week.rows.filter((r) => !sameSlot(r, slot));
	const passedOn = [...row.passedOn, row.text];
	// An alternative written on another day since is passed over.
	const taken = new Set(others.map((r) => nameKey(r.text)));
	let choices = row.alternatives.filter((c) => !taken.has(nameKey(c.text)));
	if (!choices.length) {
		const fresh = await request(db, week, [slot], others);
		const [suggested] = await suggestMenu({ ...fresh, passedOn }, ask);
		choices = [suggested, ...suggested.alternatives];
	}
	const [next, ...rest] = choices;
	await setWeekRow(
		db,
		weekStart,
		{ ...slot, text: next.text, reason: next.reason, alternatives: rest, passedOn },
		week.eaters
	);
	const { weekday, meal, text, reason, alternatives } = row;
	return {
		before: { weekday, meal, text, reason, alternatives, passedOn: row.passedOn },
		text: next.text
	};
}
