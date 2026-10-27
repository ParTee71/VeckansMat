// Lidl: the same offers in every store, on campaign pages linked from lidl.se under "Den här
// veckan", with each product as data on the page. See docs/beslut/0023-erbjudanden.md.
import { swedishToday } from '../../weeks';
import { formatError, getText, isObject, kronor, tidy, type Offer } from './common';

const LABEL = 'Lidl';
const ORIGIN = 'https://www.lidl.se';
const SECTION = 'Den här veckan';
// Campaign pages with no food, which are not fetched.
const NOT_FOOD = [
	'veckans-blommor',
	'mode-accessoarer',
	'koek-hushall',
	'hem-inredning',
	'baby-barn-leksaker',
	'sport-fritid',
	'verktyg-traedgard'
];
const FOOD = 'Mat och nära mat/';

/** This week's food offers, from each of the week's campaign pages in turn. */
export async function fetchOffers(fetcher: typeof fetch): Promise<Offer[]> {
	const pages = campaignPages(await getText(fetcher, LABEL, `${ORIGIN}/`));
	if (pages.length === 0) throw formatError(LABEL);
	const offers = new Map<string, Offer>();
	for (const page of pages) {
		const html = await getText(fetcher, LABEL, `${ORIGIN}${page}`);
		// A product on two campaign pages is kept once.
		for (const [id, offer] of parseProducts(html)) if (!offers.has(id)) offers.set(id, offer);
	}
	if (offers.size === 0) throw formatError(LABEL);
	return [...offers.values()];
}

/** The addresses of this week's campaign pages with food, such as "/c/mandag-soendag/a10105406". */
export function campaignPages(html: string): string[] {
	const pages = new Set<string>();
	for (const [, path, slugName, click] of html.matchAll(
		/href="(\/c\/([a-z0-9-]+)\/a\d+)"[^>]*?data-unified-click="([^"]+)"/g
	)) {
		if (NOT_FOOD.includes(slugName)) continue;
		let section: unknown;
		try {
			section = JSON.parse(decodeURIComponent(unentity(click))).sectionName;
		} catch {
			continue;
		}
		if (section === SECTION) pages.add(path);
	}
	return [...pages];
}

/** The food on a campaign page, by Lidl's product id. */
export function parseProducts(html: string): [string, Offer][] {
	return [...html.matchAll(/data-grid-data="([^"]+)"/g)].flatMap(([, data]): [string, Offer][] => {
		let product: unknown;
		try {
			product = JSON.parse(unentity(data));
		} catch {
			return [];
		}
		if (!isObject(product)) return [];
		const keyfacts = isObject(product.keyfacts) ? product.keyfacts : {};
		const category = tidy(keyfacts.wonCategoryPrimary);
		const name = tidy(product.fullTitle) || tidy(product.title);
		const end = Number(product.storeEndDate);
		const start = Number(product.storeStartDate);
		const price = priceOf(product);
		if (!category.includes(FOOD) || !name || !end || !price) return [];
		return [
			[
				String(product.productId ?? name),
				{
					name,
					brand: isObject(product.brand) ? tidy(product.brand.name) : '',
					...price,
					category: category.split(FOOD)[1].split('/')[0],
					validFrom: start ? swedishToday(new Date(start * 1000)) : null,
					validTo: swedishToday(new Date(end * 1000))
				}
			]
		];
	});
}

type Price = Pick<Offer, 'price' | 'size' | 'comparePrice' | 'member'>;

/** The price for everyone, or else the one with Lidl Plus. */
function priceOf(product: Record<string, unknown>): Price | null {
	const plus =
		Array.isArray(product.lidlPlus) && isObject(product.lidlPlus[0])
			? product.lidlPlus[0].price
			: null;
	for (const [price, member] of [
		[product.price, false],
		[plus, true]
	] as const) {
		if (!isObject(price) || typeof price.price !== 'number') continue;
		const packaging = isObject(price.packaging) ? tidy(price.packaging.text) : '';
		const base = isObject(price.basePrice) ? tidy(price.basePrice.text) : '';
		// A price by weight comes as "/kg (ca 1,2 kg)", with the package's weight inside.
		const byWeight = /^\/(\S+)\s*\(([^)]*)\)$/.exec(base) ?? /^\/(\S+)$/.exec(base);
		return byWeight
			? {
					price: `${kronor(price.price)} kr/${byWeight[1]}`,
					size: byWeight[2] ?? packaging,
					comparePrice: '',
					member
				}
			: { price: `${kronor(price.price)} kr`, size: packaging, comparePrice: base, member };
	}
	return null;
}

/** An attribute's text with the characters HTML writes as entities, such as &quot;, put back. */
function unentity(text: string): string {
	const named: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" };
	return text.replace(/&(#x[\da-f]+|#\d+|quot|amp|lt|gt|apos);/gi, (entity, code: string) => {
		if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
		return String.fromCodePoint(
			code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
		);
	});
}
