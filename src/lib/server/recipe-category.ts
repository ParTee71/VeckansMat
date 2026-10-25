// Claude gives the dishes that have no sort yet their sort and base, in the background while
// Rätter loads. See docs/beslut/0020-sorter-pa-ratter.md.
import { baseOf, categoryOf, type Base, type Category } from '../recipes';
import { askJson, type Ask } from './claude/claude';
import { CATEGORY_PROMPT, CATEGORY_SCHEMA, categoryContent } from './claude/category-prompt';
import { guessCategoryStatement, unsortedRecipes } from './db/recipes';

/** Dishes in one call: the household's old dishes fit in one. */
const BATCH = 100;

/** How long to wait after a call that failed, so a broken answer is not asked for on every load. */
const RETRY_MS = 10 * 60_000;

/** Why Claude sorted nothing: it failed, or the month's cap is spent. */
export class CategoryError extends Error {
	constructor(readonly reason: 'failed' | 'limit') {
		super(`No sorts: ${reason}`);
	}
}

/**
 * Asks Claude for the sort and base of each dish, by its place in `dishes`. A dish Claude left
 * out, or gave a sort that is not on the list, is not in the answer.
 */
export async function askCategories(
	dishes: { name: string; ingredients: string[] }[],
	ask: Ask
): Promise<Map<number, { category: Category; base: Base | null }>> {
	const parsed = await askJson(
		ask,
		{
			max_tokens: 8000,
			system: CATEGORY_PROMPT,
			output_config: { effort: 'low', format: { type: 'json_schema', schema: CATEGORY_SCHEMA } },
			messages: [{ role: 'user', content: [{ type: 'text', text: categoryContent(dishes) }] }]
		},
		(reason) => new CategoryError(reason),
		'sorts',
		'dishes'
	);
	const sorts = new Map<number, { category: Category; base: Base | null }>();
	for (const answer of parsed.dishes) {
		const i = Number(answer?.dish) - 1;
		const category = categoryOf(answer?.category);
		if (dishes[i] && category && !sorts.has(i))
			sorts.set(i, { category, base: baseOf(answer?.base) });
	}
	return sorts;
}

let running = false;
let nextTry = 0;

/**
 * Sorts every dish without a sort, a batch at a time. A dish Claude gave no sort is put under
 * Övrigt, so it is not asked about again. When Claude fails, the rest wait for a later load.
 * Never throws: it runs after the page has answered.
 */
export async function sortRecipes(db: D1Database, ask: Ask): Promise<void> {
	// Two loads at once would ask about the same dishes twice.
	if (running || Date.now() < nextTry) return;
	running = true;
	try {
		for (;;) {
			const dishes = await unsortedRecipes(db, BATCH);
			if (!dishes.length) return;
			const sorts = await askCategories(dishes, ask);
			await db.batch(
				dishes.map((dish, i) => {
					const sort = sorts.get(i);
					return guessCategoryStatement(
						db,
						dish.id,
						sort?.category ?? 'ovrigt',
						sort?.base ?? null
					);
				})
			);
			if (dishes.length < BATCH) return;
		}
	} catch (e) {
		nextTry = Date.now() + RETRY_MS;
		// askJson has logged why Claude failed; anything else is logged here.
		if (!(e instanceof CategoryError)) console.error('The dishes could not be sorted', e);
	} finally {
		running = false;
	}
}
