import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import { saveMenu } from '../../../../test/menus';
import { WEEK } from '../../../../test/fixtures';
import { createPerson } from './household';
import { addShoppingItem } from './shopping';
import { getWeek, listMenus, setWeekEaters, setWeekRow } from './menus';
import { addRecipe, findRecipeByName, getRecipe, setRecipeVote, updateRecipe } from './recipes';

let db: D1Database;
useTestDb((test) => (db = test));

// Lines written by hand have no reason and nothing to swap to, and nobody has voted yet.
const byHand = { reason: null, alternatives: [], passedOn: [], vote: null };
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
				isNew: true,
				...byHand
			},
			{
				weekday: 2,
				meal: 'dinner',
				text: 'Tacos',
				recipeId: expect.any(Number),
				lunchbox: false,
				isNew: true,
				...byHand
			},
			{
				weekday: 6,
				meal: 'lunch',
				text: 'Rester',
				recipeId: null,
				lunchbox: false,
				isNew: false,
				...byHand
			}
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
				isNew: true,
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

describe('a new dish in a week', () => {
	it('is one never on a week before, in a dated or undated old note', async () => {
		await saveMenu(db, {
			weekStart: null,
			source: 'photo',
			items: [{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'dinner' }]
		});
		await setWeekRow(db, '2030-02-25', dinner(1, 'Pannkakor'), []);
		// A week after does not make the dish old.
		await setWeekRow(db, '2030-03-11', dinner(1, 'Shakshuka'), []);
		for (const [weekday, text] of [
			[1, 'Linssoppa'],
			[2, 'Pannkakor'],
			[3, 'Shakshuka']
		] as const)
			await setWeekRow(db, WEEK, dinner(weekday, text), []);

		const rows = (await getWeek(db, WEEK)).rows;
		expect(rows.map((r) => [r.text, r.isNew])).toEqual([
			['Linssoppa', false],
			['Pannkakor', false],
			['Shakshuka', true]
		]);
	});

	it('shows the vote, which the household shares and the latest of which counts', async () => {
		await setWeekRow(db, WEEK, dinner(1, 'Shakshuka'), []);
		const { id } = (await findRecipeByName(db, 'Shakshuka'))!;
		await setRecipeVote(db, id, 'favorit');
		await setRecipeVote(db, id, 'aldrig');
		expect((await getWeek(db, WEEK)).rows[0].vote).toBe('aldrig');
		expect((await getRecipe(db, id))!.vote).toBe('aldrig');
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

	it('are taken once, when the week is made, and never again', async () => {
		const kim = await createPerson(db, { name: 'Kim', requirements: '' });
		const sam = await createPerson(db, { name: 'Sam', requirements: '' });
		await setWeekEaters(db, '2030-02-25', [kim, sam]);
		await addShoppingItem(db, WEEK, 'Kaffe');
		expect((await getWeek(db, WEEK)).eaters.sort()).toEqual([kim, sam].sort());

		await setWeekEaters(db, WEEK, [kim]);
		await addShoppingItem(db, WEEK, 'Te');
		await setWeekRow(db, WEEK, dinner(2, 'Pasta'), [sam]);
		expect((await getWeek(db, WEEK)).eaters).toEqual([kim]);
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
