import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getPicture } from '#lib/server/db/account.ts';
import type { RequestHandler } from './$types';

/** The logged-in account's Google picture, as kept in the app. The phone keeps it too, since a
 * new picture gets a new address. */
export const GET: RequestHandler = async ({ request }) => {
	const email = request.headers.get('cf-access-authenticated-user-email');
	const picture = email && (await getPicture(env.DB, email));
	if (!picture) error(404);
	return new Response(picture.bytes, {
		headers: { 'content-type': picture.type, 'cache-control': 'private, max-age=604800' }
	});
};
