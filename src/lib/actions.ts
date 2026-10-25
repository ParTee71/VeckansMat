import { deserialize, type ActionResult } from '$app/forms';
import { invalidateAll } from '$app/navigation';

export type Fields = Record<string, string | number | number[]>;

/**
 * Posts to one of the page's form actions and loads the page's data again. Null when no answer
 * came, because the network is down.
 */
export async function postAction(action: string, fields: Fields): Promise<ActionResult | null> {
	const body = new FormData();
	for (const [name, value] of Object.entries(fields)) {
		for (const v of Array.isArray(value) ? value : [value]) body.append(name, String(v));
	}
	let result: ActionResult | null = null;
	try {
		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		result = deserialize(await response.text());
	} catch {
		// No answer.
	}
	await invalidateAll();
	return result;
}
