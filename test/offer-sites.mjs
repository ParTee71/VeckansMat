// Made-up chain sites for the tests, in the shapes Willys, ICA and Lidl answer with, cut down to
// what the app reads. Every store and product here is made up. The unit tests read the parts, and
// the browser tests' stand-in site (e2e-recipe-site.mjs) serves them by address.

const willysProduct = (name, manufacturer, displayVolume, promotion) => ({
	name,
	manufacturer,
	displayVolume,
	potentialPromotions: promotion
		? [{ startDate: '26/10-2026', endDate: '01/11-2026', campaignType: 'GENERAL', ...promotion }]
		: []
});

export const willysStores = {
	results: [
		{
			storeId: '9001',
			displayName: 'Willys Exempelstad Centrum',
			address: { line1: 'Storgatan 1', town: 'Exempelstad' }
		},
		{ storeId: '9002', name: 'Willys Exempelby', address: { line1: null, town: 'Exempelby' } }
	]
};

export const willysOffers = {
	results: [
		willysProduct('Kycklingfilé', 'EXEMPELGÅRDEN', '900g', {
			rewardLabel: '89,90/st',
			comparePrice: '99:89 kr/kg'
		}),
		willysProduct('Krossade tomater', 'EXEMPEL', '400g', {
			conditionLabel: '3 för',
			rewardLabel: '25,00',
			comparePrice: '20:83 kr/kg',
			campaignType: 'LOYALTY',
			endDate: '08/11-2026'
		}),
		willysProduct('Läsk', 'EXEMPELBRYGGERIET', '1,5l', {
			conditionLabel: '2 för',
			rewardLabel: '30 +pant',
			comparePrice: '10:00 kr/l +pant'
		}),
		// Not on offer, as when the list has a product without a promotion.
		willysProduct('Havregryn', 'EXEMPEL', '1kg', null)
	],
	pagination: { numberOfPages: 1, totalNumberOfResults: 4 }
};

const icaStores = [
	['supermarket', 'exempelby', 'ica-supermarket-exempelby-1000001'],
	['maxi', 'exempelstad', 'maxi-ica-stormarknad-exempelstad-1000002'],
	['nara', 'ostra-exempelstad', 'ica-nara-angen-1000003']
];

export const icaSitemap = `<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${icaStores
	.map(
		([format, town, id]) =>
			`<url><loc>https://www.ica.se/butiker/${format}/${town}/${id}/</loc></url><url><loc>https://www.ica.se/butiker/${format}/${town}/${id}/tjanster/catering/</loc></url>`
	)
	.join('')}</urlset>`;

const icaOffer = (name, mechanicInfo, extra = {}) => ({
	id: name,
	details: { brand: 'Exempel', name, packageInformation: '500 g', mechanicInfo },
	category: { articleGroupName: 'Färskvaror' },
	validTo: '2026-11-01T00:00:00',
	comparisonPrice: '',
	stores: [{ storeMarketingName: 'ICA Supermarket Exempelby', regularPrice: '59,90' }],
	traits: ['Butiksunikt'],
	...extra
});

export const icaOffers = [
	icaOffer('Fläskfilé', '89 kr/kg', { traits: ['Butiksunikt', 'Stammis'] }),
	icaOffer('Gul lök', '2 för 30 kr', {
		comparisonPrice: '15:00/kg',
		validTo: '2026-11-08T00:00:00'
	})
];

/**
 * A store's offers page, whose data is a script with undefined and a Map, like ica.se's.
 * @param {object[]} [offers]
 */
export const icaPage = (offers = icaOffers) =>
	`<html><head></head><body><script>window.__INITIAL_DATA__ = {"env":{"RED":false},"generic":{"isOspAvailable":undefined},"offers":{"offers":[],"selectedOffer":undefined,"weeklyOffersStatus":2,"weeklyOffers":${JSON.stringify(offers)},"compensationOffersStatus":2,"compensationOffers":[]},"products":{"values":new Map([])}};</script></body></html>`;

const attribute = (text) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

const lidlLink = (path, sectionName) =>
	`<a href="${path}" data-unified-click="${encodeURIComponent(JSON.stringify({ sectionName, creativeName: path }))}" data-tabable="true">Kampanj</a>`;

/** lidl.se's start page: this week's campaigns, one without food, and next week's. */
export const lidlStart = `<html><body>${[
	lidlLink('/c/mandag-soendag/a100', 'Den här veckan'),
	lidlLink('/c/lidl-plus-erbjudanden/a101', 'Den här veckan'),
	lidlLink('/c/veckans-blommor/a102', 'Den här veckan'),
	lidlLink('/c/mandag-soendag/a200', 'Nästa vecka'),
	lidlLink('/c/mandag-soendag/a100', 'Den här veckan')
].join('')}</body></html>`;

const MONDAY = 1792969200; // 2026-10-26 00:00 in Sweden
const SUNDAY = 1793573999; // 2026-11-01 23:59:59 in Sweden

const lidlProduct = (productId, fullTitle, category, prices) => ({
	productId,
	fullTitle,
	keyfacts: { wonCategoryPrimary: `Världar/${category}` },
	storeStartDate: MONDAY,
	storeEndDate: SUNDAY,
	...prices
});

const grid = (products) =>
	`<html><body>${products.map((p) => `<div data-grid-data="${attribute(JSON.stringify(p))}"></div>`).join('')}</body></html>`;

export const lidlCampaigns = {
	'/c/mandag-soendag/a100': grid([
		lidlProduct(1, 'Laxfilé', 'Mat och nära mat/Fisk & skaldjur', {
			price: { price: 129, basePrice: { text: '/kg (ca 1,2 kg)' } }
		}),
		lidlProduct(2, 'Blandfärs', 'Mat och nära mat/Kött & fågel/Färs', {
			brand: { name: 'EXEMPELGÅRD' },
			price: { price: 74.9, packaging: { text: '800 g' }, basePrice: { text: '93,63 kr/kg' } }
		}),
		lidlProduct(3, 'Grillkol', 'Fritid/Grill', { price: { price: 49 } })
	]),
	'/c/lidl-plus-erbjudanden/a101': grid([
		lidlProduct(4, 'Smör & "rapsolja"', 'Mat och nära mat/Ost, mejeriprodukter', {
			price: {},
			lidlPlus: [{ price: { price: 49.9, packaging: { text: '600 g' } } }]
		}),
		// The same product as on Måndag–söndag, which is kept once.
		lidlProduct(1, 'Laxfilé', 'Mat och nära mat/Fisk & skaldjur', {
			price: { price: 129, basePrice: { text: '/kg (ca 1,2 kg)' } }
		})
	])
};

/**
 * What the made-up site answers at a path, which starts with the chain's host as offerFetch() asks:
 * /www.willys.se/search/campaigns/offline?q=9001. Null for an address it does not have.
 */
export function offerSite(path) {
	const url = new URL(path, 'http://localhost');
	const json = (data) => ({ type: 'application/json', body: JSON.stringify(data) });
	const html = (body) => ({ type: 'text/html; charset=utf-8', body });
	const [, host, ...rest] = url.pathname.split('/');
	const at = `/${rest.join('/')}`;
	if (host === 'www.willys.se') {
		if (at === '/axfood/rest/search/store') {
			const q = (url.searchParams.get('q') ?? '').toLowerCase();
			return json({
				results: willysStores.results.filter((s) => s.address.town.toLowerCase().includes(q))
			});
		}
		if (at === '/search/campaigns/offline') return json(willysOffers);
	}
	if (host === 'www.ica.se') {
		if (at === '/butiker/sitemap.xml') return { type: 'application/xml', body: icaSitemap };
		if (icaStores.some(([, , id]) => at === `/erbjudanden/${id}/`)) return html(icaPage());
	}
	if (host === 'www.lidl.se') {
		if (at === '/') return html(lidlStart);
		if (lidlCampaigns[at]) return html(lidlCampaigns[at]);
	}
	return null;
}

/**
 * A fetch for the unit tests that answers from the made-up sites, and remembers what was asked.
 * `answer` may stand in for one address, to test a chain that answers otherwise.
 * @param {(url: string) => Response | undefined} [answer]
 */
export function siteFetch(answer = () => undefined) {
	const asked = [];
	const fetcher = async (input) => {
		const url = new URL(String(input));
		asked.push(url.href);
		const own = answer(url.href);
		if (own instanceof Response) return own;
		const page = offerSite(`/${url.hostname}${url.pathname}${url.search}`);
		return page
			? new Response(page.body, { headers: { 'content-type': page.type } })
			: new Response('Nekad', { status: 403 });
	};
	return Object.assign(fetcher, { asked });
}
