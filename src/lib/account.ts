/**
 * Asks Access for the logged-in identity on the app's own address, where the browser has the
 * cookie for it, and sends it on so the name and Google picture are saved (#129). Returns whether
 * they were.
 */
export async function sendIdentity(): Promise<boolean> {
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
