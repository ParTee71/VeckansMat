import { expect, test } from '@playwright/test';
import { open, saved } from '../../../test/e2e';

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
	await expect(page.getByText('1 rätt har bara namn')).toBeVisible();
	await page.locator('m3e-button', { hasText: 'Gör inköpslistan' }).click();

	// Claude's list, under the store's sections in their order, with what is likely at home last.
	await expect(page.getByRole('heading', { level: 2 })).toHaveText([
		'Frukt och grönt',
		'Skafferi',
		'Finns kanske hemma'
	]);
	const onion = page.getByRole('checkbox', { name: 'Gul lök' });
	await expect(onion).toBeVisible();
	await expect(page.getByText('Pyttipanna i handlaprovet · gissat')).toBeVisible();

	// Ticked off, it moves to the basket, and stays there after a reload.
	await onion.click();
	await expect(page.getByRole('heading', { name: /^I korgen/ })).toBeVisible();
	await expect(onion).toBeChecked();
	await saved(page);
	await page.reload();
	await expect(page.getByRole('checkbox', { name: 'Gul lök' })).toBeChecked();

	// Undo takes it out of the basket again.
	await page.getByRole('checkbox', { name: 'Salt' }).click();
	await page.locator('m3e-snackbar').getByRole('button', { name: 'Ångra' }).click();
	await expect(page.getByRole('checkbox', { name: 'Salt' })).not.toBeChecked();

	// An item written by hand stays when the list is made again, and can be removed.
	await page.getByRole('textbox', { name: 'Lägg till en vara' }).fill('Kaffe');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toBeVisible();
	await page.locator('m3e-icon-button[aria-label="Gör om listan från veckan"]').click();
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Gul lök' })).toBeChecked();
	await page.locator('m3e-icon-button[aria-label="Ta bort Kaffe"]').click();
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toHaveCount(0);
});

test('the guessed ingredients are written into the dish', async ({ page }) => {
	await open(page, '/ratter');
	await page.getByRole('link', { name: /Pyttipanna i handlaprovet/ }).click();
	await expect(page.getByText('Claude har gissat ingredienserna till inköpslistan.')).toBeVisible();
	await expect(page.getByText('500 g potatis')).toBeVisible();
});

test('a list made before the week changed offers to be updated', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('button', { name: /^Middag onsdag/ }).click();
	await page.getByRole('textbox', { name: 'Middag onsdag' }).fill('Linsgryta i handlaprovet');
	await page.keyboard.press('Enter');
	await expect(
		page.getByRole('button', { name: 'Middag onsdag: Linsgryta i handlaprovet' })
	).toBeVisible();

	await open(page, '/handla');
	const changed = page.getByRole('heading', { name: 'Veckan har ändrats' });
	await expect(changed).toBeVisible();
	await page.locator('m3e-button', { hasText: 'Inte nu' }).click();
	await expect(changed).toHaveCount(0);

	await saved(page);
	await page.reload();
	await page.locator('m3e-button', { hasText: 'Uppdatera listan' }).click();
	await expect(changed).toHaveCount(0);
	await expect(page.getByRole('checkbox', { name: 'Till linsgryta i handlaprovet' })).toBeVisible();
});
