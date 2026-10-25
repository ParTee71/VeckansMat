// Which texts are links to recipe pages. Shared by the browser and the server, so both tell
// a link from recipe text the same way. See docs/beslut/0013-recept-in.md.

/**
 * The link as a URL, or null when it is not a web page on a named host. With allowLocal, any
 * web page: what the browser can tell, and what the browser tests need.
 */
export function recipeUrl(text: string, allowLocal = false): URL | null {
	// URL.parse would drop line breaks, which makes a pasted recipe that starts with a link one.
	const url = /\s/.test(text.trim()) ? null : URL.parse(text.trim());
	if (!url || !/^https?:$/.test(url.protocol) || url.username || url.password) return null;
	if (allowLocal) return url;
	const host = url.hostname.replace(/\.$/, '');
	// Only named hosts on the internet: no IP addresses, localhost or single-label names.
	const local =
		host === 'localhost' ||
		host.endsWith('.localhost') ||
		host.startsWith('[') ||
		/^[\d.]+$/.test(host) ||
		!host.includes('.');
	return local ? null : url;
}

/** The site's name to show, such as exempelrecept.se. */
export const siteName = (url: URL) => url.hostname.replace(/^www\./, '');
