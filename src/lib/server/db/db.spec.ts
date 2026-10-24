import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearTestDb, createTestDb } from '../../../../test/d1';
import { listMenus, saveMenu } from './menus';
import { nameKey } from './recipes';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose());
beforeEach(() => clearTestDb(db));

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
