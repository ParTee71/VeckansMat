import { fail, redirect } from '@sveltejs/kit';
import { env, waitUntil } from 'cloudflare:workers';
import { nameKey } from '#lib/names.ts';
import { askFor } from '#lib/server/claude/claude.ts';
import { addRecipe, listRecipes } from '#lib/server/db/recipes.ts';
import { sortRecipes } from '#lib/server/recipe-category.ts';
import { recipeUrl } from '#lib/links.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const recipes = await listRecipes(env.DB);
	// Claude sorts the new dishes after the page has answered; the next load shows their sorts.
	if (recipes.some((recipe) => !recipe.category))
		waitUntil(sortRecipes(env.DB, askFor('category')));
	return { recipes };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const name = String((await request.formData()).get('name') ?? '');
		if (!nameKey(name)) return fail(400, { error: 'Skriv namnet på rätten' });
		// A link is a recipe to read, not a dish's name.
		if (recipeUrl(name, true))
			redirect(303, `/ratter/ny?${new URLSearchParams({ url: name.trim() })}`);
		return { added: { id: await addRecipe(env.DB, name), name: name.trim() } };
	}
};
