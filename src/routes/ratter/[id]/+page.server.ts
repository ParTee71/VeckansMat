import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { voteOf } from '#lib/recipes.ts';
import { setRecipeVote } from '#lib/server/db/recipes.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	vote: async ({ request, params }) => {
		const vote = voteOf((await request.formData()).get('vote'));
		if (!vote) error(400, 'Okänd röst');
		await setRecipeVote(env.DB, Number(params.id), vote);
		return { vote };
	}
};
