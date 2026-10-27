// The chains the household fetches offers from, and the offers fetched.
// See docs/beslut/0023-erbjudanden.md.
import type { Chain, ChainState } from '../../offers';
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

export type ChainRecord = Omit<ChainState, 'available'> & { requestedAt: string | null };

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

/** Replaces the chain's offers with those just fetched. */
export async function saveOffers(
	db: D1Database,
	chain: Chain,
	offers: Offer[],
	now: Date,
	storeName: string | null = null
) {
	const insert = db.prepare(
		`INSERT INTO offer (chain, name, brand, size, price, compare_price, category, member, valid_from, valid_to)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	await db.batch([
		db.prepare('DELETE FROM offer WHERE chain = ?').bind(chain),
		...offers.map((o) =>
			insert.bind(
				chain,
				o.name,
				o.brand,
				o.size,
				o.price,
				o.comparePrice,
				o.category,
				o.member ? 1 : 0,
				o.validFrom,
				o.validTo
			)
		),
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
