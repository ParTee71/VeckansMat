import { expect, test } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };

test('start page shows the week', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Vecka \d+$/);
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
	expect(await response.json()).toEqual({ status: 'ok', version: pkg.version, database: 'ok' });
});

test('start page shows the version', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText(`Version ${pkg.version}`)).toBeVisible();
});

test('a new version offers a reload that loads it', async ({ page }) => {
	await page.goto('/');
	await expect
		.poll(() => page.evaluate(() => customElements.get('m3e-snackbar') !== undefined))
		.toBe(true);
	await page.route('**/_app/version.json', (route) =>
		route.fulfill({ json: { version: '99.0.0' } })
	);

	// SvelteKit checks for a new version when the window gains focus.
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(page.getByText('Ny version finns')).toBeVisible();

	const reload = page.waitForEvent('load');
	await page.getByRole('button', { name: 'Ladda om' }).click();
	await reload;
});

test('a new version is offered again after another notice has closed', async ({ page }) => {
	await page.goto('/');
	await expect
		.poll(() => page.evaluate(() => customElements.get('m3e-snackbar') !== undefined))
		.toBe(true);
	await page.route('**/_app/version.json', (route) =>
		route.fulfill({ json: { version: '99.0.0' } })
	);
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	const notice = page.getByText('Ny version finns');
	await expect(notice).toBeVisible();

	// An undo takes its place, and is replaced by another undo before it closes, as when two
	// items are ticked off in a row.
	await page.evaluate(() =>
		document.body.insertAdjacentHTML(
			'beforeend',
			'<m3e-snackbar id="first" duration="5000" open>Ångra ett</m3e-snackbar>'
		)
	);
	await expect(page.getByText('Ångra ett')).toBeVisible();
	await expect(notice).toBeHidden();
	await page.evaluate(() => {
		document.getElementById('first')?.remove();
		document.body.insertAdjacentHTML(
			'beforeend',
			'<m3e-snackbar duration="1000" open>Ångra två</m3e-snackbar>'
		);
	});
	await expect(page.getByText('Ångra två')).toBeVisible();
	await expect(notice).toBeHidden();
	await expect(notice).toBeVisible();
});
