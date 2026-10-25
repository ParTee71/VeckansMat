import { error, fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings, listPeople } from '#lib/server/db/household.ts';
import { ask, type Ask } from '#lib/server/claude/claude.ts';
import {
	getWeek,
	setWeekEaters,
	setWeekRow,
	type Choice,
	type Meal
} from '#lib/server/db/menus.ts';
import { MenuSuggestError, suggestWeek, swapRow } from '#lib/server/menu-suggest.ts';
import { listRecipes } from '#lib/server/db/recipes.ts';
import { addWeeks, isWeekStart, mondayOf, swedishToday, weekToPlan } from '#lib/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

// The weeks Veckan shows: this week and the next. Older weeks are under Veckor.
export const load: PageServerLoad = async ({ url }) => {
	const today = swedishToday();
	const thisWeek = mondayOf(today);
	const nextWeek = addWeeks(thisWeek, 1);
	const asked = url.searchParams.get('vecka');
	const weekStart = asked === thisWeek || asked === nextWeek ? asked : weekToPlan(today);
	const [week, people, settings, recipes] = await Promise.all([
		getWeek(env.DB, weekStart),
		listPeople(env.DB),
		getSettings(env.DB),
		listRecipes(env.DB)
	]);
	return { week, people, settings, recipes, thisWeek, nextWeek };
};

function weekOf(form: FormData): string {
	const weekStart = String(form.get('weekStart') ?? '');
	if (!isWeekStart(weekStart)) error(400, 'Okänd vecka');
	return weekStart;
}

const eatersOf = (form: FormData) =>
	form
		.getAll('eaters')
		.map(Number)
		.filter((id) => Number.isInteger(id));

/** The day and meal a form is about. */
function slotOf(form: FormData): { weekday: number; meal: Meal } {
	const weekday = Number(form.get('weekday'));
	const meal = form.get('meal');
	if (!(Number.isInteger(weekday) && weekday >= 1 && weekday <= 7)) error(400, 'Okänd dag');
	if (meal !== 'dinner' && meal !== 'lunch') error(400, 'Okänd måltid');
	return { weekday, meal };
}

/** A list sent back as JSON to undo a swap, kept to the size Claude's answers are. */
function listOf<T>(form: FormData, name: string, valid: (item: unknown) => item is T): T[] {
	try {
		const list: unknown = JSON.parse(String(form.get(name) ?? '[]'));
		return Array.isArray(list) ? list.filter(valid).slice(0, 20) : [];
	} catch {
		return [];
	}
}

const isText = (item: unknown): item is string => typeof item === 'string' && item.length <= 100;
const isChoice = (item: unknown): item is Choice =>
	isText((item as Choice)?.text) && isText((item as Choice)?.reason);

/** Claude's failures are shown on the page; the rest are errors. */
function suggestFailed(e: unknown) {
	if (e instanceof MenuSuggestError) return fail(503, { suggestError: e.reason });
	throw e;
}

const askMenu: Ask = (params) => ask(env.DB, 'menu', { ...params, model: env.MENU_MODEL });

export const actions: Actions = {
	row: async ({ request }) => {
		const form = await request.formData();
		const text = String(form.get('text') ?? '');
		await setWeekRow(env.DB, weekOf(form), { ...slotOf(form), text }, eatersOf(form));
	},
	eaters: async ({ request }) => {
		const form = await request.formData();
		await setWeekEaters(env.DB, weekOf(form), eatersOf(form));
	},
	suggest: async ({ request }) => {
		const form = await request.formData();
		const wish = String(form.get('wish') ?? '');
		try {
			await suggestWeek(env.DB, weekOf(form), wish, eatersOf(form), askMenu);
		} catch (e) {
			return suggestFailed(e);
		}
	},
	swap: async ({ request }) => {
		const form = await request.formData();
		try {
			return (await swapRow(env.DB, weekOf(form), slotOf(form), askMenu)) ?? {};
		} catch (e) {
			return suggestFailed(e);
		}
	},
	// Puts a day back as it was before a swap.
	restore: async ({ request }) => {
		const form = await request.formData();
		const row = {
			...slotOf(form),
			text: String(form.get('text') ?? ''),
			reason: String(form.get('reason') ?? '').slice(0, 100) || null,
			alternatives: listOf(form, 'alternatives', isChoice).map(({ text, reason }) => ({
				text,
				reason
			})),
			passedOn: listOf(form, 'passedOn', isText)
		};
		await setWeekRow(env.DB, weekOf(form), row, eatersOf(form));
	}
};
