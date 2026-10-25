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
}): Record<string, string> => ({
	name: recipe.name,
	servings: recipe.servings?.toString() ?? '',
	timeMinutes: recipe.timeMinutes?.toString() ?? '',
	ingredients: recipe.ingredients.join('\n'),
	instructions: recipe.instructions ?? '',
	tags: recipe.tags.filter((tag) => tag !== LUNCHBOX_TAG).join(', '),
	sourceUrl: recipe.sourceUrl ?? ''
});
