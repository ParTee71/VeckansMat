import { nameKey } from './names';
import type { Meal } from './server/db/menus';

/** The tag on a dish that is good for lunch boxes, so a little extra is cooked. */
export const LUNCHBOX_TAG = 'matlåda';

export const MEAL_LABELS: Record<Meal, string> = { dinner: 'Middag', lunch: 'Lunch' };

/** "1 vara", "3 varor". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
