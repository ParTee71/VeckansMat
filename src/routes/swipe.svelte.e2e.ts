import { expect, test, type Page } from '@playwright/test';
import { open, swipeAt } from '../../test/e2e';

// A swipe sideways on a main view goes to the view next to it in the menu (#105).

const current = (page: Page) => page.locator('nav a[aria-current="page"]');

/** A swipe across the middle of the screen, to the left for a negative dx, once the view before
 * has slid in. */
async function swipe(page: Page, dx: number, dy = 0) {
	await expect(page.locator('.content[data-sliding]')).toHaveCount(0);
	await swipeAt(page, dx < 0 ? 330 : 80, 400, dx, dy);
}

test('a swipe sideways goes through the menu views and stops at the ends', async ({ page }) => {
	await open(page, '/');
	// Marks the page, which a full reload would wipe out.
	await page.evaluate(() => ((window as { kept?: boolean }).kept = true));
	// The views' data, leaving out a dish under the finger, which a touch loads ahead.
	const loads: string[] = [];
	page.on('request', (request) => {
		const view = /^\/(\w*)\/?__data\.json/.exec(new URL(request.url()).pathname);
		if (view) loads.push(view[1]);
	});

	await swipe(page, -200);
	await expect(page).toHaveURL(/\/handla$/);
	await expect(current(page)).toHaveText('Handla');
	await swipe(page, -200);
	await expect(page).toHaveURL(/\/ratter$/);
	await swipe(page, -200);
	await expect(page).toHaveURL(/\/veckor$/);

	// Veckor is the last one, so the page only gives and stays.
	await swipe(page, -200);
	await expect(page).toHaveURL(/\/veckor$/);

	await swipe(page, 200);
	await expect(page).toHaveURL(/\/ratter$/);
	await expect(current(page)).toHaveText('Rätter');

	// Each view's data was loaded once, without loading the whole page again.
	expect(loads).toEqual(['handla', 'ratter', 'veckor', 'ratter']);
	expect(await page.evaluate(() => (window as { kept?: boolean }).kept)).toBe(true);
});

test('a short drag, a scroll, the screen edge and a sheet stay on the view', async ({ page }) => {
	await open(page, '/');
	await expect(current(page)).toHaveText('Veckan');

	// Veckan is the first one.
	await swipe(page, 200);
	// Too short and slow to count.
	await swipeAt(page, 330, 400, -60, 0, 50);
	// Mostly up.
	await swipe(page, -60, -200);
	// From the edge, where the phone has its own back gesture.
	await swipeAt(page, 410, 400, -200);
	await expect(page).toHaveURL(/\/$/);

	// Inside a sheet.
	await page
		.getByRole('button', { name: /äter$|Välj vilka som äter|Lägg till vilka som äter/ })
		.click();
	const sheet = page.locator('m3e-bottom-sheet#who-eats');
	await expect(sheet).toHaveAttribute('open');
	const box = (await sheet.boundingBox())!;
	await swipeAt(page, box.x + box.width - 80, box.y + 120, -200);
	await expect(page).toHaveURL(/\/$/);
});
