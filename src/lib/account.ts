const ASKED_KEY = 'account-asked';
/** An identity that cannot be had is asked for again at the earliest after this. */
const ASK_AGAIN_MS = 10 * 60 * 1000;

/** Whether the phone asked for the identity a short while ago. Storage can be missing or blocked. */
function askedLately(): boolean {
	try {
		const asked = Number(localStorage.getItem(ASKED_KEY));
		localStorage.setItem(ASKED_KEY, String(Date.now()));
		return Date.now() - asked < ASK_AGAIN_MS;
	} catch {
		return false;
	}
}

/**
 * Asks Access for the logged-in identity on the app's own address, where the browser has the
 * cookie for it, and sends it on so the name and Google picture are saved (#129). Returns whether
 * they were. Once in a while at most, so an identity that cannot be had is not asked for on every
 * load.
 */
export async function sendIdentity(): Promise<boolean> {
	if (askedLately()) return false;
	try {
		const identity = await fetch('/cdn-cgi/access/get-identity');
		if (!identity.ok) return false;
		const saved = await fetch('/konto', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: await identity.text()
		});
		return saved.ok;
	} catch {
		return false;
	}
}
