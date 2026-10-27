// Claude suggests a week's dinners and lunches, and new dishes for a day the household swaps.
// See docs/beslut/0014-veckoforslag.md.
import { answerText, nameKey, stripTags } from '../names';
import { askJson, type Ask } from './claude/claude';
import {
	MENU_PROMPT,
	menuContent,
	menuSchema,
	type MenuRequest,
	type Slot
} from './claude/menu-prompt';
import { getSettings, listPeople } from './db/household';
import {
	getMenuHistory,
	getWeek,
	neverSuggested,
	setWeekWish,
	setWeekRow,
	setWeekRows,
	type Choice,
	type RowInput,
	type Week
} from './db/menus';
import { offerOf } from '../offers';
import { daysAfter, hasLunch, notBefore, swedishToday, WEEK_DAYS } from '../weeks';
import { currentOffers } from './db/offers';

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
	const answer = await askJson(
		ask,
		{
			max_tokens: 16000,
			system: MENU_PROMPT,
			output_config: {
				effort: 'medium',
				format: { type: 'json_schema', schema: menuSchema(!!request.offers?.length) }
			},
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
		'menu',
		'rows'
	);
	const { rows } = answer;

	// What was passed on, is never wanted again, or was eaten too recently is left out even when
	// Claude chooses it.
	const excluded = new Set([
		...[...(request.passedOn ?? []), ...request.neverSuggest].map(nameKey),
		// Named as Claude saw them.
		...request.dishes
			.filter((dish) => notBefore(dish, request))
			.map((dish) => nameKey(stripTags(dish.name)))
	]);
	const suggested: SuggestedRow[] = [];
	// Dinners built on an offer so far: two at most, as the prompt asks.
	let offerDinners = 0;
	for (const slot of request.slots) {
		const row = rows.find((r) => r && sameSlot(r, slot));
		if (!row) continue;
		// The dish first, then its alternatives, each named once and none left out above.
		const seen = new Set(excluded);
		const choices: Choice[] = [];
		for (const c of [row, ...(Array.isArray(row.alternatives) ? row.alternatives : [])]) {
			// A reason marks a line as Claude's, so it is never blank.
			// The offer Claude gave the number of, as it is kept with the dish. Only dinners have one.
			const offer = slot.meal === 'dinner' ? offerOf(request.offers?.[Number(c?.offer) - 1]) : null;
			const choice: Choice = {
				text: answerText(c?.dish, 100),
				reason: answerText(c?.reason, 60) || 'Förslag',
				...(offer && { offer })
			};
			const key = nameKey(choice.text);
			if (!key || seen.has(key)) continue;
			seen.add(key);
			choices.push(choice);
		}
		const [first, ...rest] = choices;
		if (first?.offer && ++offerDinners > 2) delete first.offer;
		if (first) suggested.push({ ...slot, ...first, alternatives: rest.slice(0, RESERVES) });
	}
	if (!suggested.length) throw new MenuSuggestError('failed');
	return suggested;
}

const DINNERS: Slot[] = WEEK_DAYS.map((weekday) => ({ weekday, meal: 'dinner' }));

/** Every day's dinner, lunch at the weekend, and lunch on a weekday that has one. */
function weekSlots(week: Week): Slot[] {
	const lunches = WEEK_DAYS.filter((d) =>
		hasLunch(
			d,
			week.rows.some((r) => r.weekday === d && r.meal === 'lunch')
		)
	).map((weekday): Slot => ({ weekday, meal: 'lunch' }));
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
	const today = swedishToday();
	const [people, settings, history] = await Promise.all([
		listPeople(db),
		getSettings(db),
		getMenuHistory(db, week.weekStart, PAST_WEEKS)
	]);
	// The household shops the week it plans, so the offers that hold now count, and for a couple
	// of days more, so there is time to shop.
	const offers = await currentOffers(db, today, daysAfter(today, 2), settings.memberPrices);
	return {
		weekStart: week.weekStart,
		...history,
		rules: settings.menuRules,
		eaters: people.filter((p) => eaters.includes(p.id)),
		wish,
		offers,
		planned: planned.map(({ weekday, meal, text }) => ({ weekday, meal, text })),
		slots: fill,
		newDishes: settings.newDishesPerWeek,
		repeatWeeks: settings.repeatWeeks,
		favouriteRepeatWeeks: settings.favouriteRepeatWeeks
	};
}

/**
 * Fills the week with Claude's suggestion for those who eat, replacing Claude's earlier one. What
 * was written by hand stays, unless the whole week is asked for. Nothing is written when Claude
 * fails.
 */
export async function suggestWeek(
	db: D1Database,
	weekStart: string,
	wish: string,
	eaters: number[],
	ask: Ask,
	wholeWeek = false
): Promise<void> {
	const week = await getWeek(db, weekStart);
	const byHand = week.rows.filter((r) => r.reason === null);
	const kept = wholeWeek ? [] : byHand;
	const fill = weekSlots(week).filter((slot) => !kept.some((r) => sameSlot(r, slot)));
	if (!fill.length) return;
	const rows = await suggestMenu(await request(db, week, fill, kept, eaters, wish), ask);
	await setWeekWish(db, weekStart, wish, eaters);
	// A day written by hand is replaced only when the whole week is asked for.
	const replaces = (slot: Slot) => byHand.find((r) => sameSlot(r, slot))?.text;
	await setWeekRows(
		db,
		weekStart,
		wholeWeek ? rows.map((row) => ({ ...row, replaces: replaces(row) })) : rows,
		eaters
	);
}

/** A swap: the day as it was, so it can be put back, and the dish it got. */
interface Swap {
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
	// An alternative written on another day since, or voted never again, is passed over.
	const taken = new Set([...others.map((r) => r.text), ...(await neverSuggested(db))].map(nameKey));
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
		{
			...slot,
			text: next.text,
			reason: next.reason,
			offer: next.offer,
			alternatives: rest,
			passedOn
		},
		week.eaters
	);
	const { weekday, meal, text, reason, offer, alternatives } = row;
	return {
		before: { weekday, meal, text, reason, offer, alternatives, passedOn: row.passedOn },
		text: next.text
	};
}
