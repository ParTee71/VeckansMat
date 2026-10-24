import { fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { nameKey } from '#lib/names.ts';
import { addRecipe, listRecipes } from '#lib/server/db/recipes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ recipes: await listRecipes(env.DB) });

export const actions: Actions = {
	add: async ({ request }) => {
		const name = String((await request.formData()).get('name') ?? '');
		if (!nameKey(name)) return fail(400, { error: 'Skriv namnet på rätten' });
		return { added: { id: await addRecipe(env.DB, name), name: name.trim() } };
	}
};
