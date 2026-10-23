import { expect, test } from '@playwright/test';

test('start page shows the app name', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veckans mat');
});

test('material components are registered in the browser', async ({ page }) => {
	await page.goto('/');
	await expect
		.poll(() => page.evaluate(() => customElements.get('m3e-card') !== undefined))
		.toBe(true);
});

test('health endpoint answers', async ({ request }) => {
	const response = await request.get('/api/health');
	expect(response.ok()).toBe(true);
	expect(await response.json()).toEqual({ status: 'ok' });
});
