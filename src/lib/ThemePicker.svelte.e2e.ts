import { expect, test, type Page } from '@playwright/test';
import { open } from '../../test/e2e';

// Svelte sets the property of a custom element, so the attribute keeps the server's value.
const themeColor = (page: Page) =>
	page.evaluate(() => document.querySelector<HTMLElement & { color: string }>('m3e-theme')?.color);

test('a chosen colour stays after a reload, on this phone only', async ({ page, browser }) => {
	await open(page, '/installningar');
	await expect.poll(() => themeColor(page)).toBe('#c26b4e');

	await page.getByRole('button', { name: 'Skiffer' }).click();
	await expect(page.getByRole('button', { name: 'Skiffer' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect.poll(() => themeColor(page)).toBe('#5f7a99');

	await page.reload();
	await expect.poll(() => themeColor(page)).toBe('#5f7a99');

	const other = await browser.newPage();
	await other.goto('/ratter');
	await expect.poll(() => themeColor(other)).toBe('#c26b4e');
	await other.close();
});

test('a colour of ones own can be chosen', async ({ page }) => {
	await open(page, '/installningar');
	await page.getByLabel('Egen färg').fill('#3366cc');
	await expect.poll(() => themeColor(page)).toBe('#3366cc');
	await page.reload();
	await expect.poll(() => themeColor(page)).toBe('#3366cc');
});
