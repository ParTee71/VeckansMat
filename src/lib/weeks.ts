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

/** The ISO weekdays, 1 = Monday. */
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Lunch is planned on Saturday and Sunday, and on a weekday that already has one. */
export const hasLunch = (weekday: number, hasOne: boolean) => weekday >= 6 || hasOne;

export const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export const WEEKDAY_NAMES = [
	'måndag',
	'tisdag',
	'onsdag',
	'torsdag',
	'fredag',
	'lördag',
	'söndag'
];

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

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Today's date in Sweden, YYYY-MM-DD, whatever time zone the server runs in. */
export function swedishToday(now = new Date()): string {
	return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
}

/** The Monday of the week a date is in. */
export function mondayOf(date: string): string {
	const weekday = (new Date(date).getUTCDay() + 6) % 7;
	return iso(addDays(date, -weekday));
}

export function addWeeks(weekStart: string, weeks: number): string {
	return iso(addDays(weekStart, weeks * 7));
}

/** Whether the text is a Monday written YYYY-MM-DD. */
export function isWeekStart(text: string): boolean {
	return (
		/^\d{4}-\d{2}-\d{2}$/.test(text) &&
		// A month or day out of range is no date at all, which iso cannot write.
		!Number.isNaN(Date.parse(text)) &&
		iso(new Date(text)) === text &&
		mondayOf(text) === text
	);
}

/** The week to plan: this week, and next week from Wednesday on. */
export function weekToPlan(today: string): string {
	const thisWeek = mondayOf(today);
	return today >= iso(addDays(thisWeek, 2)) ? addWeeks(thisWeek, 1) : thisWeek;
}

/** The week a view shows: the one asked for if it is this week or the next, else the one to plan. */
export function shownWeek(
	asked: string | null,
	today = swedishToday()
): { weekStart: string; thisWeek: string; nextWeek: string } {
	const thisWeek = mondayOf(today);
	const nextWeek = addWeeks(thisWeek, 1);
	const weekStart = asked === thisWeek || asked === nextWeek ? asked : weekToPlan(today);
	return { weekStart, thisWeek, nextWeek };
}
