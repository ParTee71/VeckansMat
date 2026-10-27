// Fetches the chains' offers: every Monday morning one chain at a time, and at once when the
// household chooses a store. A chain that fails never stops the others.
// See docs/beslut/0023-erbjudanden.md.
import { hasStores, type Chain, type StoreChoice } from '../../offers';
import { mondayOf, swedishToday } from '../../weeks';
import {
	getChain,
	listChains,
	markRequested,
	saveFetchError,
	saveOffers,
	type ChainRecord
} from '../db/offers';
import { OfferError, type Offer } from './common';
import * as ica from './ica';
import * as lidl from './lidl';
import * as willys from './willys';

interface Source {
	/** How long to wait between asks, as the chain's robots.txt wants. */
	delayMs: number;
	searchStores?: (query: string, fetcher: typeof fetch) => Promise<StoreChoice[]>;
	fetchOffers: (
		storeId: string | null,
		fetcher: typeof fetch
	) => Promise<{ offers: Offer[]; storeName?: string | null }>;
}

// Coop comes in #108.
const SOURCES: Partial<Record<Chain, Source>> = {
	ica: {
		delayMs: 0,
		searchStores: ica.searchStores,
		fetchOffers: (id, f) => ica.fetchOffers(id!, f)
	},
	willys: {
		delayMs: 10_000,
		searchStores: willys.searchStores,
		fetchOffers: async (id, f) => ({ offers: await willys.fetchOffers(id!, f) })
	},
	lidl: { delayMs: 0, fetchOffers: async (_, f) => ({ offers: await lidl.fetchOffers(f) }) }
};

export const isAvailable = (chain: Chain) => chain in SOURCES;

/** Whether the chain is on, can be fetched from and has the store it needs. */
const ready = (chain: ChainRecord) =>
	chain.enabled && isAvailable(chain.chain) && (!hasStores(chain.chain) || !!chain.storeId);

/**
 * Whether the chain's offers are from before this week: the Monday is Sweden's, counted from
 * midnight UTC. A fetch in the first hour or two of Monday in Sweden is thus fetched again.
 */
export const isStale = (chain: ChainRecord, now: Date) =>
	!chain.fetchedAt || chain.fetchedAt < `${mondayOf(swedishToday(now))}T00:00:00Z`;

/** The chain's stores that match the text, searched for the household on the chain's own site. */
export async function searchStores(
	db: D1Database,
	chain: Chain,
	query: string,
	fetcher: typeof fetch,
	now = new Date()
): Promise<StoreChoice[]> {
	const search = SOURCES[chain]?.searchStores;
	if (!search) return [];
	await markRequested(db, chain, now);
	// A store listed twice is shown once.
	const stores = await search(query, fetcher);
	return stores.filter((store, i) => stores.findIndex((s) => s.id === store.id) === i);
}

/**
 * Fetches the chain's offers when it is ready, and saves them or why it failed. Waits first if the
 * chain was asked something too short a time ago.
 */
export async function fetchChain(
	db: D1Database,
	chain: Chain,
	fetcher: typeof fetch,
	wait = (ms: number) => new Promise((done) => setTimeout(done, ms))
) {
	const record = await getChain(db, chain);
	const source = SOURCES[chain];
	if (!source || !ready(record)) return;
	const since = record.requestedAt ? Date.now() - Date.parse(record.requestedAt) : Infinity;
	if (since < source.delayMs) await wait(source.delayMs - since);
	const now = new Date();
	await markRequested(db, chain, now);
	try {
		const { offers, storeName } = await source.fetchOffers(record.storeId, fetcher);
		await saveOffers(db, chain, offers, now, storeName);
	} catch (e) {
		console.error(`Offers from ${chain} failed`, e);
		await saveFetchError(
			db,
			chain,
			e instanceof OfferError ? e.message : 'Något gick fel när erbjudandena hämtades.'
		);
	}
}

/**
 * Fetches the one chain most in need of it: on, ready, with offers from before this week, and
 * asked the longest time ago. The cron runs several times on Monday morning, so each chain gets
 * its own run, and one that failed is tried again.
 */
export async function fetchNextChain(db: D1Database, fetcher: typeof fetch, now = new Date()) {
	const due = (await listChains(db))
		.filter((chain) => ready(chain) && isStale(chain, now))
		.sort((a, b) => (a.requestedAt ?? '').localeCompare(b.requestedAt ?? ''));
	if (due.length > 0) await fetchChain(db, due[0].chain, fetcher);
}

/**
 * fetch, or in the browser tests one that asks the made-up chain sites at `siteUrl` instead, with
 * the chain's host first in the path: https://www.ica.se/x becomes <siteUrl>/www.ica.se/x.
 */
export function offerFetch(siteUrl?: string): typeof fetch {
	if (!siteUrl) return fetch;
	return (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input);
		return fetch(`${siteUrl}/${url.hostname}${url.pathname}${url.search}`, init);
	};
}
