// The Worker: SvelteKit's app for every request, and on the cron the week's offers from the
// chains, one chain each run. adapter-cloudflare only makes a fetch handler, so this wraps it.
// See docs/beslut/0023-erbjudanden.md.
import app from '../.svelte-kit/cloudflare/_worker.js';
import { askFor } from './lib/server/claude/claude.ts';
import { sortOffers } from './lib/server/offer-ingredients.ts';
import { fetchNextChain, offerSites } from './lib/server/offers/index.ts';

export default {
	fetch: app.fetch,

	/** @param {unknown} _controller @param {Env} env */
	async scheduled(_controller, env) {
		await fetchNextChain(env.DB, offerSites(env));
		// Claude sorts what was fetched, so the week's suggestion can use it.
		await sortOffers(env.DB, askFor('offer'));
	}
};
