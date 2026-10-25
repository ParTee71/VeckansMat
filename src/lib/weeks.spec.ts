import { describe, expect, it } from 'vitest';
import {
	addWeeks,
	dayList,
	isWeekStart,
	isoWeek,
	mondayOf,
	shortWeekName,
	shownWeek,
	swedishToday,
	weekDates,
	weekName,
	weekToPlan
} from './weeks';

describe('weeks', () => {
	it.each([
		['2026-04-27', 18, 2026],
		['2025-12-29', 1, 2026],
		['2027-01-04', 1, 2027],
		['2026-12-28', 53, 2026],
		['2024-04-08', 15, 2024]
	])('%s is week %i of %i', (weekStart, week, year) => {
		expect(isoWeek(weekStart)).toEqual({ week, year });
	});

	it('are named in Swedish', () => {
		expect(weekName('2026-04-27')).toBe('Vecka 18 2026');
		expect(shortWeekName('2026-04-27')).toBe('v. 18 2026');
		expect(weekName(null)).toBe('Utan vecka');
	});

	it('show their dates, with the month once when it is the same', () => {
		expect(weekDates('2026-04-27')).toBe('27 april – 3 maj');
		expect(weekDates('2024-09-02')).toBe('2 – 8 september');
		expect(weekDates('2025-12-29')).toBe('29 december – 4 januari');
	});

	it('name days in a sentence, in week order', () => {
		const dinner = (weekday: number) => ({ weekday, meal: 'dinner' as const });
		expect(dayList([])).toBe('');
		expect(dayList([dinner(2)])).toBe('tisdag');
		expect(dayList([dinner(5), dinner(2)])).toBe('tisdag och fredag');
		expect(dayList([{ weekday: 6, meal: 'lunch' }, dinner(6), dinner(1)])).toBe(
			'måndag, lördag och lunch lördag'
		);
	});
});

describe('the week to plan', () => {
	it('is this week until Tuesday, and next week from Wednesday', () => {
		expect(weekToPlan('2026-10-26')).toBe('2026-10-26');
		expect(weekToPlan('2026-10-27')).toBe('2026-10-26');
		expect(weekToPlan('2026-10-28')).toBe('2026-11-02');
		expect(weekToPlan('2026-11-01')).toBe('2026-11-02');
	});

	it('is shown unless this week or the next is asked for', () => {
		const weeks = { thisWeek: '2026-10-26', nextWeek: '2026-11-02' };
		expect(shownWeek(null, '2026-10-28')).toEqual({ weekStart: '2026-11-02', ...weeks });
		expect(shownWeek('2026-10-26', '2026-10-28')).toEqual({ weekStart: '2026-10-26', ...weeks });
		expect(shownWeek('2026-10-19', '2026-10-27')).toEqual({ weekStart: '2026-10-26', ...weeks });
	});

	it('starts on a Monday, also across a year', () => {
		expect(mondayOf('2027-01-01')).toBe('2026-12-28');
		expect(addWeeks('2026-12-28', 1)).toBe('2027-01-04');
	});

	it('is told from other text', () => {
		expect(isWeekStart('2026-10-26')).toBe(true);
		expect(isWeekStart('2026-10-27')).toBe(false);
		expect(isWeekStart('2026-02-30')).toBe(false);
		expect(isWeekStart('2026-13-02')).toBe(false);
		expect(isWeekStart('vecka 44')).toBe(false);
	});

	it('follows the date in Sweden', () => {
		// 23:30 UTC on a Tuesday is already Wednesday in Sweden.
		expect(swedishToday(new Date('2026-10-27T23:30:00Z'))).toBe('2026-10-28');
	});
});
