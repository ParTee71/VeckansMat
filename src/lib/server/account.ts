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

/** A claim of the identity: Access's own field, else Google's claim, which it keeps under custom. */
function claim(identity: Record<string, unknown>, key: string): string | null {
	const custom = identity.custom as Record<string, unknown> | undefined;
	const value = identity[key] ?? custom?.[key];
	return typeof value === 'string' && value ? value : null;
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

/** The picture, or null when there is none to be had: not an image, or too large. */
async function fetchPicture(url: string): Promise<Picture | null> {
	const response = await fetch(url);
	const type = response.headers.get('content-type') ?? '';
	const length = Number(response.headers.get('content-length') ?? 0);
	if (!response.ok) throw new Error(`The picture answered ${response.status}`);
	if (!type.startsWith('image/') || length > MAX_PICTURE_BYTES) return null;
	const bytes = await response.arrayBuffer();
	return bytes.byteLength <= MAX_PICTURE_BYTES ? { bytes, type } : null;
}

interface Options {
	/** In place of the team's endpoint, as in the browser tests. */
	identityUrl?: string;
	/** Lets the picture come from another server than Google's, as in the browser tests. */
	allowLocal?: boolean;
}

// When each account was last asked for in this Worker, so the many loads of one visit ask once,
// and an identity that cannot be read is not asked for on every load.
const asked = new Map<string, number>();
const ASK_AGAIN_MS = 10 * 60 * 1000;

/**
 * Fetches the account's name and picture and saves them. When the identity cannot be read,
 * nothing is saved, so a later visit tries again. When Google does not answer, the picture saved
 * before is kept.
 */
export async function refreshAccount(
	db: D1Database,
	email: string,
	token: string,
	options: Options = {}
): Promise<void> {
	const now = Date.now();
	if (now - (asked.get(email) ?? -Infinity) < ASK_AGAIN_MS) return;
	asked.set(email, now);
	const url = options.identityUrl ?? identityUrl(token);
	if (!url) return;
	const response = await fetch(url, { headers: { cookie: `CF_Authorization=${token}` } });
	if (!response.ok) return;
	const identity = (await response.json()) as Record<string, unknown>;
	// Access stands in front of the app, so the two agree; anything else is not trusted.
	if (claim(identity, 'email')?.toLowerCase() !== email.toLowerCase()) return;
	const address = claim(identity, 'picture');
	const source = address && pictureUrl(address, options.allowLocal);
	const picture = source ? await fetchPicture(source).catch(() => undefined) : null;
	await saveAccount(db, email, claim(identity, 'name'), picture, new Date(now));
}

/** Forgets when accounts were asked for, as between tests. */
export function forgetAsked() {
	asked.clear();
}
