import { error, fail, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { NameTakenError, updateRecipe } from '#lib/server/db/recipes.ts';
import { parseRecipeForm } from '#lib/server/recipe-form.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ params, request }) => {
		const { values, lunchbox, ...parsed } = parseRecipeForm(await request.formData());
		const invalid = (error: string) => fail(400, { error, values, lunchbox });
		if ('error' in parsed) return invalid(parsed.error);
		const id = Number(params.id);
		try {
			if (!(await updateRecipe(env.DB, id, parsed.input))) error(404, 'Rätten finns inte');
		} catch (e) {
			if (e instanceof NameTakenError) return invalid(e.message);
			throw e;
		}
		redirect(303, `/ratter/${id}`);
	}
};
