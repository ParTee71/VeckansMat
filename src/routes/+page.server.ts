import { error, fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings, listPeople } from '#lib/server/db/household.ts';
import { getWeek, setWeekEaters, setWeekRow } from '#lib/server/db/menus.ts';
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

export const actions: Actions = {
	row: async ({ request }) => {
		const form = await request.formData();
		const weekday = Number(form.get('weekday'));
		const meal = form.get('meal');
		if (!(Number.isInteger(weekday) && weekday >= 1 && weekday <= 7))
			return fail(400, { error: 'Okänd dag' });
		if (meal !== 'dinner' && meal !== 'lunch') return fail(400, { error: 'Okänd måltid' });
		const text = String(form.get('text') ?? '');
		await setWeekRow(env.DB, weekOf(form), { weekday, meal, text }, eatersOf(form));
	},
	eaters: async ({ request }) => {
		const form = await request.formData();
		await setWeekEaters(env.DB, weekOf(form), eatersOf(form));
	}
};
