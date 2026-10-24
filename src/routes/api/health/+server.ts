import { json } from '@sveltejs/kit';
import { version } from '$app/env';
import type { RequestHandler } from './$types';

// Lets CI, uptime checks and Claude confirm that the Worker answers, and which version runs.
export const GET: RequestHandler = () => json({ status: 'ok', version });
