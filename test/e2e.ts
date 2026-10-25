import { expect, type Page } from '@playwright/test';

// Links point at the made-up recipe site in test/e2e-recipe-site.mjs, which also stands in for
// Claude's API.
export const SITE = 'http://localhost:4174';

/** Waits until every change shown is saved, as before leaving or reloading the page. */
export async function saved(page: Page) {
	await expect(page.locator('html[data-saving]')).toHaveCount(0);
}

/** Opens the page, after what was written is saved, once the app's components have loaded. */
export async function open(page: Page, path: string) {
	await saved(page);
	await page.goto(path);
	await ready(page);
}

/** Waits until the app's components have loaded, after a load or reload of the page. */
export async function ready(page: Page) {
	await expect(page.locator('html[data-ready]')).toHaveCount(1);
}

/** Reads a recipe from a link or text on Nytt recept. */
export async function read(page: Page, text: string) {
	await page.getByLabel('Länk eller recepttext').fill(text);
	await page.getByRole('button', { name: 'Läs in receptet' }).click();
}

/** Counts from now on how often the page loads its data again. */
export function countLoads(page: Page) {
	let loads = 0;
	page.on('request', (request) => {
		if (request.url().includes('__data.json')) loads++;
	});
	return () => loads;
}
