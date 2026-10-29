import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings } from '#lib/server/db/household.ts';
import { getRecipe } from '#lib/server/db/recipes.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const [recipe, settings] = await Promise.all([
		getRecipe(env.DB, Number(params.id)),
		getSettings(env.DB)
	]);
	if (!recipe) error(404, 'Rätten finns inte');
	// How soon a favourite may come again is said on its page, also right after the vote, and
	// Laga cooks the extra portions of a dish good for lunch boxes.
	return {
		recipe,
		favouriteWeeks: settings.favouriteRepeatWeeks,
		lunchboxExtra: settings.lunchboxExtraPortions
	};
};
