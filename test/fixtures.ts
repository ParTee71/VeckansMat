import { findRecipeByName, updateRecipe } from '../src/lib/server/db/recipes';

/** A made-up week the tests plan, far from any real one. */
export const WEEK = '2030-03-04';

/** A dinner written on a day of the week. */
export const dinner = (weekday: number, text: string) => ({
	weekday,
	meal: 'dinner' as const,
	text
});

/** Gives a dish that exists by name its own ingredients, and returns its id. */
export async function giveIngredients(
	db: D1Database,
	name: string,
	ingredients: string[],
	tags: string[] = []
) {
	const { id } = (await findRecipeByName(db, name))!;
	await updateRecipe(db, id, {
		name,
		servings: 4,
		timeMinutes: null,
		instructions: null,
		sourceUrl: null,
		ingredients,
		tags
	});
	return id;
}
