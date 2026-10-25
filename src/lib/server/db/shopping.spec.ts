import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import { dinner, giveIngredients, WEEK } from '../../../../test/fixtures';
import { createPerson } from './household';
import { getWeek, setWeekRow } from './menus';
import { findRecipeByName } from './recipes';
import {
	addShoppingItem,
	deleteShoppingItem,
	getShoppingBasis,
	getShoppingList,
	makeShoppingList,
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

		await makeShoppingList(db, WEEK, 'basis');
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
		await makeShoppingList(db, WEEK, 'basis');
		await addShoppingItem(db, WEEK, '  Mjölk ');
		const [cod] = await getShoppingList(db, WEEK);
		await setShoppingItemChecked(db, cod.id, true);

		// The lentil stew is swapped for one without ingredients.
		await setWeekRow(db, WEEK, dinner(2, 'Tacos'), []);
		await setWeekRow(db, WEEK, dinner(4, 'Tacos'), []);
		await makeShoppingList(db, WEEK, 'basis');

		expect(shown(await getShoppingList(db, WEEK))).toEqual([
			{ text: '400 g torsk', section: 'Fiskgratäng', origin: 'recipe', checked: true },
			{ text: 'Mjölk', section: null, origin: 'hand', checked: false },
			{ text: '2 dl grädde', section: 'Fiskgratäng', origin: 'recipe', checked: false }
		]);
	});

	it('notes what it was made from', async () => {
		expect(await getShoppingBasis(db, WEEK)).toBeNull();
		await planWeek();
		await makeShoppingList(db, WEEK, 'first');
		expect(await getShoppingBasis(db, WEEK)).toBe('first');
	});

	it('saves Claude list with the basket kept and the guesses in their dishes', async () => {
		await planWeek();
		await makeShoppingList(db, WEEK, 'basis');
		const [cod] = await getShoppingList(db, WEEK);
		await setShoppingItemChecked(db, cod.id, true);
		await addShoppingItem(db, WEEK, 'Kaffe');
		const pancakes = (await findRecipeByName(db, 'Pannkakor'))!;
		const stew = (await findRecipeByName(db, 'Linsgryta'))!;

		const item = (text: string, section: string) => ({
			text,
			amount: '1 st',
			section,
			dishes: null
		});
		await saveShoppingList(
			db,
			WEEK,
			[
				item('Mjöl', 'Finns kanske hemma'),
				item('400 G TORSK', 'Kött och fisk'),
				item('Ägg', 'Mejeri och ägg')
			],
			[
				{ recipeId: pancakes.id, ingredients: ['3 ägg', '6 dl mjölk'] },
				// A dish with ingredients keeps them.
				{ recipeId: stew.id, ingredients: ['Fel'] }
			],
			'claude'
		);

		expect(shown(await getShoppingList(db, WEEK))).toEqual([
			{ text: '400 g torsk', section: 'Fiskgratäng', origin: 'recipe', checked: true },
			{ text: 'Kaffe', section: null, origin: 'hand', checked: false },
			{ text: 'Mjöl', section: 'Finns kanske hemma', origin: 'claude', checked: false },
			{ text: 'Ägg', section: 'Mejeri och ägg', origin: 'claude', checked: false }
		]);
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
