import { saveAccount, type Picture } from './db/account';

// Who is logged in comes from Cloudflare Access, which stands in front of the whole app
// (docs/beslut/0021-inloggning-med-google.md). Access sends the email in a header. The name and
// Google picture come from its identity endpoint, which the browser asks on the app's own address
// and sends on, since the Worker cannot ask it itself (#129).

/** How long a fetched name and picture are kept before they are fetched again. */
const REFRESH_DAYS = 7;
const MAX_PICTURE_BYTES = 200_000;
/** Google's pictures come in any size; twice the largest the app shows them in. */
const PICTURE_SIZE = 192;

/** Whether what was fetched at the time is old enough to be fetched again. */
export function isStale(fetchedAt: string, now: Date): boolean {
	return now.getTime() - Date.parse(fetchedAt) >= REFRESH_DAYS * 24 * 60 * 60 * 1000;
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

/**
 * Saves the name and picture of the identity Access gave the browser, when it is the account's own.
 * Returns false when it is not. When Google does not answer, the picture saved before is kept.
 */
export async function saveIdentity(
	db: D1Database,
	email: string,
	identity: unknown,
	allowLocal = false
): Promise<boolean> {
	if (typeof identity !== 'object' || identity === null) return false;
	const fields = identity as Record<string, unknown>;
	// Only the account's own name and picture, and the picture only from Google.
	if (claim(fields, 'email')?.toLowerCase() !== email.toLowerCase()) return false;
	const address = claim(fields, 'picture');
	const source = address && pictureUrl(address, allowLocal);
	const picture = source ? await fetchPicture(source).catch(() => undefined) : null;
	await saveAccount(db, email, claim(fields, 'name'), picture, new Date());
	return true;
}
