import { expect, test, type Page } from '@playwright/test';

// The made-up data comes from test/e2e-seed.sql. Tests that change it use names of their own,
// that sort after the seeded dishes.

// The m3e components are registered after hydration, and do nothing before that.
async function open(page: Page, path: string) {
	await page.goto(path);
	await expect.poll(() => page.evaluate(() => !!customElements.get('m3e-nav-item'))).toBe(true);
}

test('dishes are listed by how often they were eaten', async ({ page }) => {
	await open(page, '/ratter');
	const names = page.locator('m3e-list-action');
	await expect(names.first()).toContainText('Fiskgratäng');
	await expect(names.first()).toContainText('2 gånger · senast v. 3 2030');
	await page.getByRole('button', { name: 'A–Ö' }).click();
	await expect(names.first()).toContainText('Fiskgratäng');
	await expect(names.nth(1)).toContainText('Linssoppa');
});

test('a new dish is added with its name and one tap, and can be filled in', async ({ page }) => {
	await open(page, '/ratter');
	const search = page.getByRole('searchbox', { name: 'Sök eller lägg till rätt' });
	await search.fill('Ärtsoppa');
	await page.getByRole('button', { name: 'Lägg till ”Ärtsoppa”' }).click();
	await expect(page.getByText('Ärtsoppa är tillagd')).toBeVisible();
	await expect(search).toHaveValue('');

	await page.locator('m3e-list-action', { hasText: 'Ärtsoppa' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ärtsoppa');
	await expect(page.getByText('Rätten har bara ett namn.')).toBeVisible();

	await page.locator('m3e-button', { hasText: 'Skriv in själv' }).click();
	await page.getByLabel('Portioner').fill('4');
	await page.getByLabel('Ingredienser, en per rad').fill('500 g köttfärs\n1 vitkål');
	await page.locator('m3e-switch#lunchbox').click();
	await page.getByRole('button', { name: 'Spara' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ärtsoppa');
	await expect(page.getByText('4 portioner')).toBeVisible();
	await expect(page.getByText('Passar till matlådor')).toBeVisible();
	await expect(page.getByText('1 vitkål')).toBeVisible();
});

test('a dish cannot take the name of another', async ({ page }) => {
	await open(page, '/ratter/2/redigera');
	await page.getByLabel('Namn').fill('fiskgratäng');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('alert')).toHaveText(
		'Det finns redan en rätt som heter fiskgratäng.'
	);
});

test('the old weeks show dishes and lines without a dish', async ({ page }) => {
	await open(page, '/veckor');
	await expect(page.getByText('Vecka 3 2030')).toBeVisible();
	await expect(page.getByText('14 – 20 januari')).toBeVisible();
	await expect(page.getByText('Rester')).toBeVisible();
	await page.getByRole('link', { name: 'Fiskgratäng' }).first().click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fiskgratäng');
});

test('the nav bar leads between the main views', async ({ page }) => {
	await open(page, '/');
	await page.locator('m3e-nav-item', { hasText: 'Rätter' }).click();
	await expect(page).toHaveURL('/ratter');
	await page.locator('m3e-nav-item', { hasText: 'Veckor' }).click();
	await expect(page).toHaveURL('/veckor');
});
