// Coop: a store's page on coop.se loads its offers in the browser, so the page is opened in
// Cloudflare's Browser Rendering (coop-browser.ts) and the answer the page itself gets is read.
// The stores are listed in coop.se's sitemap. See docs/beslut/0023-erbjudanden.md.
import type { StoreChoice } from '../../offers';
import {
	formatError,
	getText,
	isObject,
	kronor,
	OfferError,
	perUnit,
	slug,
	tidy,
	titled,
	type Offer
} from './common';

export const LABEL = 'Coop';
const ORIGIN = 'https://www.coop.se';
const MAX_STORES = 30;

/** What a store's page gave in the browser: its heading and its offers, made smaller. */
export interface CoopPage {
	name: string | null;
	offers: unknown;
}

/** Opens the page at the address and reads it. */
export type OpenPage = (url: string) => Promise<CoopPage>;

/** A store's page name, such as "stora-coop/stora-coop-exempelby": its kind and its own name. */
const isStoreId = (id: string) => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(id);

/** The address of the store's page. */
export const storePage = (storeId: string) => `${ORIGIN}/butiker-erbjudanden/${storeId}/`;

/** Coop's stores whose name matches the text. */
export async function searchStores(query: string, fetcher: typeof fetch): Promise<StoreChoice[]> {
	// The list of every page changes seldom, so Cloudflare may keep it for a day.
	const sitemap = await getText(fetcher, LABEL, `${ORIGIN}/sitemap_pages.xml`, {
		cf: { cacheTtl: 86_400, cacheEverything: true }
	});
	const stores = [
		...sitemap.matchAll(
			/<loc>https:\/\/www\.coop\.se\/butiker-erbjudanden\/([a-z0-9-]+\/([a-z0-9-]+))\/<\/loc>/g
		)
	];
	if (stores.length === 0) throw formatError(LABEL);
	// Store pages are named without å, ä and ö, so the search is too.
	const words = slug(query).split('-').filter(Boolean);
	return stores
		.filter(([, , name]) => words.every((word) => name.includes(word)))
		.slice(0, MAX_STORES)
		.map(([, id, name]) => ({ id, name: titled(name), place: '' }));
}

/** The store's offers this week, and the store's name as its page writes it. */
export async function fetchOffers(
	storeId: string,
	open: OpenPage
): Promise<{ offers: Offer[]; storeName: string | null }> {
	if (!isStoreId(storeId)) throw formatError(LABEL);
	const page = await open(storePage(storeId));
	return { offers: parseOffers(page.offers), storeName: tidy(page.name) || null };
}

/**
 * Coop's answer made small enough to send from the browser: each offer once, without the products
 * it covers, and with the name of the group it is sorted under. Null when it is not Coop's answer.
 *
 * Runs in the browser from its source text, so it must use nothing outside itself and must not
 * define functions inside itself, which the bundler would name with a helper the page lacks.
 */
export function slimAnswer(text: string): unknown {
	try {
		const offers = new Map<unknown, Record<string, unknown>>();
		for (const group of JSON.parse(text).sortingGroups) {
			for (const offer of group.offers ?? []) {
				const kept = offers.get(offer.id) ?? offer;
				delete kept.clusterInteriorOffers;
				if (group.id !== 'alla') kept.group ??= group.name;
				offers.set(offer.id, kept);
			}
		}
		return [...offers.values()];
	} catch {
		return null;
	}
}

/** The offers as slimAnswer() leaves them. Throws when they are not shaped as expected. */
export function parseOffers(list: unknown): Offer[] {
	if (!Array.isArray(list)) throw formatError(LABEL);
	const offers = list.filter(isObject).flatMap((offer): Offer[] => {
		const content = isObject(offer.content) ? offer.content : {};
		const deal = isObject(offer.priceInformation) ? offer.priceInformation : {};
		const name = tidy(content.title);
		const price = priceText(deal);
		const validTo = day(offer.campaignEndDate);
		if (!name || !price || !validTo) return [];
		return [
			{
				name,
				// Coop writes "." for a product without a brand, such as loose sweets.
				brand: /[\p{L}\d]/u.test(tidy(content.brand)) ? tidy(content.brand) : '',
				size: withoutStop(content.amountInformation),
				price,
				comparePrice: perUnit(withoutStop(content.comparativePriceText)),
				category:
					tidy(offer.group) || (isObject(offer.categoryTeam) ? tidy(offer.categoryTeam.name) : ''),
				member: deal.isMemberPrice === true,
				validFrom: day(offer.campaignStartDate),
				validTo
			}
		];
	});
	if (offers.length === 0) {
		throw list.length === 0
			? new OfferError('Coop visade inga erbjudanden för butiken.')
			: formatError(LABEL);
	}
	return offers;
}

/**
 * The price as Coop shows it: "139 kr/kg", "3 för 20 kr", "25 % rabatt", or the steps of a deal
 * that gets cheaper the more is bought. Empty when it is written some other way.
 */
function priceText(deal: Record<string, unknown>): string {
	if (Array.isArray(deal.steps)) {
		return deal.steps
			.filter(isObject)
			.map((step) => priceText(step))
			.filter(Boolean)
			.join(', ');
	}
	const value = deal.discountValue;
	if (typeof value !== 'number') return '';
	if (deal.isPercentageDiscount === true) return `${kronor(value)} % rabatt`;
	const quantity = typeof deal.quantity === 'number' ? deal.quantity : 1;
	if (quantity > 1) return `${quantity} för ${kronor(value)} kr`;
	const unit = tidy(deal.unit);
	return unit && unit !== 'st' ? `${kronor(value)} kr/${unit}` : `${kronor(value)} kr`;
}

/** "2026-10-26T00:00:00" as "2026-10-26". */
const day = (text: unknown) => /^\d{4}-\d{2}-\d{2}/.exec(tidy(text))?.[0] ?? null;

/** Coop ends its sizes with a full stop: "500 g.". */
const withoutStop = (text: unknown) => tidy(text).replace(/\.$/, '');
