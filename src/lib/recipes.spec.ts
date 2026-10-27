import { describe, expect, it } from 'vitest';
import {
	byName,
	byOften,
	formValues,
	LUNCHBOX_TAG,
	matching,
	nextVote,
	splitSteps
} from './recipes';

const dish = (name: string, timesEaten = 0, lastWeek: string | null = null) => ({
	id: 0,
	name,
	favourite: false,
	timesEaten,
	lastWeek,
	category: null,
	base: null,
	vote: null
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

describe('the steps of a recipe', () => {
	it('are split at blank lines, keeping the line breaks within a step', () => {
		expect(splitSteps('Skala potatisen.\nSkär den i bitar.\n\n  \nKoka den mjuk.\n')).toEqual([
			{ text: 'Skala potatisen.\nSkär den i bitar.', number: 1 },
			{ text: 'Koka den mjuk.', number: 2 }
		]);
	});

	it('are split at line breaks when there are no blank lines', () => {
		expect(splitSteps('Skala pumpan.\nKoka allt mjukt.\n')).toEqual([
			{ text: 'Skala pumpan.', number: 1 },
			{ text: 'Koka allt mjukt.', number: 2 }
		]);
	});

	it('are the numbered lines, without their numbers, also across blank lines', () => {
		expect(splitSteps('1. Skala\n2.Skär\n\n3) Koka')).toEqual([
			{ text: 'Skala', number: 1 },
			{ text: 'Skär', number: 2 },
			{ text: 'Koka', number: 3 }
		]);
	});

	it('have the parts of a recipe as headings without a number', () => {
		expect(splitSteps('Ris\n1. Koka riset.\nGryta\n2. Bryn kycklingen.')).toEqual([
			{ text: 'Ris' },
			{ text: 'Koka riset.', number: 1 },
			{ text: 'Gryta' },
			{ text: 'Bryn kycklingen.', number: 2 }
		]);
	});

	it('are one step when the text is one paragraph', () => {
		expect(splitSteps('Blanda allt och grädda i 20 minuter.')).toEqual([
			{ text: 'Blanda allt och grädda i 20 minuter.', number: 1 }
		]);
	});

	it('are none when there is no text', () => {
		expect(splitSteps('')).toEqual([]);
		expect(splitSteps('  \n ')).toEqual([]);
		expect(splitSteps(null)).toEqual([]);
	});
});

describe('a tap on the vote', () => {
	it('gives thumb up first, then sideways, then down, and round again', () => {
		expect(nextVote(null)).toBe('favorit');
		expect(nextVote('favorit')).toBe('ok');
		expect(nextVote('ok')).toBe('aldrig');
		expect(nextVote('aldrig')).toBe('favorit');
	});
});
