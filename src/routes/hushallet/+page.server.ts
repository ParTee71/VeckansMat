import { fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getSettings, listPeople, saveSettings } from '#lib/server/db/household.ts';
import { getChain, listChains, setChainEnabled, setChainStore } from '#lib/server/db/offers.ts';
import { fetchChain, isStale, offerSites } from '#lib/server/offers/index.ts';
import type { Settings } from '#lib/household.ts';
import { hasStores, isChain, type Chain } from '#lib/offers.ts';
import type { Actions, PageServerLoad } from './$types';

const NUMBERS = [
	'newDishesPerWeek',
	'lunchboxExtraPortions',
	'repeatWeeks',
	'favouriteRepeatWeeks'
] as const;

export const load: PageServerLoad = async () => {
	const [people, settings, chains] = await Promise.all([
		listPeople(env.DB),
		getSettings(env.DB),
		listChains(env.DB)
	]);
	return { people, settings, chains };
};

/** The chain the form names, or null when it names none. */
function chainOf(form: FormData): Chain | null {
	const chain = form.get('chain');
	return isChain(chain) ? chain : null;
}

/** Fetches the chain's offers when it has none from this week, and answers with how it went. */
async function fetchIfStale(chain: Chain) {
	if (isStale(await getChain(env.DB, chain), new Date())) {
		await fetchChain(env.DB, chain, offerSites(env));
	}
	return { chain: await getChain(env.DB, chain) };
}

export const actions: Actions = {
	settings: async ({ request }) => {
		const form = await request.formData();
		// Only what the form sent is saved, so a missing field never resets a setting.
		const settings: Partial<Settings> = {};
		if (form.has('menuRules')) settings.menuRules = String(form.get('menuRules'));
		for (const key of NUMBERS) if (form.has(key)) settings[key] = Number(form.get(key));
		if (form.has('memberPrices')) settings.memberPrices = form.get('memberPrices') === 'true';
		try {
			await saveSettings(env.DB, settings);
		} catch (e) {
			if (e instanceof RangeError)
				return fail(400, { error: 'Det gick inte att spara. Ladda om sidan och försök igen.' });
			throw e;
		}
	},

	/** Switches a chain on or off. Switched on, it is fetched at once if it can be. */
	chain: async ({ request }) => {
		const form = await request.formData();
		const chain = chainOf(form);
		if (!chain) return fail(400, { error: 'Okänd kedja.' });
		const enabled = form.get('enabled') === 'true';
		await setChainEnabled(env.DB, chain, enabled);
		return enabled ? fetchIfStale(chain) : { chain: await getChain(env.DB, chain) };
	},

	/** Chooses the chain's store, and fetches its offers at once. */
	store: async ({ request }) => {
		const form = await request.formData();
		const chain = chainOf(form);
		const id = String(form.get('id') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		if (!chain || !hasStores(chain) || !id || !name) {
			return fail(400, { error: 'Det gick inte att välja butiken. Försök igen.' });
		}
		await setChainStore(env.DB, chain, id, name);
		return fetchIfStale(chain);
	}
};
