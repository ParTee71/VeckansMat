import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import { dinner, giveIngredients, WEEK } from '../../../../test/fixtures';
import { createPerson } from './household';
import { getWeek, setWeekRow } from './menus';
import { recipeLines } from '../shopping-make';
import { findRecipeByName } from './recipes';
import {
	addShoppingItem,
	deleteShoppingItem,
	getShoppingBasis,
	getShoppingList,
	saveShoppingList,
	setShoppingItemChecked,
	weekDishes
} from './shopping';

let db: D1Database;
useTestDb((test) => (db = test));

/** A made-up week: two dishes with ingredients, one with just a name, and leftovers. */
async function planWeek() {
	await setWeekRow(db, WEEK, dinner(2, 'Linsgryta'), []);
	await setWeekRow(db, WEEK, dinner(1, 'Fiskgratäng'), []);
	await setWeekRow(db, WEEK, dinner(3, 'Rester'), []);
	await setWeekRow(db, WEEK, dinner(4, 'Linsgryta'), []);
	await setWeekRow(db, WEEK, { weekday: 6, meal: 'lunch', text: 'Pannkakor' }, []);
	await giveIngredients(db, 'Fiskgratäng', ['400 g torsk', '2 dl grädde']);
	await giveIngredients(db, 'Linsgryta', ['3 dl röda linser', '1 gul lök']);
}

/** The list as it is made when Claude cannot: the recipes' lines, dish by dish. */
const makeFromRecipes = async (basis = 'basis') =>
	saveShoppingList(db, WEEK, {
		origin: 'recipe',
		items: recipeLines(await weekDishes(db, WEEK)),
		basis
	});

/** The id of a dish on the week, and one of its lines. */
const line = async (dish: string, position: number) => ({
	recipeId: (await findRecipeByName(db, dish))!.id,
	position
});

const tick = async (text: string) => {
	const item = (await getShoppingList(db, WEEK)).find((i) => i.text === text)!;
	await setShoppingItemChecked(db, item.id, true);
};

const shown = (items: Awaited<ReturnType<typeof getShoppingList>>) =>
	items.map(({ text, section, origin, checked }) => ({ text, section, origin, checked }));

describe('the week shopping list', () => {
	it('has the week dishes once each, in the order they are eaten', async () => {
		await planWeek();
		expect(await weekDishes(db, WEEK)).toEqual([
			expect.objectContaining({ name: 'Fiskgratäng', times: 1, lunchbox: false }),
			expect.objectContaining({
				name: 'Linsgryta',
				times: 2,
				ingredients: ['3 dl röda linser', '1 gul lök']
			}),
			expect.objectContaining({ name: 'Pannkakor', times: 1, ingredients: [] })
		]);
	});

	it('is empty until it is made, and then lists each dish lines under the dish', async () => {
		await planWeek();
		expect(await getShoppingList(db, WEEK)).toEqual([]);

		await makeFromRecipes();
		const recipe = { origin: 'recipe', checked: false };
		expect(shown(await getShoppingList(db, WEEK))).toEqual([
			{ text: '400 g torsk', section: 'Fiskgratäng', ...recipe },
			{ text: '2 dl grädde', section: 'Fiskgratäng', ...recipe },
			{ text: '3 dl röda linser', section: 'Linsgryta', ...recipe },
			{ text: '1 gul lök', section: 'Linsgryta', ...recipe }
		]);
	});

	it('is made again with what is written by hand and what is in the basket kept', async () => {
		await planWeek();
		await makeFromRecipes();
		await addShoppingItem(db, WEEK, '  Mjölk ');
		const [cod] = await getShoppingList(db, WEEK);
		await setShoppingItemChecked(db, cod.id, true);

		// The lentil stew is swapped for one without ingredients.
		await setWeekRow(db, WEEK, dinner(2, 'Tacos'), []);
		await setWeekRow(db, WEEK, dinner(4, 'Tacos'), []);
		await makeFromRecipes();

		expect(shown(await getShoppingList(db, WEEK))).toEqual([
			{ text: '400 g torsk', section: 'Fiskgratäng', origin: 'recipe', checked: true },
			{ text: 'Mjölk', section: null, origin: 'hand', checked: false },
			{ text: '2 dl grädde', section: 'Fiskgratäng', origin: 'recipe', checked: false }
		]);
	});

	it('notes what it was made from', async () => {
		expect(await getShoppingBasis(db, WEEK)).toBeNull();
		await planWeek();
		await makeFromRecipes('first');
		expect(await getShoppingBasis(db, WEEK)).toBe('first');
	});

	it('saves Claude list with the basket kept and the guesses in their dishes', async () => {
		await planWeek();
		await makeFromRecipes();
		await tick('400 g torsk');
		await addShoppingItem(db, WEEK, 'Kaffe');
		const pancakes = (await findRecipeByName(db, 'Pannkakor'))!;
		const stew = (await findRecipeByName(db, 'Linsgryta'))!;

		await saveShoppingList(db, WEEK, {
			origin: 'claude',
			items: [
				{ text: 'Mjöl', amount: null, section: 'Finns kanske hemma', lines: [] },
				// The cod in the basket, under another name.
				{
					text: 'Torskfilé',
					amount: '400 g',
					section: 'Kött och fisk',
					lines: [await line('Fiskgratäng', 0)]
				},
				{
					text: 'Ägg',
					amount: '3 st',
					section: 'Mejeri och ägg',
					lines: [await line('Pannkakor', 0)]
				}
			],
			guesses: [
				{ recipeId: pancakes.id, ingredients: ['3 ägg', '6 dl mjölk'] },
				// A dish with ingredients keeps them.
				{ recipeId: stew.id, ingredients: ['Fel'] }
			],
			basis: 'claude'
		});

		const list = await getShoppingList(db, WEEK);
		expect(shown(list)).toEqual([
			{ text: '400 g torsk', section: 'Fiskgratäng', origin: 'recipe', checked: true },
			{ text: 'Kaffe', section: null, origin: 'hand', checked: false },
			{ text: 'Mjöl', section: 'Finns kanske hemma', origin: 'claude', checked: false },
			{ text: 'Ägg', section: 'Mejeri och ägg', origin: 'claude', checked: false }
		]);
		expect(list.find((i) => i.text === 'Ägg')!.dishes).toEqual([
			{ name: 'Pannkakor', guessed: true }
		]);
		expect(list.find((i) => i.text === 'Mjöl')!.dishes).toEqual([]);
		expect(await getShoppingBasis(db, WEEK)).toBe('claude');
		const dishes = await weekDishes(db, WEEK);
		expect(dishes.find((d) => d.name === 'Pannkakor')).toMatchObject({
			servings: null,
			ingredients: ['3 ägg', '6 dl mjölk'],
			ingredientsGuessed: true
		});
		// A guessed dish can still be filled in from a recipe.
		expect(await findRecipeByName(db, 'Pannkakor')).toMatchObject({ onlyName: true });
		expect(dishes.find((d) => d.name === 'Linsgryta')).toMatchObject({
			ingredients: ['3 dl röda linser', '1 gul lök'],
			ingredientsGuessed: false
		});
	});

	it('knows what is in the basket by its lines, however the list is made', async () => {
		await planWeek();
		const claude = async (
			items: { text: string; lines: { recipeId: number; position: number }[] }[]
		) =>
			saveShoppingList(db, WEEK, {
				origin: 'claude',
				items: items.map((item) => ({ ...item, amount: null, section: 'Skafferi' })),
				basis: 'claude'
			});
		await claude([
			{ text: 'Torskfilé', lines: [await line('Fiskgratäng', 0)] },
			{ text: 'Lök', lines: [await line('Linsgryta', 1)] },
			{ text: 'Salt', lines: [] }
		]);
		await tick('Torskfilé');
		await tick('Lök');
		await tick('Salt');

		// Without Claude, the cod's line is in the basket already.
		await makeFromRecipes();
		expect(shown(await getShoppingList(db, WEEK)).filter((i) => !i.checked)).toEqual([
			{ text: '2 dl grädde', section: 'Fiskgratäng', origin: 'recipe', checked: false },
			{ text: '3 dl röda linser', section: 'Linsgryta', origin: 'recipe', checked: false }
		]);

		// With Claude again: an item that also needs a line not in the basket comes back, an item
		// without lines is known by its name, in any case.
		await claude([
			{ text: 'Gul lök', lines: [await line('Linsgryta', 1)] },
			{ text: 'Lök och grädde', lines: [await line('Linsgryta', 1), await line('Fiskgratäng', 1)] },
			{ text: 'salt', lines: [] }
		]);
		expect((await getShoppingList(db, WEEK)).filter((i) => !i.checked).map((i) => i.text)).toEqual([
			'Lök och grädde'
		]);
	});

	it('takes items by hand, which can be ticked off, unticked and removed', async () => {
		await addShoppingItem(db, WEEK, 'Kaffe');
		await addShoppingItem(db, WEEK, '   ');
		const [coffee] = await getShoppingList(db, WEEK);
		expect(shown([coffee])).toEqual([
			{ text: 'Kaffe', section: null, origin: 'hand', checked: false }
		]);

		await setShoppingItemChecked(db, coffee.id, true);
		expect((await getShoppingList(db, WEEK))[0].checked).toBe(true);
		await setShoppingItemChecked(db, coffee.id, false);
		expect((await getShoppingList(db, WEEK))[0].checked).toBe(false);

		await deleteShoppingItem(db, coffee.id);
		expect(await getShoppingList(db, WEEK)).toEqual([]);
	});

	it('keeps who eats when the list starts the week', async () => {
		const kim = await createPerson(db, { name: 'Kim', requirements: '' });
		await setWeekRow(db, '2030-02-25', dinner(1, 'Tacos'), [kim]);
		await addShoppingItem(db, WEEK, 'Kaffe');
		expect((await getWeek(db, WEEK)).eaters).toEqual([kim]);
	});
});
