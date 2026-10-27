import { fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings, listPeople, saveSettings } from '#lib/server/db/household.ts';
import type { Settings } from '#lib/household.ts';
import type { Actions, PageServerLoad } from './$types';

const NUMBERS = [
	'newDishesPerWeek',
	'lunchboxExtraPortions',
	'repeatWeeks',
	'favouriteRepeatWeeks'
] as const;

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
		for (const key of NUMBERS) if (form.has(key)) settings[key] = Number(form.get(key));
		try {
			await saveSettings(env.DB, settings);
		} catch (e) {
			if (e instanceof RangeError)
				return fail(400, { error: 'Det gick inte att spara. Ladda om sidan och försök igen.' });
			throw e;
		}
	}
};
