// Claude sorts the fetched offers into the ingredients a dinner is cooked from, so that the week's
// suggestion can use them. See docs/beslut/0023-erbjudanden.md.
import { answerText } from '../names';
import { askJson, type Ask } from './claude/claude';
import { OFFER_PROMPT, OFFER_SCHEMA, offerContent, type OfferToSort } from './claude/offer-prompt';
import { saveIngredients, unsortedOffers } from './db/offers';

/** Offers in one call: a large store's week in two or three. */
const BATCH = 150;

/** How long to wait after a call that failed, so a broken answer is not asked for at once again. */
const RETRY_MS = 10 * 60_000;

/** Why Claude sorted nothing: it failed, or the month's cap is spent. */
export class OfferSortError extends Error {
	constructor(readonly reason: 'failed' | 'limit') {
		super(`No ingredients: ${reason}`);
	}
}

/**
 * Asks Claude which offers a dinner can be built on, and the ingredient of each, by its place in
 * `offers`. An offer Claude left out is not in the answer.
 */
export async function askIngredients(
	offers: OfferToSort[],
	ask: Ask
): Promise<Map<number, string>> {
	const parsed = await askJson(
		ask,
		{
			max_tokens: 8000,
			system: OFFER_PROMPT,
			output_config: { effort: 'low', format: { type: 'json_schema', schema: OFFER_SCHEMA } },
			messages: [{ role: 'user', content: [{ type: 'text', text: offerContent(offers) }] }]
		},
		(reason) => new OfferSortError(reason),
		'offers',
		'offers'
	);
	const ingredients = new Map<number, string>();
	for (const answer of parsed.offers) {
		const i = Number(answer?.offer) - 1;
		const ingredient = answerText(answer?.ingredient, 40).toLocaleLowerCase('sv');
		if (offers[i] && ingredient && !ingredients.has(i)) ingredients.set(i, ingredient);
	}
	return ingredients;
}

/** When a run began, so that one cut off midway by the runtime does not hold the rest back. */
let runningSince = 0;
let nextTry = 0;
const RUN_MS = 5 * 60_000;

/**
 * Sorts the offers not yet sorted, a batch at a time and at most `batches` batches. An offer Claude left out is saved as one
 * no dinner is made of, so it is not asked about again. When Claude fails, the rest wait for a
 * later run. Never throws: it runs after a fetch or before a suggestion, which go on without it.
 */
export async function sortOffers(db: D1Database, ask: Ask, batches = Infinity): Promise<void> {
	// Two runs at once would ask about the same offers twice.
	if (Date.now() < runningSince + RUN_MS || Date.now() < nextTry) return;
	runningSince = Date.now();
	try {
		for (let batch = 0; batch < batches; batch++) {
			const offers = await unsortedOffers(db, BATCH);
			if (!offers.length) return;
			const ingredients = await askIngredients(offers, ask);
			await saveIngredients(
				db,
				offers.map((o, i) => ({ id: o.id, ingredient: ingredients.get(i) ?? '' }))
			);
			if (offers.length < BATCH) return;
		}
	} catch (e) {
		nextTry = Date.now() + RETRY_MS;
		// askJson has logged why Claude failed; anything else is logged here.
		if (!(e instanceof OfferSortError)) console.error('The offers could not be sorted', e);
	} finally {
		runningSince = 0;
	}
}
