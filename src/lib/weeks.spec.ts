import { describe, expect, it } from 'vitest';
import { isoWeek, shortWeekName, weekDates, weekName } from './weeks';

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
});
