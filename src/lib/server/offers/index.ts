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
import { formatError, getText, isObject, OfferError, parseJson, type Offer } from './common';
import * as coop from './coop';
import { openInBrowser } from './coop-browser';
import * as ica from './ica';
import * as lidl from './lidl';
import * as willys from './willys';

/** How the chains' sites are reached: fetch for most, and a browser for Coop. */
export interface Sites {
	fetch: typeof fetch;
	openCoop: coop.OpenPage;
}

interface Source {
	/** How long to wait between asks, as the chain's robots.txt wants. */
	delayMs: number;
	searchStores?: (query: string, fetcher: typeof fetch) => Promise<StoreChoice[]>;
	fetchOffers: (
		storeId: string | null,
		sites: Sites
	) => Promise<{ offers: Offer[]; storeName?: string | null }>;
}

const SOURCES: Record<Chain, Source> = {
	ica: {
		delayMs: 0,
		searchStores: ica.searchStores,
		fetchOffers: (id, s) => ica.fetchOffers(id!, s.fetch)
	},
	willys: {
		delayMs: 10_000,
		searchStores: willys.searchStores,
		fetchOffers: async (id, s) => ({ offers: await willys.fetchOffers(id!, s.fetch) })
	},
	coop: {
		delayMs: 0,
		searchStores: coop.searchStores,
		fetchOffers: (id, s) => coop.fetchOffers(id!, s.openCoop)
	},
	lidl: { delayMs: 0, fetchOffers: async (_, s) => ({ offers: await lidl.fetchOffers(s.fetch) }) }
};

/** Whether the chain is on and has the store it needs. */
const ready = (chain: ChainRecord) => chain.enabled && (!hasStores(chain.chain) || !!chain.storeId);

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
	const search = SOURCES[chain].searchStores;
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
	sites: Sites,
	wait = (ms: number) => new Promise((done) => setTimeout(done, ms))
) {
	const record = await getChain(db, chain);
	const source = SOURCES[chain];
	if (!ready(record)) return;
	const since = record.requestedAt ? Date.now() - Date.parse(record.requestedAt) : Infinity;
	if (since < source.delayMs) await wait(source.delayMs - since);
	const now = new Date();
	await markRequested(db, chain, now);
	try {
		const { offers, storeName } = await source.fetchOffers(record.storeId, sites);
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
export async function fetchNextChain(db: D1Database, sites: Sites, now = new Date()) {
	const due = (await listChains(db))
		.filter((chain) => ready(chain) && isStale(chain, now))
		.sort((a, b) => (a.requestedAt ?? '').localeCompare(b.requestedAt ?? ''));
	if (due.length > 0) await fetchChain(db, due[0].chain, sites);
}

/**
 * The chains' real sites, or in the browser tests the made-up ones at OFFER_SITE_URL, asked with
 * the chain's host first in the path: https://www.ica.se/x becomes <siteUrl>/www.ica.se/x. There
 * a Coop store's page is no browser but JSON with what the page would have held.
 */
export function offerSites(env: Cloudflare.Env): Sites {
	const siteUrl = env.OFFER_SITE_URL;
	if (!siteUrl) return { fetch, openCoop: openInBrowser(env.BROWSER) };
	const fetcher: typeof fetch = (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input);
		return fetch(`${siteUrl}/${url.hostname}${url.pathname}${url.search}`, init);
	};
	return { fetch: fetcher, openCoop: openMadeUpPage(fetcher) };
}

/** Reads a made-up Coop page, { name, answer }, as openInBrowser() reads a real one. */
export const openMadeUpPage =
	(fetcher: typeof fetch): coop.OpenPage =>
	async (url) => {
		const page = parseJson(coop.LABEL, await getText(fetcher, coop.LABEL, url));
		if (!isObject(page)) throw formatError(coop.LABEL);
		return {
			name: typeof page.name === 'string' ? page.name : null,
			offers: coop.slimAnswer(JSON.stringify(page.answer))
		};
	};
