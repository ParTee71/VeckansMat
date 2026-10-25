import { expect, type Page } from '@playwright/test';

// Links point at the made-up recipe site in test/e2e-recipe-site.mjs, which also stands in for
// Claude's API.
export const SITE = 'http://localhost:4174';

/** Opens the page once the app's components have loaded. */
export async function open(page: Page, path: string) {
	await page.goto(path);
	await expect.poll(() => page.evaluate(() => !!customElements.get('m3e-fab'))).toBe(true);
}

/** Reads a recipe from a link or text on Nytt recept. */
export async function read(page: Page, text: string) {
	await page.getByLabel('Länk eller recepttext').fill(text);
	await page.getByRole('button', { name: 'Läs in receptet' }).click();
}
