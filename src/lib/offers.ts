// The chains whose offers can be fetched, shared by the browser and the server.
// See docs/beslut/0023-erbjudanden.md.

export const CHAINS = [
	{ key: 'ica', label: 'ICA' },
	{ key: 'willys', label: 'Willys' },
	{ key: 'coop', label: 'Coop' },
	{ key: 'lidl', label: 'Lidl' }
] as const;

export type Chain = (typeof CHAINS)[number]['key'];

export const isChain = (text: unknown): text is Chain => CHAINS.some((c) => c.key === text);

export const chainLabel = (chain: Chain) => CHAINS.find((c) => c.key === chain)!.label;

/** Lidl has the same offers in every store, so no store is chosen there. */
export const hasStores = (chain: Chain) => chain !== 'lidl';

/** A store found when searching, to choose from. */
export interface StoreChoice {
	id: string;
	name: string;
	/** Where it is, as the chain gives it; shown when choosing and never saved. */
	place: string;
}

/** A chain as Hushållet shows it. */
export interface ChainState {
	chain: Chain;
	enabled: boolean;
	storeId: string | null;
	storeName: string | null;
	/** When the last fetch that worked was made, as an ISO time. */
	fetchedAt: string | null;
	/** Why the last fetch failed, or null when it worked. */
	error: string | null;
	/** How many offers the last fetch that worked gave. */
	offers: number;
	/** Whether the app can fetch from the chain yet. Coop comes in #108. */
	available: boolean;
}

/** When offers were fetched, as "i dag 06:02" or "mån 26 okt 06:02", in Swedish time. */
export function fetchedText(iso: string, now = new Date()): string {
	const zone = { timeZone: 'Europe/Stockholm' } as const;
	const time = new Date(iso);
	const clock = time.toLocaleTimeString('sv-SE', { ...zone, hour: '2-digit', minute: '2-digit' });
	const day = (d: Date) => d.toLocaleDateString('sv-SE', zone);
	if (day(time) === day(now)) return `i dag ${clock}`;
	const date = time.toLocaleDateString('sv-SE', {
		...zone,
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
	return `${date.replaceAll('.', '')} ${clock}`;
}
