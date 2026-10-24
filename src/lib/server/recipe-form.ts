import { nameKey } from '../names';
import { LUNCHBOX_TAG } from '../recipes';
import type { RecipeInput } from './db/recipes';

const FIELDS = [
	'name',
	'servings',
	'timeMinutes',
	'ingredients',
	'instructions',
	'tags',
	'sourceUrl'
];

/** What was written, to show again, and either the recipe or what is wrong with it. */
export type RecipeForm = { values: Record<string, string>; lunchbox: boolean } & (
	{ input: RecipeInput } | { error: string }
);

const lines = (text: string) =>
	text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

/** A positive whole number, or null for an empty field. */
function count(text: string): number | null | undefined {
	if (!text.trim()) return null;
	const n = Number(text);
	return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function parseRecipeForm(form: FormData): RecipeForm {
	const values = Object.fromEntries(FIELDS.map((name) => [name, String(form.get(name) ?? '')]));
	const lunchbox = form.has('lunchbox');
	const invalid = (error: string) => ({ error, values, lunchbox });

	const servings = count(values.servings);
	const timeMinutes = count(values.timeMinutes);
	if (!nameKey(values.name)) return invalid('Rätten behöver ett namn.');
	if (servings === undefined) return invalid('Portioner ska vara ett heltal.');
	if (timeMinutes === undefined) return invalid('Tiden ska vara ett antal minuter.');
	// Only web pages, so a stored link can never run script when it is opened.
	const sourceUrl = values.sourceUrl.trim() || null;
	if (sourceUrl && !/^https?:$/.test(URL.parse(sourceUrl)?.protocol ?? ''))
		return invalid('Länken ska börja med https://');

	const tags = new Set(
		values.tags
			.split(',')
			.map((tag) => tag.trim().toLocaleLowerCase('sv'))
			.filter(Boolean)
	);
	tags.delete(LUNCHBOX_TAG);
	if (lunchbox) tags.add(LUNCHBOX_TAG);

	return {
		values,
		lunchbox,
		input: {
			name: values.name,
			servings,
			timeMinutes,
			ingredients: lines(values.ingredients),
			instructions: values.instructions.trim() || null,
			tags: [...tags],
			sourceUrl
		}
	};
}
