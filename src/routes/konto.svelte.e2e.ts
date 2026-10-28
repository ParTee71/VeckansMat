import { expect, test, type Page } from '@playwright/test';
import { open } from '../../test/e2e';

// Made-up accounts, as Cloudflare Access would send them. The identity and the picture come from
// the made-up site in test/e2e-recipe-site.mjs.
const as = (email: string, token: string) => ({
	extraHTTPHeaders: {
		'cf-access-authenticated-user-email': email,
		'cf-access-jwt-assertion': token
	}
});

const account = (page: Page) => page.getByRole('link', { name: /^Konto och inställningar/ });

test.describe('with a Google picture', () => {
	test.use(as('alex@exempel.se', 'e2e-med-bild'));

	test('the picture is fetched once and shown in every main view', async ({ page }) => {
		// The first visit has only the email; the name and picture are fetched after it.
		await open(page, '/');
		await expect(account(page)).toBeVisible();
		await expect(async () => {
			await page.reload();
			await expect(account(page).locator('img')).toBeVisible({ timeout: 1000 });
		}).toPass();
		await expect(account(page)).toHaveAccessibleName('Konto och inställningar, Alex Exempel');
		expect(
			await account(page)
				.locator('img')
				.evaluate((img: HTMLImageElement) => img.naturalWidth)
		).toBe(1);

		for (const path of ['/handla', '/ratter', '/veckor']) {
			await open(page, path);
			await expect(account(page).locator('img')).toBeVisible();
		}

		await account(page).click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inställningar');
		const card = page.getByRole('region', { name: 'Konto' });
		await expect(card).toContainText('Alex Exempel');
		await expect(card).toContainText('alex@exempel.se');
		await expect(card.getByRole('link', { name: 'Logga ut' })).toHaveAttribute(
			'href',
			'/cdn-cgi/access/logout'
		);
	});
});

test.describe('without a Google picture', () => {
	test.use(as('sam@exempel.se', 'e2e-utan-bild'));

	test('the first letter of the name is shown', async ({ page }) => {
		await open(page, '/ratter');
		await expect(async () => {
			await page.reload();
			await expect(account(page)).toHaveAccessibleName('Konto och inställningar, Sam Exempel', {
				timeout: 1000
			});
		}).toPass();
		await expect(account(page)).toHaveText('S');
		await expect(account(page).locator('img')).toHaveCount(0);
	});
});

test('without Access the button still leads to Inställningar', async ({ page }) => {
	await open(page, '/veckor');
	await expect(account(page)).toHaveAccessibleName('Konto och inställningar');
	await account(page).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inställningar');
	await expect(page.getByRole('region', { name: 'Konto' })).toHaveCount(0);
});

test('old links to Hushållet lead to Inställningar', async ({ page }) => {
	await open(page, '/hushallet');
	await expect(page).toHaveURL('/installningar');
	await open(page, '/hushallet/ny');
	await expect(page).toHaveURL('/installningar/ny');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ny person');
});
