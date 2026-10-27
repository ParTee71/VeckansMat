import { describe, expect, it } from 'vitest';
import { fetchedText, hasStores, isChain, offerOf, offerText } from './offers';

describe('offers', () => {
	it('tell when they were fetched in Swedish time', () => {
		const now = new Date('2026-10-27T15:00:00Z');
		expect(fetchedText('2026-10-27T05:02:00Z', now)).toBe('i dag 06:02');
		expect(fetchedText('2026-10-26T05:02:00Z', now)).toBe('mån 26 okt 06:02');
		// Late in the evening in UTC is already the next day in Sweden.
		expect(fetchedText('2026-10-26T23:30:00Z', now)).toBe('i dag 00:30');
	});

	it('know the chains, and that Lidl has no stores to choose', () => {
		expect(isChain('willys')).toBe(true);
		expect(isChain('hemköp')).toBe(false);
		expect(hasStores('lidl')).toBe(false);
		expect(hasStores('ica')).toBe(true);
	});
});

describe('an offer sent back from the browser', () => {
	const offer = {
		chain: 'coop',
		name: 'Nötfärs',
		price: '109 kr/kg',
		member: true,
		validTo: '2026-11-01'
	};

	it('is made anew from what it should hold, and nothing else', () => {
		expect(offerOf({ ...offer, extra: 'x' })).toEqual(offer);
		expect(offerOf(null)).toBeNull();
		expect(offerOf({ ...offer, chain: 'hemköp' })).toBeNull();
		expect(offerOf({ ...offer, member: 'ja' })).toBeNull();
		expect(offerOf({ ...offer, validTo: '1 nov' })).toBeNull();
		expect(offerOf({ ...offer, name: 'x'.repeat(201) })).toBeNull();
	});
});

describe('an offer under a dish', () => {
	it('names the product, the price and the chain', () => {
		expect(
			offerText({
				chain: 'willys',
				name: 'Laxfilé',
				price: '129 kr/kg',
				member: false,
				validTo: '2026-11-01'
			})
		).toBe('Laxfilé 129 kr/kg · Willys');
	});
});
