import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import {
	addShoppingItem,
	deleteShoppingItem,
	getShoppingList,
	makeShoppingList,
	setShoppingItemChecked,
	weekDishes
} from '#lib/server/db/shopping.ts';
import { weekOf } from '#lib/server/forms.ts';
import { shownWeek } from '#lib/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

// The same week as Veckan shows.
export const load: PageServerLoad = async ({ url }) => {
	const { weekStart, thisWeek, nextWeek } = shownWeek(url.searchParams.get('vecka'));
	const [items, dishes] = await Promise.all([
		getShoppingList(env.DB, weekStart),
		weekDishes(env.DB, weekStart)
	]);
	return { weekStart, thisWeek, nextWeek, items, dishes };
};

function idOf(form: FormData): number {
	const id = Number(form.get('id') || NaN);
	if (!Number.isInteger(id)) error(400, 'Okänd vara');
	return id;
}

export const actions: Actions = {
	make: async ({ request }) => {
		await makeShoppingList(env.DB, weekOf(await request.formData()));
	},
	add: async ({ request }) => {
		const form = await request.formData();
		await addShoppingItem(env.DB, weekOf(form), String(form.get('text') ?? '').slice(0, 200));
	},
	check: async ({ request }) => {
		const form = await request.formData();
		await setShoppingItemChecked(env.DB, idOf(form), form.get('checked') === 'true');
	},
	remove: async ({ request }) => {
		await deleteShoppingItem(env.DB, idOf(await request.formData()));
	}
};
