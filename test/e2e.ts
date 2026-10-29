import { expect, type Locator, type Page } from '@playwright/test';

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
async function ready(page: Page) {
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

/** Writes a day's dinner on Veckan, and waits until it shows. */
export async function writeDay(page: Page, day: string, text: string) {
	await page.getByRole('button', { name: new RegExp(`^Middag ${day}`) }).click();
	await page.getByRole('textbox', { name: `Middag ${day}` }).fill(text);
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: `Middag ${day}: ${text}` })).toBeVisible();
}

/** Moves a finger from x, y by dx, dy in ten steps, as a swipe on a phone, `pause` ms apart. */
export async function swipeAt(page: Page, x: number, y: number, dx: number, dy = 0, pause = 0) {
	const touch = await page.context().newCDPSession(page);
	const at = (step: number) => [{ x: x + (dx * step) / 10, y: y + (dy * step) / 10, id: 1 }];
	await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
	for (let step = 1; step <= 10; step++) {
		if (pause) await page.waitForTimeout(pause);
		await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(step) });
	}
	await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await touch.detach();
}

/** Holds a finger on the middle of an element for `ms` milliseconds, as a long press on a phone. */
export async function hold(page: Page, locator: Locator, ms = 700) {
	const box = (await locator.boundingBox())!;
	const touch = await page.context().newCDPSession(page);
	const at = [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }];
	await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at });
	await page.waitForTimeout(ms);
	await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await touch.detach();
}
