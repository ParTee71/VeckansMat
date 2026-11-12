import { expect, test } from '@playwright/test';

test('the web manifest names the app and every icon in it is served', async ({ page, request }) => {
	await page.goto('/');
	// SvelteKit writes the links relative to the page, so they are resolved here.
	const link = (rel: string) =>
		page.locator(`link[rel="${rel}"]`).evaluate((el) => (el as HTMLLinkElement).href);
	const manifestUrl = await link('manifest');
	expect(manifestUrl).toMatch(/\/manifest\.webmanifest$/);

	const response = await request.get(manifestUrl);
	expect(response.status()).toBe(200);
	const manifest = await response.json();
	expect(manifest.name).toBe('Veckans mat');
	expect(manifest.icons.length).toBeGreaterThan(0);

	const urls = [
		...manifest.icons.map((icon: { src: string }) => new URL(icon.src, manifestUrl).href),
		await link('apple-touch-icon')
	];
	for (const url of urls) {
		const icon = await request.get(url);
		expect(icon.status(), url).toBe(200);
		expect(icon.headers()['content-type'], url).toMatch(/^image\//);
	}
});
