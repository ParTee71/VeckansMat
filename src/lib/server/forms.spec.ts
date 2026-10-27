import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { recipeVoteOf, weekOf } from './forms';

const form = (weekStart: string) => {
	const data = new FormData();
	data.set('weekStart', weekStart);
	return data;
};

const status = (weekStart: string) => {
	try {
		weekOf(form(weekStart));
		return 'ok';
	} catch (e) {
		return isHttpError(e) ? e.status : String(e);
	}
};

describe('the week a form is about', () => {
	it('is a Monday, and anything else is a bad request', () => {
		expect(status('2026-10-26')).toBe('ok');
		expect(status('2026-10-27')).toBe(400);
		expect(status('2026-13-02')).toBe(400);
		expect(status('')).toBe(400);
	});
});

describe('a vote a form gives', () => {
	const vote = (recipeId: string, value: string) => {
		const data = new FormData();
		data.set('recipeId', recipeId);
		data.set('vote', value);
		try {
			return recipeVoteOf(data);
		} catch (e) {
			return isHttpError(e) ? e.status : String(e);
		}
	};

	it('is a dish and one of the three votes, and anything else is a bad request', () => {
		expect(vote('7', 'aldrig')).toEqual({ recipeId: 7, vote: 'aldrig' });
		expect(vote('7', 'kanske')).toBe(400);
		expect(vote('sju', 'ok')).toBe(400);
	});
});
