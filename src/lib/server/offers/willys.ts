// Willys: the store's offers as JSON from the address willys.se itself uses, and its stores from
// the store search there. See docs/beslut/0023-erbjudanden.md.
import type { StoreChoice } from '../../offers';
import { formatError, getText, isObject, parseJson, perUnit, tidy, type Offer } from './common';

const LABEL = 'Willys';
const ORIGIN = 'https://www.willys.se';

/** Willys's stores whose name or town matches the text. */
export async function searchStores(query: string, fetcher: typeof fetch): Promise<StoreChoice[]> {
	const url = `${ORIGIN}/axfood/rest/search/store?q=${encodeURIComponent(query)}`;
	const json = parseJson(LABEL, await getText(fetcher, LABEL, url));
	if (!isObject(json) || !Array.isArray(json.results)) throw formatError(LABEL);
	return json.results.filter(isObject).flatMap((store) => {
		const id = String(store.storeId ?? '');
		const name = tidy(store.displayName) || tidy(store.name);
		if (!/^\d+$/.test(id) || !name) return [];
		const address = isObject(store.address) ? store.address : {};
		const place = [tidy(address.line1), tidy(address.town)].filter(Boolean).join(', ');
		return [{ id, name, place }];
	});
}

/** The store's offers this week and the weeks ahead. */
export async function fetchOffers(storeId: string, fetcher: typeof fetch): Promise<Offer[]> {
	if (!/^\d+$/.test(storeId)) throw formatError(LABEL);
	const url = `${ORIGIN}/search/campaigns/offline?q=${storeId}&type=PERSONAL_GENERAL&page=0&size=500`;
	return parseOffers(parseJson(LABEL, await getText(fetcher, LABEL, url)));
}

/** The offers in Willys's answer. Throws when it is not shaped as expected. */
export function parseOffers(json: unknown): Offer[] {
	if (!isObject(json) || !Array.isArray(json.results)) throw formatError(LABEL);
	const offers = json.results.filter(isObject).flatMap((product): Offer[] => {
		const promotion = Array.isArray(product.potentialPromotions)
			? product.potentialPromotions.find(isObject)
			: undefined;
		const name = tidy(product.name);
		const reward = tidy(promotion?.rewardLabel);
		const validFrom = date(promotion?.startDate);
		const validTo = date(promotion?.endDate);
		if (!promotion || !name || !reward || !validTo) return [];
		const condition = tidy(promotion.conditionLabel);
		return [
			{
				name,
				brand: tidy(product.manufacturer),
				size: tidy(product.displayVolume),
				// "2 för" with "28,00" or "53 +pant", or "49,90/st" alone.
				price: condition
					? `${condition} ${amount(reward).replace(/^[\d,]+/, '$& kr')}`
					: perUnit(amount(reward)),
				comparePrice: perUnit(tidy(promotion.comparePrice)),
				category: '',
				member: promotion.campaignType === 'LOYALTY',
				validFrom,
				validTo
			}
		];
	});
	if (json.results.length > 0 && offers.length === 0) throw formatError(LABEL);
	return offers;
}

/** "28,00" as "28" and "9,90/st" as it is. */
const amount = (text: string) => text.replace(/,00\b/, '');

/** Willys writes dates as "26/10-2026". */
function date(text: unknown): string | null {
	const match = /^(\d{2})\/(\d{2})-(\d{4})$/.exec(tidy(text));
	return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
