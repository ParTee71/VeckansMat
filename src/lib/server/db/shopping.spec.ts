import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearTestDb, createTestDb } from '../../../../test/d1';
import { createPerson } from './household';
import { getWeek, setWeekRow } from './menus';
import { findRecipeByName, updateRecipe } from './recipes';
import {
	addShoppingItem,
	deleteShoppingItem,
	getShoppingList,
	makeShoppingList,
	setShoppingItemChecked,
	weekDishes
} from './shopping';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose());
beforeEach(() => clearTestDb(db));

const WEEK = '2030-03-04';
const dinner = (weekday: number, text: string) => ({ weekday, meal: 'dinner' as const, text });

async function giveIngredients(name: string, ingredients: string[]) {
	const { id } = (await findRecipeByName(db, name))!;
	await updateRecipe(db, id, {
		name,
		servings: 4,
		timeMinutes: null,
		instructions: null,
		sourceUrl: null,
		ingredients,
		tags: []
	});
}

/** A made-up week: two dishes with ingredients, one with just a name, and leftovers. */
async function planWeek() {
	await setWeekRow(db, WEEK, dinner(2, 'Linsgryta'), []);
	await setWeekRow(db, WEEK, dinner(1, 'Fiskgratäng'), []);
	await setWeekRow(db, WEEK, dinner(3, 'Rester'), []);
	await setWeekRow(db, WEEK, dinner(4, 'Linsgryta'), []);
	await setWeekRow(db, WEEK, { weekday: 6, meal: 'lunch', text: 'Pannkakor' }, []);
	await giveIngredients('Fiskgratäng', ['400 g torsk', '2 dl grädde']);
	await giveIngredients('Linsgryta', ['3 dl röda linser', '1 gul lök']);
}

const shown = (items: Awaited<ReturnType<typeof getShoppingList>>) =>
	items.map(({ text, section, origin, checked }) => ({ text, section, origin, checked }));

describe('the week shopping list', () => {
	it('has the week dishes once each, in the order they are eaten', async () => {
		await planWeek();
		expect(await weekDishes(db, WEEK)).toEqual([
			expect.objectContaining({ name: 'Fiskgratäng', hasIngredients: true }),
			expect.objectContaining({ name: 'Linsgryta', hasIngredients: true }),
			expect.objectContaining({ name: 'Pannkakor', hasIngredients: false })
		]);
	});

	it('is empty until it is made, and then lists each dish lines under the dish', async () => {
		await planWeek();
		expect(await getShoppingList(db, WEEK)).toEqual([]);

		await makeShoppingList(db, WEEK);
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
		await makeShoppingList(db, WEEK);
		await addShoppingItem(db, WEEK, '  Mjölk ');
		const [cod] = await getShoppingList(db, WEEK);
		await setShoppingItemChecked(db, cod.id, true);

		// The lentil stew is swapped for one without ingredients.
		await setWeekRow(db, WEEK, dinner(2, 'Tacos'), []);
		await setWeekRow(db, WEEK, dinner(4, 'Tacos'), []);
		await makeShoppingList(db, WEEK);

		expect(shown(await getShoppingList(db, WEEK))).toEqual([
			{ text: '400 g torsk', section: 'Fiskgratäng', origin: 'recipe', checked: true },
			{ text: 'Mjölk', section: null, origin: 'hand', checked: false },
			{ text: '2 dl grädde', section: 'Fiskgratäng', origin: 'recipe', checked: false }
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
