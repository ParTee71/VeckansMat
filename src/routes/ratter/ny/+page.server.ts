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
import { askFor } from '#lib/server/claude/claude.ts';
import { recipeUrl, siteName } from '#lib/links.ts';
import { RecipeReadError, type RecipeDraft } from '#lib/server/recipe-draft.ts';
import { fetchPage, pageText, recipeFromHtml } from '#lib/server/recipe-link.ts';
import { photosOf, readRecipe, type RecipeSource } from '#lib/server/recipe-parse.ts';
import { formValues, hasOnlyName, LUNCHBOX_TAG } from '#lib/recipes.ts';
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

type Kind = 'link' | 'text' | 'photo';

function readError(reason: RecipeReadError['reason'], kind: Kind): string {
	switch (reason) {
		case 'fetch':
			return 'Sidan gick inte att hämta. Fyll i receptet själv, med länken sparad.';
		case 'none':
			if (kind === 'link') {
				return 'Sidan har inget recept som appen kan läsa. Fyll i det själv, med länken sparad.';
			}
			return kind === 'text'
				? 'Det gick inte att hitta något recept i texten. Fyll i det själv.'
				: 'Det gick inte att hitta något recept på bilderna. Ta ett skarpare foto, eller fyll i det själv.';
		case 'failed':
			return 'Receptet gick inte att läsa just nu. Försök igen om en stund, eller fyll i det själv.';
		case 'limit':
			return 'Appen har läst så många recept som månadens tak tillåter. Fyll i det själv, eller vänta till nästa månad.';
	}
}

// Far more than a recipe; a longer paste is something else.
const MAX_TEXT = 20_000;

const askRecipe = askFor('recipe');
const withClaude = (source: RecipeSource) => readRecipe(source, askRecipe);

/** A page's JSON-LD when it has one, otherwise Claude reads the page's text. */
async function readLink(link: URL, allowLocal: boolean): Promise<RecipeDraft> {
	const html = await fetchPage(link, fetch, allowLocal);
	const draft = recipeFromHtml(html, link.href);
	if (draft) return draft;
	const text = pageText(html);
	// A page that only its scripts fill in has no text for Claude either.
	if (!text) throw new RecipeReadError('none');
	return withClaude({ text, sourceUrl: link.href });
}

/**
 * The form's fields for a draft. When it fills in a stored dish, what the dish already has and
 * the page does not give is kept, such as its tags.
 */
function valuesOf(draft: Partial<RecipeDraft>, stored: Recipe | null): Record<string, string> {
	return formValues({
		name: draft.name ?? '',
		servings: draft.servings ?? stored?.servings ?? null,
		timeMinutes: draft.timeMinutes ?? stored?.timeMinutes ?? null,
		ingredients: draft.ingredients ?? [],
		instructions: draft.instructions ?? null,
		tags: stored?.tags ?? [],
		sourceUrl: draft.sourceUrl || stored?.sourceUrl || null
	});
}

/** A dish that already has the name and is not the one being filled in. */
async function existingOf(name: string, targetId: number | undefined): Promise<RecipeMatch | null> {
	const found = name.trim() ? await findRecipeByName(env.DB, name) : null;
	return found && found.id !== targetId ? found : null;
}

/** What the review starts from: the draft, under the name of the dish being filled in if any. */
async function review(draft: Partial<RecipeDraft>, target: Recipe | null, source: string | null) {
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
		// Before anything is fetched or paid for, since a link to fill in may be out of date.
		const target = await targetOf(url);
		const form = await request.formData();
		const text = String(form.get('text') ?? '').trim();
		const photos = await photosOf(form);
		const invalid = (readError: string) => fail(400, { text, readError, kind: null });
		if (typeof photos === 'string') return invalid(photos);
		if (!text && !photos.length) {
			return invalid('Klistra in en länk eller texten till ett recept, eller ta ett foto.');
		}
		if (text.length > MAX_TEXT) return invalid('Texten är för lång för ett recept.');

		const allowLocal = env.ALLOW_LOCAL_FETCH === 'true';
		const isLink = !!recipeUrl(text, true);
		const link = isLink ? recipeUrl(text, allowLocal) : null;
		if (isLink && !link) {
			return invalid('Länken ska vara en webbsida på internet, som börjar med https://');
		}
		const kind: Kind = photos.length ? 'photo' : link ? 'link' : 'text';
		try {
			let draft: RecipeDraft;
			let source: string;
			if (kind === 'link') {
				draft = await readLink(link!, allowLocal);
				source = `Hämtat från ${siteName(link!)}`;
			} else {
				// A link sent with photos is kept as the recipe's link, not read as its text.
				draft = await withClaude(link ? { photos, sourceUrl: link.href } : { photos, text });
				source =
					kind === 'text'
						? 'Läst ur texten'
						: `Läst från ${photos.length > 1 ? 'fotona' : 'fotot'}`;
			}
			return await review(draft, target, source);
		} catch (e) {
			if (!(e instanceof RecipeReadError)) throw e;
			return fail(422, { text, readError: readError(e.reason, kind), kind });
		}
	},

	// After a failed read, the form with the link saved, or the text kept to copy from.
	fillIn: async ({ request, url }) => {
		const text = String((await request.formData()).get('text') ?? '').trim();
		const draft = recipeUrl(text, true) ? { sourceUrl: text } : { instructions: text || null };
		return review(draft, await targetOf(url), null);
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
			if (e instanceof NameTakenError) return invalid(e.message);
			throw e;
		}
		redirect(303, `/ratter/${id}`);
	}
};
