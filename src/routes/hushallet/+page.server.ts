import { fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings, listPeople, saveSettings } from '#lib/server/db/household.ts';
import type { Settings } from '#lib/household.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [people, settings] = await Promise.all([listPeople(env.DB), getSettings(env.DB)]);
	return { people, settings };
};

export const actions: Actions = {
	settings: async ({ request }) => {
		const form = await request.formData();
		// Only what the form sent is saved, so a missing field never resets a setting.
		const settings: Partial<Settings> = {};
		if (form.has('menuRules')) settings.menuRules = String(form.get('menuRules'));
		if (form.has('newDishesPerWeek'))
			settings.newDishesPerWeek = Number(form.get('newDishesPerWeek'));
		if (form.has('lunchboxExtraPortions'))
			settings.lunchboxExtraPortions = Number(form.get('lunchboxExtraPortions'));
		try {
			await saveSettings(env.DB, settings);
		} catch (e) {
			if (e instanceof RangeError) return fail(400, { error: 'Det gick inte att spara.' });
			throw e;
		}
	}
};
