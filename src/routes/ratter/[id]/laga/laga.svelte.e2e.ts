import { expect, test, type Page } from '@playwright/test';
import { open, saved } from '../../../../../test/e2e';

// Each test adds a made-up dish of its own, so nothing here depends on the other tests.
test.describe.configure({ mode: 'serial' });

/** Adds a dish with just a name in Rätter and opens its page. */
async function addDish(page: Page, name: string) {
	await open(page, '/ratter');
	await page.getByRole('searchbox', { name: 'Sök eller lägg till rätt' }).fill(name);
	await page.getByRole('button', { name: `Lägg till ”${name}”` }).click();
	await expect(page.getByText(`${name} är tillagd`)).toBeVisible();
	await page.locator('m3e-list-action', { hasText: name }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
}

const ingredient = (page: Page, text: string) => page.locator(`m3e-checkbox[aria-label="${text}"]`);

test('a dish is cooked from its page, with portions, ticks and a timer', async ({ page }) => {
	await addDish(page, 'Kycklinggryta');
	await page.locator('m3e-button', { hasText: 'Skriv in själv' }).click();
	await page.getByLabel('Portioner').fill('4');
	await page
		.getByLabel('Ingredienser')
		.fill('600 g kycklingfilé\n1 gul lök\n2 dl grädde\nsalt och peppar');
	await page
		.getByLabel('Gör så här')
		.fill('Hacka löken och bryn kycklingen.\n\nHäll på grädden och låt koka i 20 minuter.');
	await page.getByRole('button', { name: 'Spara' }).click();

	await page.locator('m3e-button', { hasText: 'Laga maten' }).click();
	await expect(page).toHaveURL(/\/ratter\/\d+\/laga$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kycklinggryta');
	// Nobody is chosen for the made-up weeks, so two eat, as on the shopping list, and the recipe
	// for four is halved.
	await expect(page.getByText('2 portioner')).toBeVisible();
	await expect(ingredient(page, '300 g kycklingfilé')).toBeVisible();
	await expect(ingredient(page, '½ gul lök')).toBeVisible();
	await expect(ingredient(page, 'salt och peppar')).toBeVisible();

	// More portions scale the amounts, for this time only.
	const more = page.locator('m3e-icon-button[aria-label="Fler portioner"]');
	for (let i = 0; i < 4; i++) await more.click();
	await expect(page.getByText('Ändrat från 2.')).toBeVisible();
	await expect(page.getByText('6 portioner')).toBeVisible();
	await expect(ingredient(page, '900 g kycklingfilé')).toBeVisible();
	await expect(ingredient(page, '1 ½ gul lök')).toBeVisible();
	await expect(ingredient(page, '3 dl grädde')).toBeVisible();
	await expect(ingredient(page, 'salt och peppar')).toBeVisible();

	// An ingredient ticked off and a step done stay after a reload, but the portions start over.
	await ingredient(page, '900 g kycklingfilé').click();
	await expect(page.getByText('1 av 4 framme')).toBeVisible();
	await expect(page.getByText('Steg 1 av 2')).toBeVisible();
	await page.getByRole('button', { name: /Hacka löken/ }).click();
	await expect(page.getByRole('button', { name: /Hacka löken/ })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.getByText('Steg 2 av 2')).toBeVisible();
	await page.reload();
	await expect(page.getByText('2 portioner')).toBeVisible();
	await expect(page.getByText('1 av 4 framme')).toBeVisible();
	await expect(ingredient(page, '300 g kycklingfilé')).toHaveAttribute('checked');
	await expect(page.getByRole('button', { name: /Hacka löken/ })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	// The step that names a time has a timer, which counts down and says when it is done.
	await page.clock.install();
	await page.locator('m3e-button', { hasText: 'Starta 20 min' }).click();
	const timer = page.getByRole('timer');
	await expect(timer).toContainText('20:00');
	await expect(timer).toContainText('Steg 2');
	await page.clock.fastForward(60_000);
	await expect(timer).toContainText('19:00');
	await page.clock.fastForward(19 * 60_000);
	await expect(timer).toContainText('Klart!');
	await expect(page.getByRole('alert')).toHaveText('Timern för steg 2 är klar');
	await page.locator('m3e-button', { hasText: 'Stäng' }).click();
	await expect(timer).toHaveCount(0);

	// Back leads to the dish.
	await page.locator('m3e-icon-button[aria-label="Tillbaka"]').click();
	await expect(page).toHaveURL(/\/ratter\/\d+$/);
	await saved(page);
});

test('a dish with just a name shows how to get the recipe, and the guessed ingredients', async ({
	page
}) => {
	// Made up in test/e2e-seed.sql.
	await open(page, '/ratter/4');
	await page.locator('m3e-button', { hasText: 'Laga maten' }).click();
	await expect(page.getByText('bara ingredienserna Claude gissade')).toBeVisible();
	await expect(page.locator('m3e-button', { hasText: 'Hämta receptet' })).toBeVisible();
	await expect(page.locator('m3e-button', { hasText: 'Skriv in själv' })).toBeVisible();
	await expect(page.getByText('Gissade · 0 av 2 framme')).toBeVisible();
	await ingredient(page, '1 ½ gula lökar').click();
	await expect(page.getByText('Gissade · 1 av 2 framme')).toBeVisible();
	await expect(page.getByText('Gör så här')).toHaveCount(0);
});
