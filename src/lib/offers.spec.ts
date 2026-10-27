import { describe, expect, it } from 'vitest';
import { fetchedText, hasStores, isChain } from './offers';

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
