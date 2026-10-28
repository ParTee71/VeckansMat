import { env, waitUntil } from 'cloudflare:workers';
import { isStale, refreshAccount } from '#lib/server/account.ts';
import { getAccount } from '#lib/server/db/account.ts';
import type { LayoutServerLoad } from './$types';

/** Who is logged in, as Access tells it. The name and picture are fetched after the answer when
 * there are none, or they are old, so the page is never slower for them. */
export const load: LayoutServerLoad = async ({ request }) => {
	const email = request.headers.get('cf-access-authenticated-user-email');
	if (!email) return { account: null };
	const stored = await getAccount(env.DB, email);
	const token = request.headers.get('cf-access-jwt-assertion');
	if (token && (!stored || isStale(stored.fetchedAt, new Date()))) {
		const options = {
			identityUrl: env.ACCESS_IDENTITY_URL,
			allowLocal: env.ALLOW_LOCAL_FETCH === 'true'
		};
		waitUntil(refreshAccount(env.DB, email, token, options).catch(console.error));
	}
	return {
		account: {
			email,
			name: stored?.name ?? null,
			// The time the picture was fetched, so a new one is a new address.
			picture: stored?.hasPicture ? stored.fetchedAt : null
		}
	};
};
