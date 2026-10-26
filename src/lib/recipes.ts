import { nameKey, plural } from './names';
import type { Meal } from './server/db/menus';
import type { RecipeSummary } from './server/db/recipes';

/** The tag on a dish that is good for lunch boxes, so a little extra is cooked. */
export const LUNCHBOX_TAG = 'matlåda';

export const MEAL_LABELS: Record<Meal, string> = { dinner: 'Middag', lunch: 'Lunch' };

/** "1 gång", "3 gånger". */
export const timesText = (n: number) => plural(n, 'gång', 'gånger');

/** A dish without steps, and without ingredients or with only guessed ones: an import may fill it in. */
export const hasOnlyName = (recipe: {
	ingredients: string[];
	ingredientsGuessed: boolean;
	instructions: string | null;
}) => (recipe.ingredients.length === 0 || recipe.ingredientsGuessed) && !recipe.instructions;

/** Lines on a note that are not a dish, offered as quick choices for a day. */
export const NOT_DISHES = ['Rester', 'Äta ute', 'Hämtmat'];

export const isDish = (text: string) =>
	!NOT_DISHES.some((other) => nameKey(other) === nameKey(text));

/** By name, A to Ö. */
export const byName = (a: { name: string }, b: { name: string }) =>
	a.name.localeCompare(b.name, 'sv');

/** The most eaten first, then the latest eaten, then by name. */
export const byOften = (a: RecipeSummary, b: RecipeSummary) =>
	b.timesEaten - a.timesEaten || (b.lastWeek ?? '').localeCompare(a.lastWeek ?? '') || byName(a, b);

/** The dishes whose name has what is written in it, or all of them when nothing is. */
export function matching<R extends { name: string }>(recipes: R[], text: string): R[] {
	const key = nameKey(text);
	return key ? recipes.filter((r) => nameKey(r.name).includes(key)) : recipes;
}

/** A dish as the fields of its form. */
export const formValues = (recipe: {
	name: string;
	servings: number | null;
	timeMinutes: number | null;
	ingredients: string[];
	instructions: string | null;
	tags: string[];
	sourceUrl: string | null;
	category?: string | null;
	base?: string | null;
}): Record<string, string> => ({
	name: recipe.name,
	servings: recipe.servings?.toString() ?? '',
	timeMinutes: recipe.timeMinutes?.toString() ?? '',
	ingredients: recipe.ingredients.join('\n'),
	instructions: recipe.instructions ?? '',
	tags: recipe.tags.filter((tag) => tag !== LUNCHBOX_TAG).join(', '),
	sourceUrl: recipe.sourceUrl ?? '',
	category: recipe.category ?? '',
	base: recipe.base ?? ''
});

/**
 * The sorts of dish, in the order Rätter shows them, each with its icon and its colours as a
 * background and the text on it. A soup is always a soup.
 */
export const CATEGORIES = [
	{ key: 'soppa', label: 'Soppor', tint: '#f7e3b0', ink: '#56400a' },
	{ key: 'kott', label: 'Kött', tint: '#f1d9cc', ink: '#5a2c18' },
	{ key: 'kottfars', label: 'Köttfärs', tint: '#f3d6d2', ink: '#5c2420' },
	{ key: 'kyckling', label: 'Kyckling', tint: '#f6e0c4', ink: '#5a3a12' },
	{ key: 'fisk', label: 'Fisk', tint: '#d3e4f5', ink: '#1d3a57' },
	{ key: 'korv', label: 'Korv', tint: '#f0d4dc', ink: '#57202f' },
	{ key: 'vego', label: 'Vegetariskt', tint: '#d8ecc9', ink: '#2c4a1a' },
	{ key: 'ovrigt', label: 'Övrigt', tint: '#e6e0f0', ink: '#3b3150' }
] as const;

export type Category = (typeof CATEGORIES)[number]['key'];

/** What a dish is served with. */
export const BASES = [
	{ key: 'potatis', label: 'Potatis' },
	{ key: 'pasta', label: 'Pasta' },
	{ key: 'ris', label: 'Ris' },
	{ key: 'sallad', label: 'Sallad' },
	{ key: 'annat', label: 'Annat' }
] as const;

export type Base = (typeof BASES)[number]['key'];

/** The key when `value` is one of the sorts, else null. */
export const categoryOf = (value: unknown): Category | null =>
	CATEGORIES.find((c) => c.key === value)?.key ?? null;

/** The key when `value` is one of the bases, else null. */
export const baseOf = (value: unknown): Base | null =>
	BASES.find((b) => b.key === value)?.key ?? null;
