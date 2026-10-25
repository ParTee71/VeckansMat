import { expect, test } from '@playwright/test';
import { open, read } from '../../test/e2e';

// Spends the month's cap for Claude, so playwright.config.ts runs it after all other tests.
test.describe.configure({ mode: 'serial' });

test('nothing more is read once the month has cost the cap', async ({ page }) => {
	await open(page, '/ratter/ny');
	await read(page, 'Dyr gryta');
	await expect(page.getByLabel('Namn')).toHaveValue('Dyr gryta');

	await page.getByRole('button', { name: 'Börja om' }).click();
	await read(page, 'Pannkakor');
	await expect(page.getByRole('alert')).toHaveText(
		'Appen har läst så många recept som månadens tak tillåter. Fyll i det själv, eller vänta till nästa månad.'
	);
	await expect(page.getByRole('button', { name: 'Fyll i själv' })).toBeVisible();
});

test('no week is suggested once the month has cost the cap', async ({ page }) => {
	await open(page, '/');
	await page.locator('m3e-button', { hasText: 'Föreslå veckan' }).click();
	await expect(page.getByRole('alert')).toHaveText(
		'Appen har föreslagit så mycket som månadens tak tillåter. Skriv in rätterna själv, eller vänta till nästa månad.'
	);
});
