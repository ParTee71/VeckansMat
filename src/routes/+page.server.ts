import { error, fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings, listPeople } from '#lib/server/db/household.ts';
import { askFor } from '#lib/server/claude/claude.ts';
import {
	getWeek,
	setWeekEaters,
	setWeekRow,
	type Choice,
	type Meal
} from '#lib/server/db/menus.ts';
import { MenuSuggestError, offersUntil, suggestWeek, swapRow } from '#lib/server/menu-suggest.ts';
import { sortOffers } from '#lib/server/offer-ingredients.ts';
import { offerChains } from '#lib/server/db/offers.ts';
import { offerOf } from '#lib/offers.ts';
import { listRecipes, setRecipeVote } from '#lib/server/db/recipes.ts';
import { recipeVoteOf, weekOf } from '#lib/server/forms.ts';
import { shownWeek, swedishToday } from '#lib/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

// The weeks Veckan shows: this week and the next. Older weeks are under Veckor.
export const load: PageServerLoad = async ({ url }) => {
	const today = swedishToday();
	const { weekStart, thisWeek, nextWeek } = shownWeek(url.searchParams.get('vecka'), today);
	const settings = getSettings(env.DB);
	const [week, people, recipes, chains] = await Promise.all([
		getWeek(env.DB, weekStart),
		listPeople(env.DB),
		listRecipes(env.DB),
		// The chains whose offers Claude sees when suggesting the week, for the planning card.
		settings.then((s) => offerChains(env.DB, today, offersUntil(today), s.memberPrices))
	]);
	return {
		week,
		people,
		settings: await settings,
		recipes,
		offerChains: chains,
		thisWeek,
		nextWeek,
		today
	};
};

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

/** A value sent back as JSON to undo a swap, or null when it is not JSON. */
function jsonOf(form: FormData, name: string): unknown {
	try {
		return JSON.parse(String(form.get(name) ?? 'null'));
	} catch {
		return null;
	}
}

/** A list sent back to undo a swap, kept to the size Claude's answers are. */
function listOf<T>(form: FormData, name: string, valid: (item: unknown) => item is T): T[] {
	const list = jsonOf(form, name);
	return Array.isArray(list) ? list.filter(valid).slice(0, 20) : [];
}

const isText = (item: unknown): item is string => typeof item === 'string' && item.length <= 100;
const isChoice = (item: unknown): item is Choice =>
	isText((item as Choice)?.text) && isText((item as Choice)?.reason);

/** Claude's failures are shown on the page; the rest are errors. */
function suggestFailed(e: unknown) {
	if (e instanceof MenuSuggestError) return fail(503, { suggestError: e.reason });
	throw e;
}

const askMenu = askFor('menu');

/** What a change answers with, so the page shows it without loading again. */
async function changed(weekStart: string) {
	const [week, recipes] = await Promise.all([getWeek(env.DB, weekStart), listRecipes(env.DB)]);
	return { week, recipes };
}

export const actions: Actions = {
	row: async ({ request }) => {
		const form = await request.formData();
		const text = String(form.get('text') ?? '');
		const weekStart = weekOf(form);
		await setWeekRow(env.DB, weekStart, { ...slotOf(form), text }, eatersOf(form));
		return changed(weekStart);
	},
	vote: async ({ request }) => {
		const form = await request.formData();
		const weekStart = weekOf(form);
		const { recipeId, vote } = recipeVoteOf(form);
		await setRecipeVote(env.DB, recipeId, vote);
		return changed(weekStart);
	},
	eaters: async ({ request }) => {
		const form = await request.formData();
		const weekStart = weekOf(form);
		await setWeekEaters(env.DB, weekStart, eatersOf(form));
		return changed(weekStart);
	},
	suggest: async ({ request }) => {
		const form = await request.formData();
		const wish = String(form.get('wish') ?? '');
		const weekStart = weekOf(form);
		try {
			const wholeWeek = form.get('wholeWeek') === 'true';
			// Offers not yet sorted after a fetch are sorted first, so Claude sees them: one batch at
			// most, so the request keeps within D1's queries. It never throws.
			await sortOffers(env.DB, askFor('offer'), 1);
			await suggestWeek(env.DB, weekStart, wish, eatersOf(form), askMenu, wholeWeek);
			return changed(weekStart);
		} catch (e) {
			return suggestFailed(e);
		}
	},
	swap: async ({ request }) => {
		const form = await request.formData();
		const weekStart = weekOf(form);
		try {
			const swapped = await swapRow(env.DB, weekStart, slotOf(form), askMenu);
			return { ...swapped, ...(await changed(weekStart)) };
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
			offer: offerOf(jsonOf(form, 'offer')),
			alternatives: listOf(form, 'alternatives', isChoice).map(({ text, reason, offer }) => ({
				text,
				reason,
				offer: offerOf(offer)
			})),
			passedOn: listOf(form, 'passedOn', isText)
		};
		const weekStart = weekOf(form);
		await setWeekRow(env.DB, weekStart, row, eatersOf(form));
		return changed(weekStart);
	}
};
