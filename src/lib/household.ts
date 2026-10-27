// The household's settings for every week, with the limits the form keeps to.

export interface Settings {
	/** Free text that Claude reads, such as "Fish once a week". */
	menuRules: string;
	/** How many dishes the household has not eaten before a week may have. */
	newDishesPerWeek: number;
	/** How many portions extra are cooked of a dish good for lunch boxes. */
	lunchboxExtraPortions: number;
	/** How many weeks after it was eaten a dish may be suggested again. */
	repeatWeeks: number;
	/** The same for a favourite. Read as never more than for other dishes. */
	favouriteRepeatWeeks: number;
}

export const DEFAULT_SETTINGS: Settings = {
	menuRules: '',
	newDishesPerWeek: 1,
	lunchboxExtraPortions: 2,
	repeatWeeks: 4,
	favouriteRepeatWeeks: 2
};

export const MAX_NEW_DISHES = 3;
export const LUNCHBOX_EXTRA_CHOICES = [1, 2] as const;
export const MAX_REPEAT_WEEKS = 12;

/** How many weeks a favourite waits: its own setting, but never longer than other dishes. */
export const favouriteWeeks = (settings: Settings) =>
	Math.min(settings.favouriteRepeatWeeks, settings.repeatWeeks);

/** Whether a value is one the form offers. */
export function isValidSetting<K extends keyof Settings>(key: K, value: Settings[K]): boolean {
	if (key === 'menuRules') return typeof value === 'string';
	const n = value as number;
	if (key === 'newDishesPerWeek') return Number.isInteger(n) && n >= 0 && n <= MAX_NEW_DISHES;
	if (key === 'repeatWeeks' || key === 'favouriteRepeatWeeks')
		return Number.isInteger(n) && n >= 1 && n <= MAX_REPEAT_WEEKS;
	return (LUNCHBOX_EXTRA_CHOICES as readonly number[]).includes(n);
}
