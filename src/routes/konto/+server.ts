import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { saveIdentity } from '#lib/server/account.ts';
import type { RequestHandler } from './$types';

/** Saves the name and Google picture from the identity Access gave the browser. */
export const POST: RequestHandler = async ({ request }) => {
	const email = request.headers.get('cf-access-authenticated-user-email');
	if (!email) error(401);
	const identity: unknown = await request.json().catch(() => null);
	if (!(await saveIdentity(env.DB, email, identity, env.ALLOW_LOCAL_FETCH === 'true'))) {
		// Shown in Workers Logs, so a failure is no longer silent.
		console.error('An identity that is not the account’s own was not saved');
		error(400);
	}
	return new Response(null, { status: 204 });
};
