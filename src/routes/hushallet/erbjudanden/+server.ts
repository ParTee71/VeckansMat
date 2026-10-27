import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings } from '#lib/server/db/household.ts';
import { dinnerOffers } from '#lib/server/db/offers.ts';
import { swedishToday } from '#lib/weeks.ts';
import type { RequestHandler } from './$types';

// The offers for the sheet Veckans erbjudanden, asked for when it opens, so Veckan and Hushållet
// load no faster or slower for them.
export const GET: RequestHandler = async () => {
	const settings = await getSettings(env.DB);
	return json(await dinnerOffers(env.DB, swedishToday(), settings.memberPrices));
};
