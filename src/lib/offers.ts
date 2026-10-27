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

/** The offer a dish was chosen for, kept as it was when chosen. */
export interface ChosenOffer {
	chain: Chain;
	name: string;
	/** As the chain puts it: "89 kr/kg", "2 för 40 kr". */
	price: string;
	member: boolean;
	/** The last day, in Sweden, YYYY-MM-DD. */
	validTo: string;
}

/** The offer in a value sent back from the browser, made anew, or null when it is none. */
export function offerOf(value: unknown): ChosenOffer | null {
	if (typeof value !== 'object' || value === null) return null;
	const { chain, name, price, member, validTo } = value as Record<string, unknown>;
	const text = (t: unknown, max: number): t is string => typeof t === 'string' && t.length <= max;
	if (!isChain(chain) || !text(name, 200) || !text(price, 100) || typeof member !== 'boolean')
		return null;
	if (!text(validTo, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(validTo)) return null;
	return { chain, name, price, member, validTo };
}

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
