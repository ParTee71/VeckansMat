// ICA: each store's offers page on ica.se carries them as data for the page's own script, and the
// stores are listed in ica.se's sitemap. See docs/beslut/0023-erbjudanden.md.
import { nameKey } from '../../names';
import type { StoreChoice } from '../../offers';
import { formatError, getText, isObject, OfferError, perUnit, tidy, type Offer } from './common';

const LABEL = 'ICA';
const ORIGIN = 'https://www.ica.se';
const MAX_STORES = 30;

/** A store's page name, such as "ica-kvantum-exempelby-1001234", which ends in its number. */
const isStoreId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.test(id);

/** ICA's stores whose name or town matches the text. */
export async function searchStores(query: string, fetcher: typeof fetch): Promise<StoreChoice[]> {
	// The list of every store changes seldom, so Cloudflare may keep it for a day.
	const sitemap = await getText(fetcher, LABEL, `${ORIGIN}/butiker/sitemap.xml`, {
		cf: { cacheTtl: 86_400, cacheEverything: true }
	});
	const stores = [
		...sitemap.matchAll(
			/<loc>https:\/\/www\.ica\.se\/butiker\/[a-z0-9-]+\/([a-z0-9-]+)\/([a-z0-9-]+-\d+)\/<\/loc>/g
		)
	];
	if (stores.length === 0) throw formatError(LABEL);
	// Store pages are named without å, ä and ö, so the search is too.
	const words = slug(query).split('-').filter(Boolean);
	return stores
		.filter(([, town, id]) => words.every((word) => `${town}-${id}`.includes(word)))
		.slice(0, MAX_STORES)
		.map(([, town, id]) => ({ id, name: titled(id.replace(/-\d+$/, '')), place: titled(town) }));
}

/** The store's offers this week and the weeks ahead, and the store's name as ICA writes it. */
export async function fetchOffers(
	storeId: string,
	fetcher: typeof fetch
): Promise<{ offers: Offer[]; storeName: string | null }> {
	if (!isStoreId(storeId)) throw formatError(LABEL);
	const page = await getText(fetcher, LABEL, `${ORIGIN}/erbjudanden/${storeId}/`);
	return parseOffers(page);
}

/**
 * The offers on a store's page. The page's data is a script, not JSON, so only the list of
 * offers is cut out of it, from its key to the key after it, and read as JSON.
 */
export function parseOffers(page: string): { offers: Offer[]; storeName: string | null } {
	const key = '"weeklyOffers":';
	const start = page.indexOf(key);
	const end = page.indexOf(',"compensationOffersStatus"', start);
	if (start < 0 || end < 0) throw formatError(LABEL);
	let list: unknown;
	try {
		// The script writes undefined where JSON has null.
		list = JSON.parse(
			page.slice(start + key.length, end).replace(/(?<=[:,[])undefined(?=[,\]}])/g, 'null')
		);
	} catch {
		throw formatError(LABEL);
	}
	if (!Array.isArray(list)) throw formatError(LABEL);
	let storeName: string | null = null;
	const offers = list.filter(isObject).flatMap((offer): Offer[] => {
		const details = isObject(offer.details) ? offer.details : {};
		const name = tidy(details.name);
		const price = tidy(details.mechanicInfo);
		const validTo = /^\d{4}-\d{2}-\d{2}/.exec(tidy(offer.validTo))?.[0];
		if (!name || !price || !validTo) return [];
		const store = Array.isArray(offer.stores) ? offer.stores.find(isObject) : undefined;
		storeName ??= tidy(store?.storeMarketingName) || null;
		return [
			{
				name,
				brand: tidy(details.brand),
				size: tidy(details.packageInformation),
				price,
				comparePrice: perUnit(tidy(offer.comparisonPrice)),
				category: isObject(offer.category) ? tidy(offer.category.articleGroupName) : '',
				member: Array.isArray(offer.traits) && offer.traits.includes('Stammis'),
				validFrom: null,
				validTo
			}
		];
	});
	if (offers.length === 0) {
		throw list.length === 0
			? new OfferError('ICA visade inga erbjudanden för butiken.')
			: formatError(LABEL);
	}
	return { offers, storeName };
}

/** The text as ICA names its pages: small letters without å, ä and ö, words joined by "-". */
const slug = (text: string) =>
	nameKey(text)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-');

/** "ica-kvantum-exempelby" as "ICA Kvantum Exempelby", until the store's page gives its name. */
const titled = (text: string) =>
	text
		.split('-')
		.map((word) => (word === 'ica' ? 'ICA' : word.charAt(0).toUpperCase() + word.slice(1)))
		.join(' ');
