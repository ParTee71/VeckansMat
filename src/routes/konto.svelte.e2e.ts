import { expect, test, type Page } from '@playwright/test';
import { open } from '../../test/e2e';

// Made-up accounts. Access sends the email in a header, and the browser asks its identity endpoint
// for the name and picture, which the test answers. The picture comes from the made-up site in
// test/e2e-recipe-site.mjs.
// The database stays between runs, so each run has accounts of its own, still without a picture.
const run = Date.now();
const ALEX = `alex-${run}@exempel.se`;
const SAM = `sam-${run}@exempel.se`;
const NOA = `noa-${run}@exempel.se`;

const as = (email: string) => ({
	extraHTTPHeaders: { 'cf-access-authenticated-user-email': email }
});

/** Answers the browser's question to Access with the identity, and counts the questions. */
async function identity(page: Page, body: object | null) {
	let asked = 0;
	await page.route('**/cdn-cgi/access/get-identity', (route) => {
		asked++;
		return body ? route.fulfill({ json: body }) : route.fulfill({ status: 401 });
	});
	return () => asked;
}

const account = (page: Page) => page.getByRole('link', { name: /^Konto och inställningar/ });

test.describe('with a Google picture', () => {
	test.use(as(ALEX));

	test('the picture is fetched once and shown in every main view', async ({ page }) => {
		const asked = await identity(page, {
			email: ALEX,
			name: 'Alex Exempel',
			oidc_fields: { picture: 'http://localhost:4174/access/bild=s96-c' }
		});
		// The first load shows the letter, and the picture once the browser has fetched it.
		await open(page, '/');
		await expect(account(page).locator('img')).toBeVisible();
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
		// Kept for a week, so it is not asked for again.
		expect(asked()).toBe(1);

		await account(page).click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inställningar');
		const card = page.getByRole('region', { name: 'Konto' });
		await expect(card.locator('img')).toBeVisible();
		await expect(card).toContainText('Alex Exempel');
		await expect(card).toContainText(ALEX);
		await expect(card.getByRole('link', { name: 'Logga ut' })).toHaveAttribute(
			'href',
			'/cdn-cgi/access/logout'
		);
	});
});

test.describe('without a Google picture', () => {
	test.use(as(SAM));

	test('the first letter of the name is shown', async ({ page }) => {
		const asked = await identity(page, { email: SAM, name: 'Sam Exempel' });
		await open(page, '/ratter');
		await expect(account(page)).toHaveAccessibleName('Konto och inställningar, Sam Exempel');
		await expect(account(page)).toHaveText('S');
		await expect(account(page).locator('img')).toHaveCount(0);
		// Asked again later for a picture, but not again within ten minutes.
		await open(page, '/handla');
		await expect(account(page)).toHaveText('S');
		expect(asked()).toBe(1);
	});
});

test.describe('when Access does not answer', () => {
	test.use(as(NOA));

	test('the first letter of the email stays', async ({ page }) => {
		const asked = await identity(page, null);
		await open(page, '/handla');
		await expect.poll(asked).toBe(1);
		await expect(account(page)).toHaveText('N');
		await expect(account(page)).toHaveAccessibleName('Konto och inställningar');
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
