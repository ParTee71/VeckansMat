// Reads a recipe from photos or text with Claude. See docs/beslut/0006-claude-i-appen.md and
// docs/beslut/0013-recept-in.md.
import type Anthropic from '@anthropic-ai/sdk';
import { MAX_PHOTOS } from '../photos';
import { ClaudeLimitError, type Ask } from './claude/claude';
import { RECIPE_PROMPT, RECIPE_SCHEMA } from './claude/recipe-prompt';
import { RecipeReadError, type RecipeDraft } from './recipe-draft';

// A photo the phone made smaller is well under this. The cap keeps a Worker's memory, which
// holds each photo a few times over, clear of its limit, and is under Claude's own of 5 MB.
export const MAX_PHOTO_BYTES = 3_000_000;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export interface Photo {
	type: (typeof PHOTO_TYPES)[number];
	bytes: Uint8Array;
}

/** The photos sent, or what is wrong with them. A file field left empty sends an empty file. */
export async function photosOf(form: FormData): Promise<Photo[] | string> {
	const files = form
		.getAll('photo')
		.filter((file): file is File => file instanceof File && file.size > 0);
	if (files.length > MAX_PHOTOS) return `Högst ${MAX_PHOTOS} bilder per recept.`;
	const photos: Photo[] = [];
	for (const file of files) {
		const type = PHOTO_TYPES.find((type) => type === file.type);
		if (!type) return 'En bild går inte att läsa. Välj ett foto i JPEG eller PNG.';
		if (file.size > MAX_PHOTO_BYTES) return 'En bild är för stor. Välj en mindre bild.';
		photos.push({ type, bytes: new Uint8Array(await file.arrayBuffer()) });
	}
	return photos;
}

/** What to read: photos, text, or both, and the recipe's link, such as the page's the text is. */
export interface RecipeSource {
	photos?: Photo[];
	text?: string;
	sourceUrl?: string;
}

function base64(bytes: Uint8Array): string {
	let text = '';
	// In parts, since a whole photo is too many arguments for one call.
	for (let i = 0; i < bytes.length; i += 0x8000) {
		text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(text);
}

function content(source: RecipeSource): Anthropic.ContentBlockParam[] {
	const blocks: Anthropic.ContentBlockParam[] = (source.photos ?? []).map((photo) => ({
		type: 'image',
		source: { type: 'base64', media_type: photo.type, data: base64(photo.bytes) }
	}));
	// The material cannot close the tag it is in and write outside it.
	const text = source.text?.replace(/<\/?(recipe_text|web_page)\b/gi, '').trim();
	if (text) {
		blocks.push({
			type: 'text',
			text: source.sourceUrl
				? `<web_page url="${source.sourceUrl}">\n${text}\n</web_page>`
				: `<recipe_text>\n${text}\n</recipe_text>`
		});
	}
	blocks.push({ type: 'text', text: 'Copy the recipe.' });
	return blocks;
}

const strings = (value: unknown): string[] =>
	Array.isArray(value)
		? value
				.filter((item) => typeof item === 'string')
				.map((item) => item.trim())
				.filter(Boolean)
		: [];

const count = (value: unknown): number | null =>
	Number.isInteger(value) && (value as number) > 0 ? (value as number) : null;

/** The answer as a draft, keeping each field that is right even when another is not. */
function toDraft(answer: Record<string, unknown>, sourceUrl: string): RecipeDraft | null {
	const steps = strings(answer.instructions);
	const draft = {
		name: typeof answer.name === 'string' ? answer.name.trim() : '',
		servings: count(answer.servings),
		timeMinutes: count(answer.timeMinutes),
		ingredients: strings(answer.ingredients),
		instructions: steps.length ? steps.map((step, i) => `${i + 1}. ${step}`).join('\n') : null,
		sourceUrl
	};
	return draft.name || draft.ingredients.length || draft.instructions ? draft : null;
}

export async function readRecipe(source: RecipeSource, ask: Ask): Promise<RecipeDraft> {
	let message: Anthropic.Message;
	try {
		message = await ask({
			max_tokens: 8000,
			system: RECIPE_PROMPT,
			output_config: { effort: 'low', format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
			messages: [{ role: 'user', content: content(source) }]
		});
	} catch (e) {
		if (e instanceof ClaudeLimitError) throw new RecipeReadError('limit');
		console.error('Claude could not read the recipe', e);
		throw new RecipeReadError('failed');
	}

	const text = message.content.find((block) => block.type === 'text')?.text;
	let answer: unknown;
	try {
		answer = text === undefined ? null : JSON.parse(text);
	} catch {
		// Cut short or refused; the answer is not the schema's.
	}
	if (typeof answer !== 'object' || answer === null) {
		console.error('Claude gave no recipe answer', message.stop_reason);
		throw new RecipeReadError('failed');
	}
	const draft = toDraft(answer as Record<string, unknown>, source.sourceUrl ?? '');
	if (!draft) throw new RecipeReadError('none');
	return draft;
}
