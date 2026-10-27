// The chains the household fetches offers from, and the offers fetched.
// See docs/beslut/0023-erbjudanden.md.
import {
	CHAINS,
	type Chain,
	type ChainState,
	type ChosenOffer,
	type ShownOffer
} from '../../offers';
import type { OfferToSort } from '../claude/offer-prompt';
import type { Offer } from '../offers/common';

interface ChainRow {
	chain: Chain;
	enabled: number;
	storeId: string | null;
	storeName: string | null;
	fetchedAt: string | null;
	requestedAt: string | null;
	error: string | null;
	offers: number;
}

export type ChainRecord = ChainState & { requestedAt: string | null };

const CHAIN_COLUMNS = `chain, enabled, store_id AS storeId, store_name AS storeName,
	fetched_at AS fetchedAt, requested_at AS requestedAt, error,
	(SELECT count(*) FROM offer o WHERE o.chain = c.chain) AS offers`;

const toRecord = ({ enabled, ...row }: ChainRow): ChainRecord => ({ ...row, enabled: !!enabled });

/** Every chain, in the order Hushållet lists them. */
export async function listChains(db: D1Database): Promise<ChainRecord[]> {
	const { results } = await db
		.prepare(
			`SELECT ${CHAIN_COLUMNS} FROM offer_chain c
			 ORDER BY CASE chain WHEN 'ica' THEN 1 WHEN 'willys' THEN 2 WHEN 'coop' THEN 3 ELSE 4 END`
		)
		.all<ChainRow>();
	return results.map(toRecord);
}

export async function getChain(db: D1Database, chain: Chain): Promise<ChainRecord> {
	const row = await db
		.prepare(`SELECT ${CHAIN_COLUMNS} FROM offer_chain c WHERE chain = ?`)
		.bind(chain)
		.first<ChainRow>();
	return toRecord(row!);
}

export async function setChainEnabled(db: D1Database, chain: Chain, enabled: boolean) {
	await db
		.prepare('UPDATE offer_chain SET enabled = ? WHERE chain = ?')
		.bind(enabled ? 1 : 0, chain)
		.run();
}

/** Chooses the chain's store and switches the chain on. The old store's offers go. */
export async function setChainStore(db: D1Database, chain: Chain, id: string, name: string) {
	await db.batch([
		db
			.prepare(
				`UPDATE offer_chain SET enabled = 1, store_id = ?, store_name = ?, fetched_at = NULL, error = NULL
				 WHERE chain = ?`
			)
			.bind(id, name, chain),
		db.prepare('DELETE FROM offer WHERE chain = ?').bind(chain)
	]);
}

/** Notes that the chain was asked something now, so the next ask can wait as the chain wants. */
export async function markRequested(db: D1Database, chain: Chain, now: Date) {
	await db
		.prepare('UPDATE offer_chain SET requested_at = ? WHERE chain = ?')
		.bind(now.toISOString(), chain)
		.run();
}

/**
 * Replaces the chain's offers with those just fetched. They go in as one JSON text, so a store's
 * hundreds of offers are one query, within what D1 allows a Worker per request.
 */
export async function saveOffers(
	db: D1Database,
	chain: Chain,
	offers: Offer[],
	now: Date,
	storeName: string | null = null
) {
	await db.batch([
		db.prepare('DELETE FROM offer WHERE chain = ?').bind(chain),
		db
			.prepare(
				`INSERT INTO offer (chain, name, brand, size, price, compare_price, category, member, valid_from, valid_to)
				 SELECT ?1, o.value ->> 'name', o.value ->> 'brand', o.value ->> 'size', o.value ->> 'price',
				   o.value ->> 'comparePrice', o.value ->> 'category', o.value ->> 'member',
				   o.value ->> 'validFrom', o.value ->> 'validTo'
				 FROM json_each(?2) o`
			)
			.bind(chain, JSON.stringify(offers.map((o) => ({ ...o, member: o.member ? 1 : 0 })))),
		db
			.prepare(
				`UPDATE offer_chain SET fetched_at = ?, error = NULL, store_name = coalesce(?, store_name)
				 WHERE chain = ?`
			)
			.bind(now.toISOString(), storeName, chain)
	]);
}

/** Notes why the fetch failed. The offers from the last fetch that worked stay. */
export async function saveFetchError(db: D1Database, chain: Chain, error: string) {
	await db.prepare('UPDATE offer_chain SET error = ? WHERE chain = ?').bind(error, chain).run();
}

/** The chain's offers, by name, to check what was saved. */
export async function listOffers(db: D1Database, chain: Chain): Promise<Offer[]> {
	const { results } = await db
		.prepare(
			`SELECT name, brand, size, price, compare_price AS comparePrice, category, member,
			   valid_from AS validFrom, valid_to AS validTo
			 FROM offer WHERE chain = ? ORDER BY name, id`
		)
		.bind(chain)
		.all<Omit<Offer, 'member'> & { member: number }>();
	return results.map((o) => ({ ...o, member: !!o.member }));
}

/** Offers Claude has not yet sorted into ingredients, oldest first. */
export async function unsortedOffers(db: D1Database, limit: number) {
	const { results } = await db
		.prepare(
			'SELECT id, name, brand, size, category FROM offer WHERE ingredient IS NULL ORDER BY id LIMIT ?'
		)
		.bind(limit)
		.all<OfferToSort & { id: number }>();
	return results;
}

/**
 * Saves what Claude made of the offers: each its ingredient, or '' when no dinner is made of it.
 * One query, however many offers.
 */
export async function saveIngredients(
	db: D1Database,
	offers: { id: number; ingredient: string }[]
) {
	await db
		.prepare(
			`UPDATE offer SET ingredient = j.value ->> 'ingredient'
			 FROM json_each(?) j WHERE offer.id = j.value ->> 'id'`
		)
		.bind(JSON.stringify(offers))
		.run();
}

/** An offer a dinner can be built on, as Claude sees it when suggesting the week. */
export type MenuOffer = ChosenOffer & { ingredient: string; brand: string; size: string };

/**
 * Offers a dinner can be built on, from the chains that are on, valid on ?1 and at least until
 * ?2, with member prices only when ?3 is 1. Shared, so Claude, the sheet and the planning card
 * agree on which offers there are.
 */
const USABLE = `FROM offer o JOIN offer_chain c ON c.chain = o.chain
	WHERE c.enabled = 1 AND o.ingredient <> ''
	  AND (o.valid_from IS NULL OR o.valid_from <= ?1) AND o.valid_to >= ?2
	  AND (?3 OR o.member = 0)`;

/** How many offers Claude sees at most, and of each ingredient. */
const MENU_OFFERS = 80;
const PER_INGREDIENT = 2;

/**
 * The offers a dinner can be built on from the chains that are on, valid today and at least
 * until `until`, by ingredient. Member prices only when the household counts them.
 */
export async function currentOffers(
	db: D1Database,
	today: string,
	until: string,
	memberPrices: boolean
): Promise<MenuOffer[]> {
	const { results } = await db
		.prepare(
			// One of each ingredient comes before a second, so the cap leaves out seconds first.
			`SELECT chain, name, brand, size, price, member, validTo, ingredient FROM (
			   SELECT * FROM (
			     SELECT o.*, o.valid_to AS validTo,
			       row_number() OVER (PARTITION BY o.ingredient ORDER BY o.member, o.chain, o.id) AS n
			     ${USABLE})
			   WHERE n <= ?4 ORDER BY n, ingredient LIMIT ?5)
			 ORDER BY ingredient, n`
		)
		.bind(today, until, memberPrices ? 1 : 0, PER_INGREDIENT, MENU_OFFERS)
		.all<Omit<MenuOffer, 'member'> & { member: number }>();
	return results.map((o) => ({ ...o, member: !!o.member }));
}

/**
 * Every offer a dinner can be built on from the chains that are on, valid today, for the sheet
 * Veckans erbjudanden. Member prices only when the household counts them.
 */
export async function dinnerOffers(
	db: D1Database,
	today: string,
	memberPrices: boolean
): Promise<ShownOffer[]> {
	const { results } = await db
		.prepare(
			`SELECT o.chain, o.name, o.price, o.compare_price AS comparePrice, o.member,
			   o.valid_to AS validTo
			 ${USABLE}
			 ORDER BY o.ingredient, o.name, o.id`
		)
		.bind(today, today, memberPrices ? 1 : 0)
		.all<Omit<ShownOffer, 'member'> & { member: number }>();
	return results.map((o) => ({ ...o, member: !!o.member }));
}

/** The chains Claude sees offers from when suggesting the week, as `currentOffers` picks them. */
export async function offerChains(
	db: D1Database,
	today: string,
	until: string,
	memberPrices: boolean
): Promise<Chain[]> {
	const { results } = await db
		.prepare(`SELECT DISTINCT o.chain ${USABLE}`)
		.bind(today, until, memberPrices ? 1 : 0)
		.all<{ chain: Chain }>();
	const found = new Set(results.map((r) => r.chain));
	return CHAINS.map((c) => c.key).filter((chain) => found.has(chain));
}
