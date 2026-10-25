// The household's settings for every week, with the limits the form keeps to.

export interface Settings {
	/** Free text that Claude reads, such as "Fish once a week". */
	menuRules: string;
	/** How many dishes the household has not eaten before a week may have. */
	newDishesPerWeek: number;
	/** How many portions extra are cooked of a dish good for lunch boxes. */
	lunchboxExtraPortions: number;
}

export const DEFAULT_SETTINGS: Settings = {
	menuRules: '',
	newDishesPerWeek: 1,
	lunchboxExtraPortions: 2
};

export const MAX_NEW_DISHES = 3;
export const LUNCHBOX_EXTRA_CHOICES = [1, 2] as const;

/** Whether a value is one the form offers. */
export function isValidSetting<K extends keyof Settings>(key: K, value: Settings[K]): boolean {
	if (key === 'menuRules') return typeof value === 'string';
	const n = value as number;
	if (key === 'newDishesPerWeek') return Number.isInteger(n) && n >= 0 && n <= MAX_NEW_DISHES;
	return (LUNCHBOX_EXTRA_CHOICES as readonly number[]).includes(n);
}
