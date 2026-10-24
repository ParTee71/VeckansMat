import { json } from '@sveltejs/kit';
import { version } from '$app/env';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

// Lets CI, uptime checks and Claude confirm that the Worker and its database answer,
// and which version runs.
export const GET: RequestHandler = async () => {
	try {
		await env.DB.prepare('SELECT 1').first();
		return json({ status: 'ok', version, database: 'ok' });
	} catch {
		return json({ status: 'error', version, database: 'error' }, { status: 503 });
	}
};
