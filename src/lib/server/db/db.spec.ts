import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearTestDb, createTestDb } from '../../../../test/d1';
import { listMenus, saveMenu } from './menus';
import { findOrCreateRecipe, nameKey } from './recipes';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose());
beforeEach(() => clearTestDb(db));

const countRecipes = async () =>
	(await db.prepare('SELECT count(*) AS n FROM recipe').first<number>('n')) ?? 0;

describe('recipes', () => {
	it('can be just a name', async () => {
		const recipe = await findOrCreateRecipe(db, 'Pannbiff med lök');
		expect(recipe).toEqual({ id: expect.any(Number), name: 'Pannbiff med lök' });
	});

	it('are the same recipe when the name differs only in case and spacing', async () => {
		const first = await findOrCreateRecipe(db, 'Pannbiff med lök');
		const second = await findOrCreateRecipe(db, '  pannbiff   MED Lök ');
		expect(second).toEqual(first);
		expect(await countRecipes()).toBe(1);
	});

	it('normalise Swedish letters', () => {
		expect(nameKey('ÄRTSOPPA  och  Pannkakor')).toBe('ärtsoppa och pannkakor');
	});

	it('need a name', async () => {
		await expect(findOrCreateRecipe(db, '   ')).rejects.toThrow();
	});
});

describe('menus', () => {
	it('link lines to new and existing recipes, and lines without a dish to none', async () => {
		const existing = await findOrCreateRecipe(db, 'Pannbiff med lök');
		await saveMenu(db, {
			weekStart: '2030-01-07',
			source: 'photo',
			items: [
				{ text: 'pannbiff m. lök', recipeName: 'Pannbiff med lök', meal: 'dinner' },
				{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'dinner', weekday: 2 },
				{ text: 'Rester', recipeName: null, meal: 'dinner' },
				{ text: 'Ostfrallor', recipeName: 'Ostfrallor', meal: 'lunch', weekday: 6 }
			]
		});

		const [menu] = await listMenus(db);
		expect(menu).toMatchObject({ weekStart: '2030-01-07', source: 'photo', note: null });
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
		expect(await countRecipes()).toBe(3);
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

	it('start on a Monday, and save nothing when the week is wrong', async () => {
		await expect(
			saveMenu(db, {
				weekStart: '2030-01-08',
				source: 'photo',
				items: [{ text: 'Linssoppa', recipeName: 'Linssoppa', meal: 'dinner' }]
			})
		).rejects.toThrow();
		expect(await listMenus(db)).toEqual([]);
		expect(await countRecipes()).toBe(0);
	});

	it('are one per week', async () => {
		const week = { weekStart: '2030-01-07', source: 'app' as const, items: [] };
		await saveMenu(db, week);
		await expect(saveMenu(db, week)).rejects.toThrow();
	});
});
