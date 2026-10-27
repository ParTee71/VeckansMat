// Opens a Coop store's page in Cloudflare's Browser Rendering, as a visitor's browser would, and
// reads the offers the page asks Coop for. The browser is mocked in the tests and tried by hand.
// See docs/beslut/0023-erbjudanden.md.
import { OfferError } from './common';
import { LABEL, slimAnswer, type CoopPage, type OpenPage } from './coop';

// For loading the page and then for its offers, so a fetch never waits more than half a minute.
const TIMEOUT_MS = 15_000;

/** Run in the page before its own scripts: keeps the answer to the page's ask for its offers. */
const CAPTURE = `(() => {
	const open = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function (method, url, ...rest) {
		if (String(url).includes('/dke/offers/sorting-groups/')) {
			this.addEventListener('load', () => { window.__coopAnswer = this.responseText; });
		}
		return open.call(this, method, url, ...rest);
	};
})();`;

/** A page opener that uses the Worker's browser binding. */
export function openInBrowser(binding: BrowserRun): OpenPage {
	return async (url) => {
		// Loaded only when Coop is fetched, so every other request skips it.
		const { default: puppeteer } = await import('@cloudflare/puppeteer');
		const browser = await puppeteer.launch(binding);
		try {
			const page = await browser.newPage();
			await page.evaluateOnNewDocument(CAPTURE);
			try {
				await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
			} catch {
				throw new OfferError(`${LABEL} svarade inte.`);
			}
			try {
				await page.waitForFunction('window.__coopAnswer !== undefined', { timeout: TIMEOUT_MS });
			} catch {
				throw new OfferError(`${LABEL}s sida visade inga erbjudanden i tid.`);
			}
			// Made smaller in the page, so that the Worker gets a fraction of the answer to read.
			return (await page.evaluate(
				`({ name: document.querySelector('h1')?.textContent ?? null, offers: (${slimAnswer})(window.__coopAnswer) })`
			)) as CoopPage;
		} finally {
			// A browser that fails to close must not hide what went wrong before.
			await browser.close().catch(() => {});
		}
	};
}
