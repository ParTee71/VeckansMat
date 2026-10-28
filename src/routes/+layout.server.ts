import { env } from 'cloudflare:workers';
import { isStale } from '#lib/server/account.ts';
import { getAccount } from '#lib/server/db/account.ts';
import type { LayoutServerLoad } from './$types';

/** Who is logged in, as Access tells it, and whether the browser should fetch the name and
 * picture: when there are none, or they are old. */
export const load: LayoutServerLoad = async ({ request, depends }) => {
	depends('app:account');
	const email = request.headers.get('cf-access-authenticated-user-email');
	if (!email) return { account: null };
	const stored = await getAccount(env.DB, email);
	return {
		account: {
			email,
			name: stored?.name ?? null,
			// The time the picture was fetched, so a new one is a new address.
			picture: stored?.hasPicture ? stored.fetchedAt : null,
			refresh: !stored || isStale(stored.fetchedAt, new Date())
		}
	};
};
