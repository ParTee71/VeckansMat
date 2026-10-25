import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import { DEFAULT_SETTINGS } from '../../household';
import {
	createPerson,
	deletePerson,
	getPerson,
	getSettings,
	listPeople,
	saveSettings,
	updatePerson
} from './household';

let db: D1Database;
useTestDb((test) => (db = test));

describe('people', () => {
	it('are added, changed and removed, in the order they were added', async () => {
		const kim = await createPerson(db, { name: ' Kim ', requirements: ' Äter inte fisk\n' });
		const sam = await createPerson(db, { name: 'Sam', requirements: '' });
		expect(await listPeople(db)).toEqual([
			{ id: kim, name: 'Kim', requirements: 'Äter inte fisk' },
			{ id: sam, name: 'Sam', requirements: '' }
		]);

		expect(await updatePerson(db, sam, { name: 'Sam', requirements: 'Vegetarian' })).toBe(true);
		expect(await getPerson(db, sam)).toEqual({ id: sam, name: 'Sam', requirements: 'Vegetarian' });

		await deletePerson(db, kim);
		expect((await listPeople(db)).map((p) => p.name)).toEqual(['Sam']);
	});

	it('cannot be saved without a name', async () => {
		await expect(createPerson(db, { name: '  ', requirements: '' })).rejects.toThrow();
	});

	it('that do not exist are not changed', async () => {
		expect(await updatePerson(db, 999, { name: 'Noa', requirements: '' })).toBe(false);
		expect(await getPerson(db, 999)).toBeNull();
	});
});

describe('settings', () => {
	it('have defaults until saved', async () => {
		expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
	});

	it('are saved one at a time and read back', async () => {
		await saveSettings(db, { menuRules: ' Fisk en gång i veckan. ' });
		await saveSettings(db, { newDishesPerWeek: 0, lunchboxExtraPortions: 1 });
		await saveSettings(db, { newDishesPerWeek: 3 });
		expect(await getSettings(db)).toEqual({
			menuRules: 'Fisk en gång i veckan.',
			newDishesPerWeek: 3,
			lunchboxExtraPortions: 1
		});
	});

	it('out of range are refused', async () => {
		await expect(saveSettings(db, { newDishesPerWeek: 4 })).rejects.toThrow(RangeError);
		await expect(saveSettings(db, { newDishesPerWeek: 1.5 })).rejects.toThrow(RangeError);
		await expect(saveSettings(db, { lunchboxExtraPortions: 3 })).rejects.toThrow(RangeError);
		expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
	});

	it('stored out of range are read as their default', async () => {
		await db
			.prepare("INSERT INTO setting (key, value) VALUES ('new_dishes_per_week', 'många')")
			.run();
		expect((await getSettings(db)).newDishesPerWeek).toBe(DEFAULT_SETTINGS.newDishesPerWeek);
	});
});
