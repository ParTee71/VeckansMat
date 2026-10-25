import { error, fail, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { createPerson, deletePerson, getPerson, updatePerson } from '#lib/server/db/household.ts';
import type { Actions, PageServerLoad } from './$types';

// "ny" adds a person; a number opens one.
const NEW = 'ny';

export const load: PageServerLoad = async ({ params }) => {
	if (params.id === NEW) return { person: null };
	const person = await getPerson(env.DB, Number(params.id));
	if (!person) error(404, 'Personen finns inte');
	return { person };
};

export const actions: Actions = {
	save: async ({ params, request }) => {
		const form = await request.formData();
		const person = {
			name: String(form.get('name') ?? ''),
			requirements: String(form.get('requirements') ?? '')
		};
		if (!person.name.trim()) return fail(400, { error: 'Skriv ett namn.', values: person });
		if (params.id === NEW) await createPerson(env.DB, person);
		else if (!(await updatePerson(env.DB, Number(params.id), person)))
			error(404, 'Personen finns inte');
		redirect(303, '/hushallet');
	},
	delete: async ({ params }) => {
		await deletePerson(env.DB, Number(params.id));
		redirect(303, '/hushallet');
	}
};
