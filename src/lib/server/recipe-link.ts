// Fetches a recipe page and reads its schema.org/Recipe data (JSON-LD), without Claude.
// See docs/beslut/0013-recept-in.md.
import { recipeUrl } from '../links';
import { RecipeReadError, type RecipeDraft } from './recipe-draft';

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;

/**
 * The page's HTML. Redirects are followed by hand, so that each address on the way is checked
 * like the first.
 */
export async function fetchPage(
	url: URL,
	fetcher: typeof fetch = fetch,
	allowLocal = false
): Promise<string> {
	// One deadline for the whole fetch, redirects included.
	const signal = AbortSignal.timeout(TIMEOUT_MS);
	let html: string | null = null;
	try {
		let response: Response | undefined;
		let at: URL | null = url;
		for (let hops = 0; at && hops <= MAX_REDIRECTS; hops++) {
			response = await fetcher(at, {
				headers: {
					accept: 'text/html,application/xhtml+xml',
					'user-agent':
						'Mozilla/5.0 (compatible; VeckansMat; +https://github.com/ParTee71/VeckansMat)'
				},
				redirect: 'manual',
				signal
			});
			const location = response.headers.get('location');
			if (response.status < 300 || response.status >= 400 || !location) break;
			// The body of a redirect is not read, so its connection is let go at once.
			await response.body?.cancel();
			at = recipeUrl(new URL(location, at).href, allowLocal);
			response = undefined;
		}
		if (response?.ok && response.body) html = await readText(response);
		else await response?.body?.cancel();
	} catch {
		// Fetching or reading failed; html stays null.
	}
	if (html === null) throw new RecipeReadError('fetch');
	return html;
}

/** The body as text, or null when it is larger than a recipe page has reason to be. */
async function readText(response: Response): Promise<string | null> {
	const reader = response.body!.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_BYTES) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return decode(bytes, response.headers.get('content-type'));
}

/**
 * The page as text, in the character set the server or the page itself names. Most sites
 * use UTF-8, but an older Swedish one may still be in ISO-8859-1, where å, ä and ö differ.
 */
function decode(bytes: Uint8Array, contentType: string | null): string {
	// The start as single bytes is enough to find an ASCII <meta charset>.
	const head = String.fromCharCode(...bytes.subarray(0, 2048));
	const charset =
		/charset\s*=\s*["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ??
		/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] ??
		'utf-8';
	try {
		return new TextDecoder(charset).decode(bytes);
	} catch {
		return new TextDecoder().decode(bytes);
	}
}

/** The recipe in the page's JSON-LD, or null when there is none. */
export function recipeFromHtml(html: string, sourceUrl: string): RecipeDraft | null {
	const blocks = html.matchAll(
		/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
	);
	for (const [, json] of blocks) {
		let data: unknown;
		try {
			data = JSON.parse(json);
		} catch {
			continue;
		}
		const recipe = findRecipe(data);
		if (recipe) return toDraft(recipe, sourceUrl);
	}
	return null;
}

// A recipe page's text is a few thousand characters; the rest of a long page is menus and ads.
const MAX_PAGE_TEXT = 30_000;

/** The page as plain text, a line per paragraph, for Claude to read when it has no JSON-LD. */
export function pageText(html: string): string {
	return decodeEntities(
		html
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, '')
			.replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article|header|title)\s*>/gi, '\n')
			.replace(/<[^>]*>/g, ' ')
	)
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('\n')
		.slice(0, MAX_PAGE_TEXT);
}

type Node = Record<string, unknown>;

const isNode = (value: unknown): value is Node =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function isRecipe(node: Node): boolean {
	const type = node['@type'];
	return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
}

/** The first Recipe anywhere in the data: in lists, in @graph or as a page's main entity. */
function findRecipe(data: unknown, depth = 0): Node | null {
	if (depth > 5) return null;
	if (Array.isArray(data)) {
		for (const item of data) {
			const found = findRecipe(item, depth + 1);
			if (found) return found;
		}
		return null;
	}
	if (!isNode(data)) return null;
	if (isRecipe(data)) return data;
	return findRecipe(data['@graph'], depth + 1) ?? findRecipe(data.mainEntity, depth + 1);
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	frac12: '½',
	frac14: '¼',
	frac34: '¾',
	aring: 'å',
	auml: 'ä',
	ouml: 'ö',
	eacute: 'é',
	deg: '°'
};

/** Entities decoded, so that text and tags written as &lt;p&gt; are plain again. */
function decodeEntities(text: string): string {
	return text.replace(/&(#x[\da-f]+|#\d+|[a-z]\w*);/gi, (entity, code: string) => {
		if (code[0] !== '#') {
			// The entity's case is the letter's: &Ouml; is Ö.
			const letter = ENTITIES[code.toLowerCase()];
			if (!letter) return entity;
			return code[0] === code[0].toUpperCase() ? letter.toUpperCase() : letter;
		}
		const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
		return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
	});
}

/** Plain text: entities decoded, tags taken out and white space collapsed. */
function clean(value: unknown): string {
	if (typeof value !== 'string' && typeof value !== 'number') return '';
	return decodeEntities(String(value))
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

const list = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];

/** Minutes in an ISO 8601 duration such as PT1H30M or P0DT40M, or null. */
export function durationMinutes(value: unknown): number | null {
	const match =
		typeof value === 'string' &&
		/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:[\d.]+S)?)?$/i.exec(value.trim());
	if (!match) return null;
	const [, days = '0', hours = '0', minutes = '0'] = match;
	const total = Number(days) * 1440 + Number(hours) * 60 + Number(minutes);
	return total > 0 ? total : null;
}

/** The first whole number in a yield such as "4", 4, "4 portioner" or ["4", "4 portioner"]. */
function servings(value: unknown): number | null {
	for (const item of list(value)) {
		const n = Number(/\d+/.exec(clean(item))?.[0]);
		if (Number.isInteger(n) && n > 0) return n;
	}
	return null;
}

/** The steps, one per line, numbered, with each section's name on a line of its own. */
function instructions(value: unknown): string | null {
	const lines: string[] = [];
	let step = 0;
	const walk = (item: unknown, depth: number) => {
		if (depth > 6) return;
		if (typeof item === 'string') {
			// A single text may hold all the steps, a line or paragraph each.
			for (const line of decodeEntities(item)
				.split(/\n|<br\s*\/?>|<\/p>/i)
				.map(clean)
				.filter(Boolean)) {
				lines.push(`${++step}. ${line}`);
			}
		} else if (Array.isArray(item)) {
			for (const child of item) walk(child, depth + 1);
		} else if (isNode(item)) {
			if (item.itemListElement !== undefined) {
				const name = clean(item.name);
				if (name) lines.push(name);
				walk(item.itemListElement, depth + 1);
			} else {
				walk(typeof item.text === 'string' ? item.text : item.name, depth + 1);
			}
		}
	};
	walk(value, 0);
	return lines.length ? lines.join('\n') : null;
}

function toDraft(recipe: Node, sourceUrl: string): RecipeDraft {
	const time =
		durationMinutes(recipe.totalTime) ??
		((durationMinutes(recipe.prepTime) ?? 0) + (durationMinutes(recipe.cookTime) ?? 0) || null);
	return {
		name: clean(recipe.name),
		servings: servings(recipe.recipeYield),
		timeMinutes: time,
		ingredients: list(recipe.recipeIngredient).map(clean).filter(Boolean),
		instructions: instructions(recipe.recipeInstructions),
		sourceUrl
	};
}
