// How weeks are written in the app. A week is given by its Monday, YYYY-MM-DD.

const MONTHS = [
	'januari',
	'februari',
	'mars',
	'april',
	'maj',
	'juni',
	'juli',
	'augusti',
	'september',
	'oktober',
	'november',
	'december'
];

export const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

const DAY = 24 * 60 * 60 * 1000;

function addDays(weekStart: string, days: number): Date {
	return new Date(Date.parse(weekStart) + days * DAY);
}

/** The ISO week number and the year it belongs to. */
export function isoWeek(weekStart: string): { week: number; year: number } {
	// The Thursday decides the year, and week 1 is the one with the year's first Thursday.
	const thursday = addDays(weekStart, 3);
	const year = thursday.getUTCFullYear();
	const dayOfYear = (thursday.getTime() - Date.UTC(year, 0, 1)) / DAY;
	return { week: Math.floor(dayOfYear / 7) + 1, year };
}

/** "Vecka 18 2026", or "Utan vecka" for a week nobody knows. */
export function weekName(weekStart: string | null): string {
	if (!weekStart) return 'Utan vecka';
	const { week, year } = isoWeek(weekStart);
	return `Vecka ${week} ${year}`;
}

/** "v. 18 2026", for tight places. */
export function shortWeekName(weekStart: string): string {
	const { week, year } = isoWeek(weekStart);
	return `v. ${week} ${year}`;
}

/** "27 april – 3 maj", or "2 – 8 september" within one month. */
export function weekDates(weekStart: string): string {
	const monday = new Date(weekStart);
	const sunday = addDays(weekStart, 6);
	const month = (date: Date) => MONTHS[date.getUTCMonth()];
	const first =
		monday.getUTCMonth() === sunday.getUTCMonth()
			? `${monday.getUTCDate()}`
			: `${monday.getUTCDate()} ${month(monday)}`;
	return `${first} – ${sunday.getUTCDate()} ${month(sunday)}`;
}
