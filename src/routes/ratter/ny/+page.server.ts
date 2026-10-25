import { error, fail, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import {
	findRecipeByName,
	getRecipe,
	NameTakenError,
	createRecipe,
	updateRecipe,
	type Recipe,
	type RecipeMatch
} from '#lib/server/db/recipes.ts';
import {
	fetchRecipe,
	RecipeLinkError,
	recipeUrl,
	type RecipeDraft
} from '#lib/server/recipe-link.ts';
import { hasOnlyName, LUNCHBOX_TAG } from '#lib/recipes.ts';
import { parseRecipeForm } from '#lib/server/recipe-form.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * The dish with only a name that this import fills in, from ?till=<id>, or null. The page's
 * forms keep it in their action URLs, since the page lands where a form is sent. A dish that
 * has more than a name is shown instead, so an old link cannot write over it.
 */
async function targetOf(url: URL) {
	const id = url.searchParams.get('till');
	if (id === null) return null;
	const recipe = /^\d+$/.test(id) ? await getRecipe(env.DB, Number(id)) : null;
	if (!recipe) error(404, 'Rätten finns inte');
	if (!hasOnlyName(recipe)) redirect(303, `/ratter/${recipe.id}`);
	return recipe;
}

const brief = (recipe: Recipe | null) => recipe && { id: recipe.id, name: recipe.name };

export const load: PageServerLoad = async ({ url }) => ({
	target: brief(await targetOf(url)),
	link: url.searchParams.get('url') ?? ''
});

const READ_ERRORS: Record<RecipeLinkError['reason'], string> = {
	fetch: 'Sidan gick inte att hämta. Fyll i receptet själv, med länken sparad.',
	none: 'Sidan har inget recept som appen kan läsa. Fyll i det själv, med länken sparad.'
};

/**
 * The form's fields for a draft. When it fills in a stored dish, what the dish already has and
 * the page does not give is kept, such as its tags.
 */
function valuesOf(draft: Partial<RecipeDraft>, stored: Recipe | null): Record<string, string> {
	return {
		name: draft.name ?? '',
		servings: (draft.servings ?? stored?.servings)?.toString() ?? '',
		timeMinutes: (draft.timeMinutes ?? stored?.timeMinutes)?.toString() ?? '',
		ingredients: draft.ingredients?.join('\n') ?? '',
		instructions: draft.instructions ?? '',
		tags: stored?.tags.filter((tag) => tag !== LUNCHBOX_TAG).join(', ') ?? '',
		sourceUrl: draft.sourceUrl || (stored?.sourceUrl ?? '')
	};
}

/** A dish that already has the name and is not the one being filled in. */
async function existingOf(name: string, targetId: number | undefined): Promise<RecipeMatch | null> {
	const found = name.trim() ? await findRecipeByName(env.DB, name) : null;
	return found && found.id !== targetId ? found : null;
}

/** What the review starts from: the draft, under the name of the dish being filled in if any. */
async function review(draft: Partial<RecipeDraft>, url: URL, source: string | null) {
	const target = await targetOf(url);
	const name = target?.name ?? draft.name ?? '';
	const existing = await existingOf(name, target?.id);
	const stored = target ?? (existing?.onlyName ? await getRecipe(env.DB, existing.id) : null);
	return {
		review: {
			values: valuesOf({ ...draft, name }, stored),
			lunchbox: stored?.tags.includes(LUNCHBOX_TAG) ?? false,
			source,
			target: brief(target),
			existing
		}
	};
}

export const actions: Actions = {
	read: async ({ request, url }) => {
		const text = String((await request.formData()).get('link') ?? '').trim();
		if (!text) return fail(400, { link: text, readError: 'Klistra in en länk till ett recept.' });
		const allowLocal = env.ALLOW_LOCAL_FETCH === 'true';
		const link = recipeUrl(text, allowLocal);
		if (!link) {
			const readError = /^\w+:\/\//.test(text)
				? 'Länken ska vara en webbsida som börjar med https://'
				: 'Än så länge går bara länkar att läsa. Text och foton kommer snart.';
			return fail(400, { link: text, readError, canFillIn: false });
		}
		try {
			return await review(
				await fetchRecipe(link, fetch, allowLocal),
				url,
				link.hostname.replace(/^www\./, '')
			);
		} catch (e) {
			if (!(e instanceof RecipeLinkError)) throw e;
			return fail(422, { link: text, readError: READ_ERRORS[e.reason], canFillIn: true });
		}
	},

	// After a failed read, the form with only the link. Saving checks the link like any other.
	fillIn: async ({ request, url }) => {
		const link = String((await request.formData()).get('link') ?? '').trim();
		return review({ sourceUrl: link }, url, null);
	},

	save: async ({ request, url }) => {
		const { values, lunchbox, ...parsed } = parseRecipeForm(await request.formData());
		const target = brief(await targetOf(url));
		// A dish with the name and more than a name is told by the review's notice, not an error.
		const invalid = (error: string | null, existing: RecipeMatch | null = null) =>
			fail(400, { review: { values, lunchbox, source: null, target, existing }, error });
		if ('error' in parsed) return invalid(parsed.error);
		const { input } = parsed;

		let id = target?.id;
		try {
			if (!id) {
				const existing = await existingOf(input.name, undefined);
				if (existing && !existing.onlyName) return invalid(null, existing);
				// A dish with only a name is filled in, so the weeks it was eaten stay with it.
				id = existing?.id;
			}
			if (id) {
				if (!(await updateRecipe(env.DB, id, input))) error(404, 'Rätten finns inte');
			} else {
				id = await createRecipe(env.DB, input);
			}
		} catch (e) {
			if (e instanceof NameTakenError)
				return invalid(`Det finns redan en rätt som heter ${input.name.trim()}.`);
			throw e;
		}
		redirect(303, `/ratter/${id}`);
	}
};
