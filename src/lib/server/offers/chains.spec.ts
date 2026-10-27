import { describe, expect, it } from 'vitest';
import {
	icaOffers,
	icaPage,
	lidlStart,
	siteFetch,
	willysOffers
} from '../../../../test/offer-sites.mjs';
import { OfferError } from './common';
import * as ica from './ica';
import * as lidl from './lidl';
import * as willys from './willys';

const failing = (status: number) => () => new Response('', { status });

describe('Willys', () => {
	it('reads the offers, with member prices and the price as Willys puts it', () => {
		expect(willys.parseOffers(willysOffers)).toEqual([
			{
				name: 'Kycklingfilé',
				brand: 'EXEMPELGÅRDEN',
				size: '900g',
				price: '89,90 kr/st',
				comparePrice: '99,89 kr/kg',
				category: '',
				member: false,
				validFrom: '2026-10-26',
				validTo: '2026-11-01'
			},
			expect.objectContaining({
				name: 'Krossade tomater',
				price: '3 för 25 kr',
				comparePrice: '20,83 kr/kg',
				member: true,
				validTo: '2026-11-08'
			}),
			expect.objectContaining({ name: 'Läsk', price: '2 för 30 kr +pant' })
		]);
	});

	it('finds stores by town and fetches the chosen store', async () => {
		const fetcher = siteFetch();
		expect(await willys.searchStores('exempelstad', fetcher)).toEqual([
			{ id: '9001', name: 'Willys Exempelstad Centrum', place: 'Storgatan 1, Exempelstad' }
		]);
		expect(await willys.fetchOffers('9001', fetcher)).toHaveLength(3);
		expect(fetcher.asked[1]).toContain('/search/campaigns/offline?q=9001&');
	});

	it('says so when the answer has changed shape or the site fails', async () => {
		expect(() => willys.parseOffers({ products: [] })).toThrow(OfferError);
		expect(() => willys.parseOffers({ results: [{ title: 'Ny form' }] })).toThrow(
			'Willys svarade i ett format appen inte känner igen.'
		);
		await expect(willys.fetchOffers('9001', siteFetch(failing(503)))).rejects.toThrow(
			'Willys svarade med fel 503.'
		);
		// The store's id goes into the address, so only digits are asked for.
		await expect(willys.fetchOffers('9001&q=x', siteFetch())).rejects.toThrow(OfferError);
	});
});

describe('ICA', () => {
	it("reads the offers out of the page's script, with Stammis prices and the store's name", () => {
		expect(ica.parseOffers(icaPage())).toEqual({
			storeName: 'ICA Supermarket Exempelby',
			offers: [
				{
					name: 'Fläskfilé',
					brand: 'Exempel',
					size: '500 g',
					price: '89 kr/kg',
					comparePrice: '',
					category: 'Färskvaror',
					member: true,
					validFrom: null,
					validTo: '2026-11-01'
				},
				expect.objectContaining({
					name: 'Gul lök',
					price: '2 för 30 kr',
					comparePrice: '15,00 kr/kg',
					member: false,
					validTo: '2026-11-08'
				})
			]
		});
	});

	it('finds stores in the sitemap by town or name, without å, ä and ö', async () => {
		const fetcher = siteFetch();
		expect(await ica.searchStores('Exempelstad', fetcher)).toEqual([
			{
				id: 'maxi-ica-stormarknad-exempelstad-1000002',
				name: 'Maxi ICA Stormarknad Exempelstad',
				place: 'Exempelstad'
			},
			{ id: 'ica-nara-angen-1000003', name: 'ICA Nara Angen', place: 'Ostra Exempelstad' }
		]);
		expect(await ica.searchStores('Ängen', fetcher)).toHaveLength(1);
		expect(await ica.searchStores('östra exempelstad', fetcher)).toHaveLength(1);
		expect(await ica.searchStores('Ingenstans', fetcher)).toEqual([]);
	});

	it('fetches the chosen store', async () => {
		const fetcher = siteFetch();
		const { offers } = await ica.fetchOffers('ica-supermarket-exempelby-1000001', fetcher);
		expect(offers).toHaveLength(2);
		expect(fetcher.asked).toEqual([
			'https://www.ica.se/erbjudanden/ica-supermarket-exempelby-1000001/'
		]);
		await expect(ica.fetchOffers('../konto', fetcher)).rejects.toThrow(OfferError);
	});

	it('says so when the page has changed or has no offers', () => {
		expect(() => ica.parseOffers('<html>Ny sida</html>')).toThrow(
			'ICA svarade i ett format appen inte känner igen.'
		);
		expect(() => ica.parseOffers(icaPage([]))).toThrow('ICA visade inga erbjudanden för butiken.');
		expect(() => ica.parseOffers(icaPage([{ ...icaOffers[0], details: {} }]))).toThrow(OfferError);
	});
});

describe('Lidl', () => {
	it("follows only this week's campaign pages with food", () => {
		expect(lidl.campaignPages(lidlStart)).toEqual([
			'/c/mandag-soendag/a100',
			'/c/lidl-plus-erbjudanden/a101'
		]);
	});

	it('reads the food on them once each, with Lidl Plus prices', async () => {
		const fetcher = siteFetch();
		const offers = await lidl.fetchOffers(fetcher);
		expect(fetcher.asked).toHaveLength(3);
		expect(offers).toEqual([
			{
				name: 'Laxfilé',
				brand: '',
				size: 'ca 1,2 kg',
				price: '129 kr/kg',
				comparePrice: '',
				member: false,
				category: 'Fisk & skaldjur',
				validFrom: '2026-10-26',
				validTo: '2026-11-01'
			},
			expect.objectContaining({
				name: 'Blandfärs',
				brand: 'EXEMPELGÅRD',
				size: '800 g',
				price: '74,90 kr',
				comparePrice: '93,63 kr/kg',
				category: 'Kött & fågel'
			}),
			expect.objectContaining({ name: 'Smör & "rapsolja"', price: '49,90 kr', member: true })
		]);
	});

	it('says so when the start page has no campaigns or a page fails', async () => {
		const empty = siteFetch((url) =>
			url === 'https://www.lidl.se/' ? new Response('<html></html>') : undefined
		);
		await expect(lidl.fetchOffers(empty)).rejects.toThrow(
			'Lidl svarade i ett format appen inte känner igen.'
		);
		const broken = siteFetch((url) =>
			url.includes('/a101') ? new Response('', { status: 500 }) : undefined
		);
		await expect(lidl.fetchOffers(broken)).rejects.toThrow('Lidl svarade med fel 500.');
	});
});
