import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Lets CI, uptime checks and Claude confirm that the Worker answers.
export const GET: RequestHandler = () => json({ status: 'ok' });
