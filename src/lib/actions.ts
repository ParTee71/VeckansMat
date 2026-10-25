import { deserialize, type ActionResult } from '$app/forms';

export type Fields = Record<string, string | number | number[]>;

// Writes not yet answered. A change shows at once, before it is saved, so leaving the page
// meanwhile asks first, and <html data-saving> tells the browser tests to wait.
let saving = 0;

function track(change: 1 | -1) {
	saving += change;
	document.documentElement.toggleAttribute('data-saving', saving > 0);
}

if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', (event) => {
		if (saving > 0) event.preventDefault();
	});
}

/**
 * Posts to one of the page's form actions. The page is not loaded again, so nothing on it moves:
 * what the action answers is for the page to show. Null when no answer came, because the
 * network is down.
 */
export async function postAction(action: string, fields: Fields): Promise<ActionResult | null> {
	const body = new FormData();
	for (const [name, value] of Object.entries(fields)) {
		for (const v of Array.isArray(value) ? value : [value]) body.append(name, String(v));
	}
	let result: ActionResult | null = null;
	track(1);
	try {
		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' },
			// Sent to the end even if the app is closed meanwhile.
			keepalive: true
		});
		result = deserialize(await response.text());
	} catch {
		// No answer.
	}
	track(-1);
	return result;
}
