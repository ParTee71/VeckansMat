import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { isChain } from '#lib/offers.ts';
import { OfferError } from '#lib/server/offers/common.ts';
import { offerFetch, searchStores } from '#lib/server/offers/index.ts';
import type { RequestHandler } from './$types';

// The chain's stores for "Välj butik", searched on the chain's own site through the app, so the
// household's phone never asks the chain itself.
export const GET: RequestHandler = async ({ url }) => {
	const chain = url.searchParams.get('kedja');
	const query = url.searchParams.get('q')?.trim() ?? '';
	if (!isChain(chain) || query.length < 2 || query.length > 60) error(400, 'Ogiltig sökning');
	try {
		return json(await searchStores(env.DB, chain, query, offerFetch(env.OFFER_SITE_URL)));
	} catch (e) {
		if (e instanceof OfferError) return json({ error: e.message }, { status: 502 });
		throw e;
	}
};
