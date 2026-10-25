import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearTestDb, createTestDb } from '../../../../test/d1';
import { createPerson } from './household';
import { getWeek, listMenus, saveMenu, setWeekEaters, setWeekRow } from './menus';
import { addRecipe, findRecipeByName, getRecipe, updateRecipe } from './recipes';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose());
beforeEach(() => clearTestDb(db));

const WEEK = '2030-03-04';
// Lines written by hand have no reason and nothing to swap to.
const byHand = { reason: null, alternatives: [], passedOn: [] };
const dinner = (weekday: number, text: string) => ({ weekday, meal: 'dinner' as const, text });

describe('a week planned in the app', () => {
	it('is empty and unsaved until something is written', async () => {
		expect(await getWeek(db, WEEK)).toEqual({
			weekStart: WEEK,
			saved: false,
			rows: [],
			eaters: [],
			wish: null
		});
	});

	it('takes a line per day, and a new dish becomes a recipe with just a name', async () => {
		await setWeekRow(db, WEEK, dinner(1, '  Ärtsoppa  '), []);
		await setWeekRow(db, WEEK, { weekday: 6, meal: 'lunch', text: 'Rester' }, []);
		await setWeekRow(db, WEEK, dinner(2, 'Tacos'), []);

		const week = await getWeek(db, WEEK);
		expect(week.saved).toBe(true);
		const soup = await findRecipeByName(db, 'ärtsoppa');
		expect(week.rows).toEqual([
			{
				weekday: 1,
				meal: 'dinner',
				text: 'Ärtsoppa',
				recipeId: soup!.id,
				lunchbox: false,
				...byHand
			},
			{
				weekday: 2,
				meal: 'dinner',
				text: 'Tacos',
				recipeId: expect.any(Number),
				lunchbox: false,
				...byHand
			},
			{ weekday: 6, meal: 'lunch', text: 'Rester', recipeId: null, lunchbox: false, ...byHand }
		]);
		// Lines like "Rester" are not dishes.
		expect(await findRecipeByName(db, 'rester')).toBeNull();
		const [menu] = await listMenus(db);
		expect(menu).toMatchObject({ weekStart: WEEK, source: 'app' });
	});

	it('writes a known dish as it is named, and shows lunch-box dishes', async () => {
		const id = await addRecipe(db, 'Kycklinggryta med curry');
		await updateRecipe(db, id, { ...(await recipeInput(id)), tags: ['matlåda'] });
		await setWeekRow(db, WEEK, dinner(3, 'kycklinggryta  med CURRY'), []);
		expect((await getWeek(db, WEEK)).rows).toEqual([
			{
				weekday: 3,
				meal: 'dinner',
				text: 'Kycklinggryta med curry',
				recipeId: id,
				lunchbox: true,
				...byHand
			}
		]);
	});

	it('replaces a day, and blank text empties it', async () => {
		await setWeekRow(db, WEEK, dinner(4, 'Pannkakor'), []);
		await setWeekRow(db, WEEK, dinner(4, 'Laxpudding'), []);
		expect((await getWeek(db, WEEK)).rows.map((r) => r.text)).toEqual(['Laxpudding']);
		await setWeekRow(db, WEEK, dinner(4, '   '), []);
		expect((await getWeek(db, WEEK)).rows).toEqual([]);
	});

	it('leaves out lines from old notes that have no weekday', async () => {
		await saveMenu(db, {
			weekStart: WEEK,
			source: 'photo',
			items: [{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'dinner' }]
		});
		await setWeekRow(db, WEEK, dinner(1, 'Pizza'), []);
		await setWeekRow(db, WEEK, dinner(1, 'Pannkakor'), []);
		expect((await getWeek(db, WEEK)).rows.map((r) => r.text)).toEqual(['Pannkakor']);
		const [menu] = await listMenus(db);
		expect(menu.items.map((i) => i.text)).toEqual(['Linssoppa', 'Pannkakor']);
	});
});

describe('who eats a week', () => {
	it('are those who ate the latest week before, until chosen', async () => {
		const kim = await createPerson(db, { name: 'Kim', requirements: '' });
		const sam = await createPerson(db, { name: 'Sam', requirements: '' });
		await setWeekEaters(db, '2030-02-18', [kim]);
		await setWeekEaters(db, '2030-02-25', [kim, sam]);
		// A week after, but not before, does not count.
		await setWeekEaters(db, '2030-03-11', [sam]);
		expect((await getWeek(db, WEEK)).eaters.sort()).toEqual([kim, sam].sort());

		// Writing a line saves the week with those it was shown with.
		await setWeekRow(db, WEEK, dinner(1, 'Tacos'), [kim]);
		expect((await getWeek(db, WEEK)).eaters).toEqual([kim]);

		await setWeekEaters(db, WEEK, []);
		expect((await getWeek(db, WEEK)).eaters).toEqual([]);
	});

	it('skip people that have been removed', async () => {
		await setWeekEaters(db, WEEK, [999]);
		expect((await getWeek(db, WEEK)).eaters).toEqual([]);
	});
});

async function recipeInput(id: number) {
	const recipe = (await getRecipe(db, id))!;
	return {
		name: recipe.name,
		servings: recipe.servings,
		timeMinutes: recipe.timeMinutes,
		ingredients: recipe.ingredients,
		instructions: recipe.instructions,
		sourceUrl: recipe.sourceUrl,
		tags: recipe.tags
	};
}
