import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { weekOf } from './forms';

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
