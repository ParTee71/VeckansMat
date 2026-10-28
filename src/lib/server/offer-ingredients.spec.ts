import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answering, failing } from '../../../test/claude';
import { useTestDb } from '../../../test/d1';
import { ClaudeLimitError } from './claude/claude';
import { OFFER_PROMPT, OFFER_SCHEMA, offerContent } from './claude/offer-prompt';
import type { Offer } from './offers/common';
import {
	currentOffers,
	dinnerOffers,
	offerChains,
	saveOffers,
	setChainEnabled,
	unsortedOffers
} from './db/offers';
import { askIngredients, sortOffers } from './offer-ingredients';

let db: D1Database;
useTestDb((test) => (db = test));
// Each test an hour after the last, so a wait after a failed call never carries over.
let now = Date.now();
beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime((now += 60 * 60_000));
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const offer = (name: string, more: Partial<Offer> = {}): Offer => ({
	name,
	brand: '',
	size: '',
	price: '10 kr',
	comparePrice: '',
	category: '',
	member: false,
	validFrom: '2026-10-26',
	validTo: '2026-11-01',
	...more
});

const ingredients = async () =>
	Object.fromEntries(
		(
			await db
				.prepare('SELECT name, ingredient FROM offer ORDER BY id')
				.all<{ name: string; ingredient: string | null }>()
		).results.map((o) => [o.name, o.ingredient])
	);

describe('asking Claude for ingredients', () => {
	const offers = [
		{ name: 'Kycklingfilé', brand: 'Exempelgården', size: '900 g', category: 'Kött' },
		{ name: 'Läsk', brand: '', size: '1,5 l', category: '' },
		{ name: 'Laxfilé', brand: '', size: '', category: '' }
	];

	it('sends the offers numbered, and asks for the schema', async () => {
		const ask = answering({ offers: [] });
		await askIngredients(offers, ask);
		expect(ask).toHaveBeenCalledWith(
			expect.objectContaining({
				system: OFFER_PROMPT,
				output_config: { effort: 'low', format: { type: 'json_schema', schema: OFFER_SCHEMA } }
			})
		);
		expect(offerContent(offers)).toBe(
			'<offers>\n1. Kycklingfilé · Exempelgården · 900 g · Kött\n2. Läsk · 1,5 l\n3. Laxfilé\n</offers>'
		);
	});

	it('keeps an ingredient for each offer it asked about, once', async () => {
		const answer = await askIngredients(
			offers,
			answering({
				offers: [
					{ offer: 1, ingredient: ' Kycklingfilé ' },
					{ offer: 3, ingredient: 'laxfilé' },
					{ offer: 9, ingredient: 'nötfärs' },
					{ offer: 1, ingredient: 'kyckling' },
					{ offer: 2, ingredient: '' }
				]
			})
		);
		expect([...answer]).toEqual([
			[0, 'kycklingfilé'],
			[2, 'laxfilé']
		]);
	});
});

describe('sorting the fetched offers', () => {
	it("saves each offer's ingredient, and what is left out as no dinner", async () => {
		await saveOffers(db, 'lidl', [offer('Kycklingfilé'), offer('Läsk')], new Date());
		await sortOffers(db, answering({ offers: [{ offer: 1, ingredient: 'kycklingfilé' }] }));
		expect(await ingredients()).toEqual({ Kycklingfilé: 'kycklingfilé', Läsk: '' });

		// Nothing left to ask about.
		const ask = answering({ offers: [] });
		await sortOffers(db, ask);
		expect(ask).not.toHaveBeenCalled();
	});

	it('asks a large week in batches', async () => {
		const many = Array.from({ length: 160 }, (_, i) => offer(`Vara ${i}`));
		await saveOffers(db, 'willys', many, new Date());
		const ask = answering({ offers: [{ offer: 1, ingredient: 'potatis' }] });
		// Before a suggestion only one batch, the rest at the next run.
		await sortOffers(db, ask, 1);
		expect(ask).toHaveBeenCalledTimes(1);
		expect(await unsortedOffers(db, 200)).toHaveLength(10);
		await sortOffers(db, ask);
		expect(ask).toHaveBeenCalledTimes(2);
		expect(await unsortedOffers(db, 10)).toEqual([]);
	});

	it('leaves the offers unsorted when Claude fails, and waits before asking again', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await saveOffers(db, 'lidl', [offer('Kycklingfilé')], new Date());
		await sortOffers(db, failing(new ClaudeLimitError()));
		expect(await ingredients()).toEqual({ Kycklingfilé: null });

		const ask = answering({ offers: [] });
		await sortOffers(db, ask);
		expect(ask).not.toHaveBeenCalled();
		vi.setSystemTime((now += 11 * 60_000));
		await sortOffers(db, ask);
		expect(ask).toHaveBeenCalledOnce();
	});
});

describe('the offers Claude sees for the week', () => {
	it('are those a dinner is built on, valid now and a couple of days more, from chains that are on', async () => {
		await setChainEnabled(db, 'lidl', true);
		await setChainEnabled(db, 'willys', true);
		await saveOffers(
			db,
			'lidl',
			[
				offer('Kycklingfilé', { price: '89 kr/kg' }),
				offer('Läsk'),
				offer('Laxfilé', { validTo: '2026-10-28' }),
				offer('Nötfärs', { validFrom: '2026-11-02', validTo: '2026-11-08' }),
				offer('Fläskfilé', { member: true, validFrom: null })
			],
			new Date()
		);
		await saveOffers(db, 'willys', [offer('Kycklingbröst'), offer('Kycklinglår')], new Date());
		await saveOffers(db, 'coop', [offer('Falukorv')], new Date());
		await sortOffers(
			db,
			answering({
				offers: [
					{ offer: 1, ingredient: 'kycklingfilé' },
					{ offer: 3, ingredient: 'laxfilé' },
					{ offer: 4, ingredient: 'nötfärs' },
					{ offer: 5, ingredient: 'fläskfilé' },
					{ offer: 6, ingredient: 'kycklingfilé' },
					{ offer: 7, ingredient: 'kycklingfilé' },
					{ offer: 8, ingredient: 'falukorv' }
				]
			})
		);

		const names = async (memberPrices: boolean) =>
			(await currentOffers(db, '2026-10-27', '2026-10-29', memberPrices)).map(
				(o) => `${o.ingredient}: ${o.name} (${o.chain})`
			);
		// Two of each ingredient at most; coop is off; lax ends too soon; nötfärs starts later.
		expect(await names(true)).toEqual([
			'fläskfilé: Fläskfilé (lidl)',
			'kycklingfilé: Kycklingfilé (lidl)',
			'kycklingfilé: Kycklingbröst (willys)'
		]);
		expect(await names(false)).not.toContain('fläskfilé: Fläskfilé (lidl)');
		expect((await currentOffers(db, '2026-10-27', '2026-10-29', true))[1]).toEqual({
			chain: 'lidl',
			name: 'Kycklingfilé',
			brand: '',
			size: '',
			price: '89 kr/kg',
			member: false,
			validTo: '2026-11-01',
			ingredient: 'kycklingfilé'
		});

		// The sheet lists every one valid today, not two of each, and still none from coop.
		const listed = async (memberPrices: boolean) =>
			(await dinnerOffers(db, '2026-10-29', memberPrices)).map((o) => `${o.name} (${o.chain})`);
		expect(await listed(true)).toEqual([
			'Fläskfilé (lidl)',
			'Kycklingbröst (willys)',
			'Kycklingfilé (lidl)',
			'Kycklinglår (willys)'
		]);
		expect(await listed(false)).not.toContain('Fläskfilé (lidl)');
		// The planning card names the chains Claude sees offers from, in Inställningar's order.
		expect(await offerChains(db, '2026-10-27', '2026-10-29', true)).toEqual(['willys', 'lidl']);
	});
});
