import { describe, expect, it } from 'vitest';
import { byName, byOften, formValues, LUNCHBOX_TAG, matching } from './recipes';

const dish = (name: string, timesEaten = 0, lastWeek: string | null = null) => ({
	id: 0,
	name,
	timesEaten,
	lastWeek,
	category: null,
	base: null
});

describe('finding a dish', () => {
	const dishes = [dish('Fiskgratäng'), dish('Ärtsoppa'), dish('Fisksoppa')];

	it('takes the dishes with what is written in their name, in any case', () => {
		expect(matching(dishes, ' FISK').map((d) => d.name)).toEqual(['Fiskgratäng', 'Fisksoppa']);
		expect(matching(dishes, '')).toBe(dishes);
	});

	it('orders the most eaten first, then the latest eaten, then by name', () => {
		const eaten = [
			dish('Ärtsoppa', 2, '2030-01-07'),
			dish('Fisksoppa', 2, '2030-01-14'),
			dish('Pannkakor', 5),
			dish('Fiskgratäng', 2, '2030-01-14')
		];
		expect(eaten.toSorted(byOften).map((d) => d.name)).toEqual([
			'Pannkakor',
			'Fiskgratäng',
			'Fisksoppa',
			'Ärtsoppa'
		]);
		expect(eaten.toSorted(byName).map((d) => d.name)).toEqual([
			'Fiskgratäng',
			'Fisksoppa',
			'Pannkakor',
			'Ärtsoppa'
		]);
	});
});

it('writes a dish as its form fields, with the lunch-box tag left to its switch', () => {
	expect(
		formValues({
			name: 'Linsgryta',
			servings: 4,
			timeMinutes: null,
			ingredients: ['3 dl linser', '1 lök'],
			instructions: null,
			tags: ['vego', LUNCHBOX_TAG, 'snabb'],
			sourceUrl: null,
			category: 'vego',
			base: null
		})
	).toEqual({
		name: 'Linsgryta',
		servings: '4',
		timeMinutes: '',
		ingredients: '3 dl linser\n1 lök',
		instructions: '',
		tags: 'vego, snabb',
		sourceUrl: '',
		category: 'vego',
		base: ''
	});
});
