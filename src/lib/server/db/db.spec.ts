import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import { giveIngredients } from '../../../../test/fixtures';
import { saveMenu } from '../../../../test/menus';
import { nameKey } from '../../names';
import { listMenus } from './menus';
import {
	addRecipe,
	createRecipe,
	findRecipeByName,
	getRecipe,
	guessCategoryStatement,
	guessIngredientsStatements,
	listRecipes,
	NameTakenError,
	unsortedRecipes,
	updateRecipe,
	type RecipeInput
} from './recipes';

let db: D1Database;
useTestDb((test) => (db = test));

/** A dish Claude has not sorted yet, and nobody has voted on. */
const unsorted = { category: null, base: null, categoryGuessed: false, vote: null };

const recipes = async () =>
	(await db.prepare('SELECT id, name FROM recipe ORDER BY id').all<{ id: number; name: string }>())
		.results;

const week = (weekStart: string | null, ...names: (string | null)[]) => ({
	weekStart,
	source: 'photo' as const,
	items: names.map((name) => ({
		text: name ?? 'Rester',
		recipeName: name,
		meal: 'dinner' as const
	}))
});

describe('recipes', () => {
	it('can be just a name, and the same name written differently is one recipe', async () => {
		await saveMenu(db, week('2030-01-07', 'Pannbiff med lök'));
		await saveMenu(db, week('2030-01-14', '  pannbiff   MED Lök ', 'Pannbiff med lök'));
		expect(await recipes()).toEqual([{ id: expect.any(Number), name: 'Pannbiff med lök' }]);
	});

	it('normalise Swedish letters', () => {
		expect(nameKey('ÄRTSOPPA  och  Pannkakor')).toBe('ärtsoppa och pannkakor');
	});

	it('take the first spelling of a new dish', async () => {
		await saveMenu(db, week('2030-01-07', 'Pannbiff med lök', 'PANNBIFF MED LÖK'));
		expect(await recipes()).toEqual([{ id: expect.any(Number), name: 'Pannbiff med lök' }]);
	});

	it('are not made from blank names', async () => {
		await saveMenu(db, week('2030-01-07', '', '   '));
		expect(await recipes()).toEqual([]);
		const [menu] = await listMenus(db);
		expect(menu.items.map((item) => item.recipeId)).toEqual([null, null]);
	});
});

describe('menus', () => {
	it('link lines to new and existing recipes, and lines without a dish to none', async () => {
		await saveMenu(db, week('2030-01-07', 'Pannbiff med lök'));
		const [existing] = await recipes();
		await saveMenu(db, {
			weekStart: '2030-01-14',
			source: 'photo',
			items: [
				{ text: 'pannbiff m. lök', recipeName: 'Pannbiff med lök', meal: 'dinner' },
				{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'dinner', weekday: 2 },
				{ text: 'Rester', recipeName: null, meal: 'dinner' },
				{ text: 'Ostfrallor', recipeName: 'Ostfrallor', meal: 'lunch', weekday: 6 }
			]
		});

		const [menu] = await listMenus(db);
		expect(menu).toMatchObject({ weekStart: '2030-01-14', source: 'photo', note: null });
		expect(menu.items).toEqual([
			{
				text: 'pannbiff m. lök',
				meal: 'dinner',
				weekday: null,
				recipeId: existing.id,
				recipeName: 'Pannbiff med lök'
			},
			{
				text: 'Linssoppa',
				meal: 'dinner',
				weekday: 2,
				recipeId: expect.any(Number),
				recipeName: 'Linssoppa'
			},
			{ text: 'Rester', meal: 'dinner', weekday: null, recipeId: null, recipeName: null },
			{
				text: 'Ostfrallor',
				meal: 'lunch',
				weekday: 6,
				recipeId: expect.any(Number),
				recipeName: 'Ostfrallor'
			}
		]);
		expect(await recipes()).toHaveLength(3);
	});

	it('can lack a date, and are listed newest first with undated last', async () => {
		const dish = (name: string) => [{ text: name, recipeName: name, meal: 'dinner' as const }];
		await saveMenu(db, { weekStart: null, source: 'photo', items: dish('Linssoppa') });
		await saveMenu(db, { weekStart: '2030-01-07', source: 'photo', items: dish('Linssoppa') });
		await saveMenu(db, { weekStart: '2030-01-14', source: 'app', items: dish('Ostfrallor') });

		const menus = await listMenus(db);
		expect(menus.map((menu) => menu.weekStart)).toEqual(['2030-01-14', '2030-01-07', null]);
		expect(menus.map((menu) => menu.items[0].recipeName)).toEqual([
			'Ostfrallor',
			'Linssoppa',
			'Linssoppa'
		]);
	});

	it('keep their own lines when several are saved', async () => {
		const first = await saveMenu(db, {
			weekStart: '2030-01-07',
			source: 'photo',
			items: [{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'dinner' }]
		});
		const second = await saveMenu(db, {
			weekStart: '2030-01-14',
			source: 'photo',
			items: [{ text: 'Ostfrallor', recipeName: 'Ostfrallor', meal: 'lunch' }]
		});

		const menus = await listMenus(db);
		expect(menus.find((menu) => menu.id === first)?.items.map((item) => item.text)).toEqual([
			'Linssoppa'
		]);
		expect(menus.find((menu) => menu.id === second)?.items.map((item) => item.text)).toEqual([
			'Ostfrallor'
		]);
	});

	it.each(['2030-01-08', '2030-1-7', 'vecka 2'])(
		'start on a Monday, and save nothing for %s',
		async (weekStart) => {
			await expect(saveMenu(db, week(weekStart, 'Linssoppa'))).rejects.toThrow();
			expect(await listMenus(db)).toEqual([]);
			expect(await recipes()).toEqual([]);
		}
	);

	it('start on a Monday', async () => {
		await expect(saveMenu(db, week('2030-01-07', 'Linssoppa'))).resolves.toEqual(
			expect.any(Number)
		);
	});

	it('are one per week', async () => {
		const week = { weekStart: '2030-01-07', source: 'app' as const, items: [] };
		await saveMenu(db, week);
		await expect(saveMenu(db, week)).rejects.toThrow();
	});
});

describe('the recipe list', () => {
	it('counts how often a dish was eaten and when it was last', async () => {
		await saveMenu(db, week('2030-01-07', 'Linssoppa', 'Ostfrallor'));
		await saveMenu(db, week('2030-01-14', 'Linssoppa'));
		await saveMenu(db, week(null, 'Linssoppa'));
		await addRecipe(db, 'Kålpudding');

		const list = await listRecipes(db);
		expect(list.sort((a, b) => a.name.localeCompare(b.name, 'sv'))).toEqual([
			{
				id: expect.any(Number),
				name: 'Kålpudding',
				timesEaten: 0,
				lastWeek: null,
				category: null,
				base: null,
				vote: null
			},
			{
				id: expect.any(Number),
				name: 'Linssoppa',
				timesEaten: 3,
				lastWeek: '2030-01-14',
				category: null,
				base: null,
				vote: null
			},
			{
				id: expect.any(Number),
				name: 'Ostfrallor',
				timesEaten: 1,
				lastWeek: '2030-01-07',
				category: null,
				base: null,
				vote: null
			}
		]);
	});
});

describe('adding a recipe', () => {
	it('saves just the name', async () => {
		const id = await addRecipe(db, '  Kålpudding ');
		expect(await getRecipe(db, id)).toEqual({
			id,
			name: 'Kålpudding',
			servings: null,
			timeMinutes: null,
			instructions: null,
			sourceUrl: null,
			ingredients: [],
			ingredientsGuessed: false,
			tags: [],
			...unsorted,
			weeks: []
		});
	});

	it('finds the recipe that already has the name', async () => {
		const id = await addRecipe(db, 'Kålpudding');
		expect(await addRecipe(db, 'KÅLPUDDING')).toBe(id);
		expect(await recipes()).toHaveLength(1);
	});

	it('needs a name', async () => {
		await expect(addRecipe(db, '  ')).rejects.toThrow();
		expect(await recipes()).toEqual([]);
	});
});

const full: RecipeInput = {
	name: 'Fiskgratäng',
	servings: 4,
	timeMinutes: 45,
	instructions: 'Koka potatisen.\nGratinera.',
	sourceUrl: 'https://recept.exempel.se/fisk',
	ingredients: ['600 g torskfilé', '2 dl grädde'],
	tags: ['fisk', 'vardag']
};

describe('a recipe', () => {
	it('is unknown when no recipe has the id', async () => {
		expect(await getRecipe(db, 999)).toBeNull();
	});

	it('lists the weeks it was eaten, newest first and undated last', async () => {
		await saveMenu(db, week(null, 'Linssoppa'));
		await saveMenu(db, week('2030-01-07', 'Linssoppa'));
		await saveMenu(db, {
			weekStart: '2030-01-14',
			source: 'photo',
			items: [{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'lunch' }]
		});
		const [{ id }] = await recipes();
		const recipe = await getRecipe(db, id);
		expect(recipe?.weeks.map(({ weekStart, meal }) => ({ weekStart, meal }))).toEqual([
			{ weekStart: '2030-01-14', meal: 'lunch' },
			{ weekStart: '2030-01-07', meal: 'dinner' },
			{ weekStart: null, meal: 'dinner' }
		]);
	});

	it('can be filled in, and filled in again', async () => {
		const id = await addRecipe(db, 'fiskgratäng');
		await updateRecipe(db, id, full);
		expect(await getRecipe(db, id)).toEqual({
			id,
			...full,
			...unsorted,
			ingredientsGuessed: false,
			weeks: []
		});

		const less = { ...full, ingredients: ['1 kg potatis'], tags: [], servings: null };
		await updateRecipe(db, id, less);
		expect(await getRecipe(db, id)).toEqual({
			id,
			...less,
			...unsorted,
			ingredientsGuessed: false,
			weeks: []
		});
	});

	it('cannot take the name of another recipe, and is then left as it was', async () => {
		await addRecipe(db, 'Fiskgratäng');
		const id = await addRecipe(db, 'Linssoppa');
		await expect(updateRecipe(db, id, { ...full, name: ' FISKGRATÄNG' })).rejects.toThrow(
			NameTakenError
		);
		expect((await getRecipe(db, id))?.name).toBe('Linssoppa');
	});

	it('is not made up when there is none with the id', async () => {
		expect(await updateRecipe(db, 99, full)).toBe(false);
		expect(await getRecipe(db, 99)).toBeNull();
	});

	it('can change how its own name is written', async () => {
		const id = await addRecipe(db, 'fiskgratäng');
		await updateRecipe(db, id, full);
		expect((await getRecipe(db, id))?.name).toBe('Fiskgratäng');
	});

	it('can be added whole', async () => {
		const id = await createRecipe(db, { ...full, name: ' Fiskgratäng ' });
		expect(await getRecipe(db, id)).toEqual({
			id,
			...full,
			...unsorted,
			ingredientsGuessed: false,
			weeks: []
		});
	});

	it('is not added whole under a name that is taken, and the other is left as it was', async () => {
		const id = await addRecipe(db, 'Fiskgratäng');
		await expect(createRecipe(db, { ...full, name: 'FISKGRATÄNG' })).rejects.toThrow(
			NameTakenError
		);
		expect(await recipes()).toEqual([{ id, name: 'Fiskgratäng' }]);
		expect((await getRecipe(db, id))?.ingredients).toEqual([]);
	});
});

describe('the sort and base of a recipe', () => {
	const sortOf = async (id: number) => {
		const { category, base, categoryGuessed } = (await getRecipe(db, id))!;
		return { category, base, categoryGuessed };
	};

	it('are guessed for dishes without a sort, oldest first, with their lines', async () => {
		const fish = await createRecipe(db, full);
		const soup = await addRecipe(db, 'Linssoppa');
		await addRecipe(db, 'Tacos');
		await db.batch([guessCategoryStatement(db, soup, 'soppa', 'annat')]);
		expect(await sortOf(soup)).toEqual({ category: 'soppa', base: 'annat', categoryGuessed: true });
		expect(await unsortedRecipes(db, 1)).toEqual([
			{ id: fish, name: 'Fiskgratäng', ingredients: ['600 g torskfilé', '2 dl grädde'] }
		]);
		expect((await unsortedRecipes(db, 10)).map((r) => r.name)).toEqual(['Fiskgratäng', 'Tacos']);
	});

	it('chosen by the household are never replaced by a guess', async () => {
		const id = await createRecipe(db, { ...full, category: 'fisk', base: 'potatis' });
		await db.batch([guessCategoryStatement(db, id, 'ovrigt', 'annat')]);
		expect(await sortOf(id)).toEqual({ category: 'fisk', base: 'potatis', categoryGuessed: false });
	});

	it('keep a base the household chose when the sort is guessed', async () => {
		const id = await createRecipe(db, { ...full, base: 'ris' });
		await db.batch([guessCategoryStatement(db, id, 'fisk', 'potatis')]);
		expect(await sortOf(id)).toEqual({ category: 'fisk', base: 'ris', categoryGuessed: true });
	});

	it('stay a guess when saved as guessed, and are chosen once another is picked', async () => {
		const id = await addRecipe(db, 'Fiskgratäng');
		await db.batch([guessCategoryStatement(db, id, 'fisk', 'potatis')]);
		await updateRecipe(db, id, { ...full, category: 'fisk', base: 'potatis' });
		expect(await sortOf(id)).toEqual({ category: 'fisk', base: 'potatis', categoryGuessed: true });
		await updateRecipe(db, id, { ...full, category: 'fisk', base: 'ris' });
		expect(await sortOf(id)).toEqual({ category: 'fisk', base: 'ris', categoryGuessed: false });
	});

	it('are kept when a form leaves them out', async () => {
		const id = await createRecipe(db, { ...full, category: 'fisk', base: 'potatis' });
		await updateRecipe(db, id, full);
		expect(await sortOf(id)).toEqual({ category: 'fisk', base: 'potatis', categoryGuessed: false });
	});

	it('are shown in the recipe list', async () => {
		await createRecipe(db, { ...full, category: 'fisk', base: 'potatis' });
		expect(await listRecipes(db)).toMatchObject([{ category: 'fisk', base: 'potatis' }]);
	});
});

describe('finding a recipe by name', () => {
	it('tells whether it has only a name and how often it was eaten', async () => {
		await saveMenu(db, week('2030-01-07', 'Linssoppa'));
		await saveMenu(db, week('2030-01-14', 'Linssoppa'));
		expect(await findRecipeByName(db, ' LINSSOPPA')).toEqual({
			id: expect.any(Number),
			name: 'Linssoppa',
			onlyName: true,
			timesEaten: 2
		});
	});

	it('does not count a recipe with ingredients or steps as only a name', async () => {
		const withIngredients = await addRecipe(db, 'Fiskgratäng');
		await updateRecipe(db, withIngredients, { ...full, instructions: null });
		const withSteps = await addRecipe(db, 'Linssoppa');
		await updateRecipe(db, withSteps, { ...full, name: 'Linssoppa', ingredients: [] });
		expect((await findRecipeByName(db, 'fiskgratäng'))?.onlyName).toBe(false);
		expect((await findRecipeByName(db, 'linssoppa'))?.onlyName).toBe(false);
	});

	it('is null when there is none', async () => {
		expect(await findRecipeByName(db, 'Ärtsoppa')).toBeNull();
	});
});

describe('migration 0010', () => {
	const migration = readFileSync('migrations/0010_guessed_line_numbers.sql', 'utf8');

	it('takes the line numbers out of guessed lines, and only where they fit the line', async () => {
		const guessed = await addRecipe(db, 'Pannkakor');
		await db.batch(
			guessIngredientsStatements(db, guessed, ['3.1 3 ägg', '1.5 dl mjölk', '3.3 2,5 dl vetemjöl'])
		);
		await addRecipe(db, 'Fiskgratäng');
		await giveIngredients(db, 'Fiskgratäng', ['1.1 kg torsk', '2 dl grädde']);
		await db.exec(migration.replace(/--.*$/gm, '').replace(/\s+/g, ' '));

		expect((await getRecipe(db, guessed))!.ingredients).toEqual([
			'3 ägg',
			'1.5 dl mjölk',
			'2,5 dl vetemjöl'
		]);
		const fish = (await findRecipeByName(db, 'Fiskgratäng'))!;
		expect((await getRecipe(db, fish.id))!.ingredients).toEqual(['1.1 kg torsk', '2 dl grädde']);
	});
});
