import { expect, test } from '@playwright/test';
import { open, read, writeDay } from '../../test/e2e';

// Spends the month's cap for Claude, so playwright.config.ts gives it a Worker of its own.
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

test('the shopping list is the recipe lines once the month has cost the cap', async ({ page }) => {
	await open(page, '/');
	await writeDay(page, 'måndag', 'Fiskgratäng');

	await open(page, '/handla');
	await page.locator('m3e-button', { hasText: 'Gör inköpslistan' }).click();
	await expect(page.getByText('Appen har använt Claude så mycket som månadens tak')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Fiskgratäng' })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: '600 g torskfilé' })).toBeVisible();
});
