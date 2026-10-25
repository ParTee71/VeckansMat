import type { Meal } from './server/db/menus';

/** The tag on a dish that is good for lunch boxes, so a little extra is cooked. */
export const LUNCHBOX_TAG = 'matlåda';

export const MEAL_LABELS: Record<Meal, string> = { dinner: 'Middag', lunch: 'Lunch' };

/** "1 gång", "3 gånger". */
export const timesText = (n: number) => (n === 1 ? '1 gång' : `${n} gånger`);

/** A dish without ingredients or steps, which an import may fill in. */
export const hasOnlyName = (recipe: { ingredients: string[]; instructions: string | null }) =>
	recipe.ingredients.length === 0 && !recipe.instructions;
