import { saveAccount, type Picture } from './db/account';

// Who is logged in comes from Cloudflare Access, which stands in front of the whole app
// (docs/beslut/0021-inloggning-med-google.md). Access sends the email in a header, and the name and
// Google picture are asked for from its identity endpoint with the token it sends along.

/** How long a fetched name and picture are kept before they are fetched again. */
const REFRESH_DAYS = 7;
const MAX_PICTURE_BYTES = 200_000;
/** Google's pictures come in any size; twice the largest the app shows them in. */
const PICTURE_SIZE = 192;

/** Whether what was fetched at the time is old enough to be fetched again. */
export function isStale(fetchedAt: string, now: Date): boolean {
	return now.getTime() - Date.parse(fetchedAt) >= REFRESH_DAYS * 24 * 60 * 60 * 1000;
}

/** The identity endpoint of the Access team that issued the token, or null for any other issuer. */
export function identityUrl(token: string): string | null {
	try {
		const payload = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
		const issuer = new URL(JSON.parse(atob(payload)).iss);
		if (issuer.protocol === 'https:' && issuer.hostname.endsWith('.cloudflareaccess.com')) {
			return `${issuer.origin}/cdn-cgi/access/get-identity`;
		}
	} catch {
		// Not a token from Access.
	}
	return null;
}

/** The first string found under the key, at any depth, since Access keeps Google's own claims
 * apart from its fields. */
function findString(value: unknown, key: string, depth = 0): string | null {
	if (typeof value !== 'object' || value === null || depth > 3) return null;
	const own = (value as Record<string, unknown>)[key];
	if (typeof own === 'string' && own) return own;
	for (const inner of Object.values(value)) {
		const found = findString(inner, key, depth + 1);
		if (found) return found;
	}
	return null;
}

/** The address to fetch the picture from: only Google's, in the size the app needs. */
export function pictureUrl(address: string, allowLocal = false): string | null {
	try {
		const url = new URL(address);
		const google = url.protocol === 'https:' && url.hostname.endsWith('.googleusercontent.com');
		if (!google && !allowLocal) return null;
		url.pathname = url.pathname.replace(/=s\d+(-c)?$/, `=s${PICTURE_SIZE}-c`);
		return url.href;
	} catch {
		return null;
	}
}

async function fetchPicture(url: string): Promise<Picture | null> {
	const response = await fetch(url);
	const type = response.headers.get('content-type') ?? '';
	if (!response.ok || !type.startsWith('image/')) return null;
	const bytes = await response.arrayBuffer();
	return bytes.byteLength <= MAX_PICTURE_BYTES ? { bytes, type } : null;
}

interface Options {
	/** In place of the team's endpoint, as in the browser tests. */
	identityUrl?: string;
	/** Lets the picture come from another server than Google's, as in the browser tests. */
	allowLocal?: boolean;
}

/**
 * Fetches the account's name and picture and saves them. When the identity cannot be read,
 * nothing is saved, so the next visit tries again.
 */
export async function refreshAccount(
	db: D1Database,
	email: string,
	token: string,
	options: Options = {}
): Promise<void> {
	const url = options.identityUrl ?? identityUrl(token);
	if (!url) return;
	const response = await fetch(url, { headers: { cookie: `CF_Authorization=${token}` } });
	if (!response.ok) return;
	const identity: unknown = await response.json();
	const address = findString(identity, 'picture');
	const source = address && pictureUrl(address, options.allowLocal);
	const picture = source ? await fetchPicture(source).catch(() => null) : null;
	await saveAccount(db, email, findString(identity, 'name'), picture, new Date());
}
