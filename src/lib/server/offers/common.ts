// What every chain's fetcher shares: the shape of an offer, how the chains are asked, and how
// their numbers, dates and page names are written. See docs/beslut/0023-erbjudanden.md.
import { nameKey } from '../../names';

export interface Offer {
	name: string;
	brand: string;
	size: string;
	/** As the chain puts it: "89 kr/kg", "2 för 40 kr". */
	price: string;
	comparePrice: string;
	category: string;
	/** Only for members, such as Stammis, Willys Plus or Lidl Plus. */
	member: boolean;
	/** Dates in Sweden, YYYY-MM-DD, both days included. Null when the chain does not say. */
	validFrom: string | null;
	validTo: string;
}

/** A fetch that failed, with a reason in Swedish to show in Hushållet. */
export class OfferError extends Error {}

/** Says who is asking, so the chains can see it is one household's app and not a browser. */
// ASCII only: a header is sent as bytes, and an å became a byte one chain could not read.
const USER_AGENT = 'VeckansMat/1 (private household app; +https://github.com/ParTee71/VeckansMat)';
const TIMEOUT_MS = 15_000;

/**
 * The page or JSON at the address, as text. Throws an OfferError with the chain's name when the
 * chain does not answer or answers with an error.
 */
export async function getText(
	fetcher: typeof fetch,
	label: string,
	url: string,
	init: RequestInit = {}
): Promise<string> {
	let response: Response;
	try {
		response = await fetcher(url, {
			...init,
			headers: { 'user-agent': USER_AGENT, 'accept-language': 'sv-SE' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch {
		throw new OfferError(`${label} svarade inte.`);
	}
	if (!response.ok) {
		await response.body?.cancel();
		throw new OfferError(`${label} svarade med fel ${response.status}.`);
	}
	return response.text();
}

/** The JSON in the text, or an OfferError saying the chain answered with something else. */
export function parseJson(label: string, text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		throw formatError(label);
	}
}

export const formatError = (label: string) =>
	new OfferError(`${label} svarade i ett format appen inte känner igen.`);

/** A price as written in Sweden: 129 as "129" and 34.9 as "34,90". */
export const kronor = (n: number) =>
	Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');

/** Text from the chain without the space and line breaks around and inside it. */
export const tidy = (text: unknown) =>
	typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';

/** "/kg" or "kr/kg" as "kr/kg", and "112:38/kg" as "112,38 kr/kg", as the chains' units vary. */
export function perUnit(text: string): string {
	const tidied = tidy(text).replace(/(\d):(\d)/g, '$1,$2');
	if (!tidied || /^\/?inget$/i.test(tidied)) return '';
	return tidied.replace(/^(\d[\d,-]*)\s*(?:kr)?\s*\//, '$1 kr/');
}

/** Whether the value is an object, to read its fields from. */
export const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

/** The text as ICA and Coop name their pages: small letters without å, ä and ö, joined by "-". */
export const slug = (text: string) =>
	nameKey(text)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-');

/** A page name such as "ica-kvantum-exempelby" as "ICA Kvantum Exempelby", for a store's name. */
export const titled = (text: string) =>
	text
		.split('-')
		.map((word) => (word === 'ica' ? 'ICA' : word.charAt(0).toUpperCase() + word.slice(1)))
		.join(' ');
