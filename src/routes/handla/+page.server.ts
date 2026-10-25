import { error, fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { askFor } from '#lib/server/claude/claude.ts';
import {
	addShoppingItem,
	deleteShoppingItem,
	getShoppingBasis,
	getShoppingList,
	setShoppingItemChecked
} from '#lib/server/db/shopping.ts';
import {
	makeShoppingListWithClaude,
	shoppingPlan,
	ShoppingListError
} from '#lib/server/shopping-make.ts';
import { weekOf } from '#lib/server/forms.ts';
import { shownWeek } from '#lib/weeks.ts';
import type { Actions, PageServerLoad } from './$types';

// The same week as Veckan shows.
export const load: PageServerLoad = async ({ url }) => {
	const { weekStart, thisWeek, nextWeek } = shownWeek(url.searchParams.get('vecka'));
	const [items, plan, basis] = await Promise.all([
		getShoppingList(env.DB, weekStart),
		shoppingPlan(env.DB, weekStart),
		getShoppingBasis(env.DB, weekStart)
	]);
	return {
		weekStart,
		thisWeek,
		nextWeek,
		items,
		dishes: plan.dishes.map(({ id, name, ingredients, ingredientsGuessed }) => ({
			id,
			name,
			hasIngredients: ingredients.length > 0,
			ingredientsGuessed
		})),
		// The dishes, portions or lines have changed since the list was made.
		changed: basis !== null && basis !== plan.basis && items.some((item) => item.origin !== 'hand'),
		basis: plan.basis
	};
};

const askShopping = askFor('shopping');

function idOf(form: FormData): number {
	const id = Number(form.get('id') || NaN);
	if (!Number.isInteger(id)) error(400, 'Okänd vara');
	return id;
}

export const actions: Actions = {
	make: async ({ request }) => {
		try {
			await makeShoppingListWithClaude(env.DB, weekOf(await request.formData()), askShopping);
		} catch (e) {
			// The list is made of the recipes' lines instead, and the page says why.
			if (e instanceof ShoppingListError) return fail(503, { shoppingError: e.reason });
			throw e;
		}
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
