import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getRecipe } from '#lib/server/db/recipes.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const recipe = await getRecipe(env.DB, Number(params.id));
	if (!recipe) error(404, 'Rätten finns inte');
	return { recipe };
};
