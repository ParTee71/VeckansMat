import { describe, expect, it } from 'vitest';
import { sectionRank } from './shopping';

describe('the order of the list headings', () => {
	it('is the store order, with any other heading after it', () => {
		const headings = [
			'Fiskgratäng',
			'Finns kanske hemma',
			'Mejeri och ägg',
			null,
			'Frukt och grönt'
		];
		expect(headings.toSorted((a, b) => sectionRank(a) - sectionRank(b))).toEqual([
			'Frukt och grönt',
			'Mejeri och ägg',
			'Finns kanske hemma',
			'Fiskgratäng',
			null
		]);
	});
});
