// What reading a recipe gives, from a page's JSON-LD or with Claude.

/** What a page, photo or text gave, before anyone has checked it. Only what was found is filled in. */
export interface RecipeDraft {
	name: string;
	servings: number | null;
	timeMinutes: number | null;
	ingredients: string[];
	instructions: string | null;
	sourceUrl: string;
}

/**
 * Why no recipe was read: a page that could not be fetched, no recipe in what was given,
 * Claude failing, or the month's cap for Claude spent.
 */
export class RecipeReadError extends Error {
	constructor(readonly reason: 'fetch' | 'none' | 'failed' | 'limit') {
		super(`No recipe was read: ${reason}`);
	}
}
