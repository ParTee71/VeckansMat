import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../../../../test/d1';
import { siteFetch } from '../../../../test/offer-sites.mjs';
import {
	getChain,
	listChains,
	listOffers,
	markRequested,
	saveOffers,
	setChainEnabled,
	setChainStore
} from '../db/offers';
import { fetchChain, fetchNextChain, isStale, searchStores } from './index';

let db: D1Database;
useTestDb((test) => (db = test));

afterEach(() => vi.restoreAllMocks());

const MONDAY_MORNING = new Date('2026-10-26T05:00:00Z');

describe('fetching a chain', () => {
	it("saves the offers and the store's name, and replaces them on the next fetch", async () => {
		await setChainStore(db, 'ica', 'ica-supermarket-exempelby-1000001', 'ICA Supermarket Exempelb');
		await fetchChain(db, 'ica', siteFetch());
		const chain = await getChain(db, 'ica');
		expect(chain).toMatchObject({
			enabled: true,
			storeName: 'ICA Supermarket Exempelby',
			error: null,
			offers: 2
		});
		expect(chain.fetchedAt).not.toBeNull();

		await fetchChain(db, 'ica', siteFetch());
		expect((await listOffers(db, 'ica')).map((o) => o.name)).toEqual(['Fläskfilé', 'Gul lök']);
	});

	it("saves a large store's offers in one go", async () => {
		const offer = (i: number) => ({
			name: `Vara ${i} med "citat" och å`,
			brand: 'Exempel',
			size: '1 kg',
			price: `${i} kr`,
			comparePrice: '',
			category: '',
			member: i % 2 === 0,
			validFrom: null,
			validTo: '2026-11-01'
		});
		const offers = Array.from({ length: 600 }, (_, i) => offer(i));
		await saveOffers(db, 'willys', offers, MONDAY_MORNING);
		const saved = await listOffers(db, 'willys');
		expect(saved).toHaveLength(600);
		expect(saved).toContainEqual(offer(42));
	});

	it('keeps the last offers and notes why when a fetch fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await setChainEnabled(db, 'lidl', true);
		await fetchChain(db, 'lidl', siteFetch());
		await fetchChain(
			db,
			'lidl',
			siteFetch(() => new Response('', { status: 503 }))
		);
		expect(await getChain(db, 'lidl')).toMatchObject({
			error: 'Lidl svarade med fel 503.',
			offers: 3
		});

		// A fault that is not the chain's is told in general terms.
		await fetchChain(db, 'lidl', () => Promise.reject(new TypeError('x')) as never);
		expect((await getChain(db, 'lidl')).error).toBe('Lidl svarade inte.');
	});

	it('does nothing for a chain that is off, lacks a store or cannot be fetched yet', async () => {
		const fetcher = siteFetch();
		await fetchChain(db, 'lidl', fetcher);
		await setChainEnabled(db, 'willys', true);
		await fetchChain(db, 'willys', fetcher);
		await setChainStore(db, 'coop', '1', 'Coop Exempelby');
		await fetchChain(db, 'coop', fetcher);
		expect(fetcher.asked).toEqual([]);
	});

	it('waits ten seconds after the last ask to Willys, as its robots.txt asks', async () => {
		await setChainStore(db, 'willys', '9001', 'Willys Exempelstad Centrum');
		await markRequested(db, 'willys', new Date(Date.now() - 4_000));
		const fetcher = siteFetch();
		const waits: number[] = [];
		await fetchChain(db, 'willys', fetcher, async (ms) => {
			expect(fetcher.asked).toEqual([]);
			waits.push(ms);
		});
		expect(waits).toHaveLength(1);
		expect(waits[0]).toBeGreaterThan(5_000);
		expect(waits[0]).toBeLessThanOrEqual(6_000);
		expect((await getChain(db, 'willys')).offers).toBe(3);

		// Lidl asks for no wait.
		await setChainEnabled(db, 'lidl', true);
		await fetchChain(db, 'lidl', siteFetch(), async () => waits.push(0));
		expect(waits).toHaveLength(1);
	});
});

describe('the Monday fetch', () => {
	it('fetches one chain each run, the one asked longest ago, and tries a failed one again', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await setChainStore(db, 'ica', 'ica-supermarket-exempelby-1000001', 'ICA Exempelby');
		await setChainEnabled(db, 'lidl', true);
		await markRequested(db, 'ica', new Date('2026-10-19T05:00:00Z'));
		await markRequested(db, 'lidl', new Date('2026-10-20T05:00:00Z'));
		const down = siteFetch((url) =>
			url.includes('ica.se') ? new Response('', { status: 500 }) : undefined
		);

		await fetchNextChain(db, down, MONDAY_MORNING);
		expect((await getChain(db, 'lidl')).offers).toBe(0);
		expect((await getChain(db, 'ica')).error).toBe('ICA svarade med fel 500.');

		await fetchNextChain(db, down, MONDAY_MORNING);
		expect((await getChain(db, 'lidl')).offers).toBe(3);

		const fetcher = siteFetch();
		await fetchNextChain(db, fetcher, MONDAY_MORNING);
		expect((await getChain(db, 'ica')).offers).toBe(2);
		expect(await isStaleNow('ica')).toBe(false);

		// Both are fetched this week, so the runs left on Monday ask nothing.
		await fetchNextChain(db, fetcher, MONDAY_MORNING);
		expect(fetcher.asked).toHaveLength(1);
	});

	it('counts the week from Monday in Sweden', () => {
		const chain = { fetchedAt: '2026-10-25T21:59:00Z' } as never;
		expect(isStale(chain, MONDAY_MORNING)).toBe(true);
		expect(isStale({ fetchedAt: '2026-10-26T00:00:00Z' } as never, MONDAY_MORNING)).toBe(false);
		expect(isStale({ fetchedAt: null } as never, MONDAY_MORNING)).toBe(true);
	});
});

describe('searching for stores', () => {
	it("asks the chain's own search and notes the ask", async () => {
		const stores = await searchStores(db, 'willys', 'exempelby', siteFetch(), MONDAY_MORNING);
		expect(stores).toEqual([{ id: '9002', name: 'Willys Exempelby', place: 'Exempelby' }]);
		expect((await getChain(db, 'willys')).requestedAt).toBe(MONDAY_MORNING.toISOString());
		expect(await searchStores(db, 'lidl', 'exempelby', siteFetch())).toEqual([]);
	});

	it('lists every chain in the order Hushållet shows them', async () => {
		expect((await listChains(db)).map((c) => c.chain)).toEqual(['ica', 'willys', 'coop', 'lidl']);
	});
});

async function isStaleNow(chain: 'ica') {
	return isStale(await getChain(db, chain), MONDAY_MORNING);
}
