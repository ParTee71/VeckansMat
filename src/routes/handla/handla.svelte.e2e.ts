import { expect, test } from '@playwright/test';
import { open } from '../../../test/e2e';

// Runs after the tests of Veckan, in its own Playwright project, since both write the weeks Veckan
// shows. The made-up dishes come from test/e2e-seed.sql.
test.describe.configure({ mode: 'serial' });

test('the week shopping list is made from the dishes and ticked off in the store', async ({
	page
}) => {
	// A week with a dish that has ingredients, and one with just a name.
	await open(page, '/');
	await page.getByRole('button', { name: /^Middag måndag/ }).click();
	await page.getByRole('textbox', { name: 'Middag måndag' }).fill('Fiskgratäng');
	await page.keyboard.press('Enter');
	await page.getByRole('textbox', { name: 'Middag tisdag' }).fill('Pyttipanna i handlaprovet');
	await page.keyboard.press('Enter');
	await expect(
		page.getByRole('button', { name: 'Middag tisdag: Pyttipanna i handlaprovet' })
	).toBeVisible();

	await open(page, '/handla');
	await page.locator('m3e-button', { hasText: 'Gör inköpslistan' }).click();

	await expect(page.getByRole('heading', { name: 'Fiskgratäng' })).toBeVisible();
	const cod = page.getByRole('checkbox', { name: '600 g torskfilé' });
	await expect(cod).toBeVisible();
	await expect(page.getByText('Bara namn, inget att lista:')).toContainText(
		'Pyttipanna i handlaprovet'
	);

	// Ticked off, it moves to the basket, and stays there after a reload.
	await cod.click();
	await expect(page.getByRole('heading', { name: /^I korgen/ })).toBeVisible();
	await expect(cod).toBeChecked();
	await page.reload();
	await expect(page.getByRole('checkbox', { name: '600 g torskfilé' })).toBeChecked();

	// Undo takes it out of the basket again.
	await page.getByRole('checkbox', { name: '2 dl grädde' }).click();
	await page.locator('m3e-snackbar').getByRole('button', { name: 'Ångra' }).click();
	await expect(page.getByRole('checkbox', { name: '2 dl grädde' })).not.toBeChecked();

	// An item written by hand stays when the list is made again, and can be removed.
	await page.getByRole('textbox', { name: 'Lägg till en vara' }).fill('Kaffe');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toBeVisible();
	await page.locator('m3e-icon-button[aria-label="Gör om listan från veckan"]').click();
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: '600 g torskfilé' })).toBeChecked();
	await page.locator('m3e-icon-button[aria-label="Ta bort Kaffe"]').click();
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toHaveCount(0);
});
