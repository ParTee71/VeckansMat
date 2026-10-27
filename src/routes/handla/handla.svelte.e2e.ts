import { expect, test, type Page } from '@playwright/test';
import { countLoads, open, saved, swipeAt, writeDay } from '../../../test/e2e';

// Has a Worker of its own in playwright.config.ts, since it writes the same weeks as the tests of
// Veckan. The made-up dishes come from test/e2e-seed.sql.
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
		/Frukt och grönt/,
		/Skafferi/,
		/Finns kanske hemma/
	]);
	const onion = page.getByRole('checkbox', { name: 'Gul lök' });
	await expect(onion).toBeVisible();
	// The dishes an item is for are behind its info button.
	await page
		.getByRole('button', { name: 'Till vilka rätter: Till pyttipanna i handlaprovet' })
		.click();
	await expect(page.getByText('Pyttipanna i handlaprovet · gissat')).toBeVisible();
	await page.keyboard.press('Escape');

	// Ticked off, it moves to the basket, which is folded, and stays there after a reload.
	await onion.click();
	const basket = page.getByRole('button', { name: /I korgen/ });
	await expect(basket).toBeVisible();
	await expect(onion).toBeHidden();
	await saved(page);
	await page.reload();
	await page.getByRole('button', { name: /I korgen/ }).click();
	await expect(page.getByRole('checkbox', { name: 'Gul lök' })).toBeChecked();

	// Nothing in the store loads the page again, so nothing on it jumps.
	const loads = countLoads(page);

	// Undo takes it out of the basket again.
	await page.getByRole('checkbox', { name: 'Salt' }).click();
	await page.locator('m3e-snackbar').getByRole('button', { name: 'Ångra' }).click();
	await expect(page.getByRole('checkbox', { name: 'Salt' })).not.toBeChecked();

	// Items written by hand, two in a row from the add button, stay when the list is made again.
	await page.locator('m3e-fab[aria-label="Lägg till en vara"]').click();
	const field = page.getByRole('textbox', { name: 'Lägg till en vara' });
	await field.fill('Kaffe');
	await page.keyboard.press('Enter');
	await field.fill('Te');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Te' })).toBeVisible();
	await page.getByRole('button', { name: 'Stäng' }).click();
	await expect(field).toHaveCount(0);
	await saved(page);
	expect(loads()).toBe(0);
	await page.locator('m3e-icon-button[aria-label="Gör om listan från veckan"]').click();
	await expect(page.getByRole('checkbox', { name: 'Kaffe' })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Gul lök' })).toBeChecked();
	// Without swiping, as from the keyboard, an item without dishes is removed with its button.
	await page.getByRole('button', { name: 'Ta bort Te' }).focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('checkbox', { name: 'Te' })).toHaveCount(0);
});

/** Swipes the row of an item to the left with a finger, over `share` of its width. */
async function swipe(page: Page, text: string, share: number) {
	const row = page.locator('li', { has: page.getByRole('checkbox', { name: text }) });
	const box = (await row.boundingBox())!;
	await swipeAt(page, box.x + box.width - 90, box.y + box.height / 2, -box.width * share);
}

test('any item is swiped away, and undo puts it back with its dishes', async ({ page }) => {
	await open(page, '/handla');
	const item = page.getByRole('checkbox', { name: 'Till fiskgratäng' });
	await expect(item).toBeVisible();

	// A short swipe leaves it, and does not tick it either.
	await swipe(page, 'Till fiskgratäng', 0.25);
	await expect(item).toBeVisible();
	await expect(item).not.toBeChecked();
	// And the next tap still ticks it.
	await item.click();
	await expect(item).toBeHidden();
	await page.locator('m3e-snackbar').getByRole('button', { name: 'Ångra' }).click();
	await expect(item).toBeVisible();

	// A long one takes it away, and stays on Handla rather than going to the next view (#105).
	await swipe(page, 'Till fiskgratäng', 0.7);
	await expect(item).toHaveCount(0);
	await expect(page).toHaveURL(/\/handla$/);
	await page.locator('m3e-snackbar').getByRole('button', { name: 'Ångra' }).click();
	await expect(item).toBeVisible();
	await saved(page);
	await page.reload();
	await page.getByRole('button', { name: 'Till vilka rätter: Till fiskgratäng' }).click();
	await expect(page.getByText('Fiskgratäng', { exact: true })).toBeVisible();

	// From the popup too.
	await page.getByRole('button', { name: 'Ta bort Till fiskgratäng' }).click();
	await expect(item).toHaveCount(0);
	await saved(page);
	await page.reload();
	await expect(page.getByRole('checkbox', { name: 'Till fiskgratäng' })).toHaveCount(0);

	// To the right a row is the page's, and goes back to Veckan (#105).
	const row = (await page.locator('li[data-own-swipe]').first().boundingBox())!;
	await swipeAt(page, row.x + 60, row.y + row.height / 2, 200);
	await expect(page).toHaveURL(/\/$/);
});

test('a folded section stays folded on the phone', async ({ page }) => {
	await open(page, '/handla');
	const section = page.getByRole('button', { name: /Skafferi/ });
	await expect(section).toHaveAttribute('aria-expanded', 'true');
	await section.click();
	await expect(section).toHaveAttribute('aria-expanded', 'false');
	await page.reload();
	await expect(page.getByRole('button', { name: /Skafferi/ })).toHaveAttribute(
		'aria-expanded',
		'false'
	);
	await page.getByRole('button', { name: /Skafferi/ }).click();
});

test('the guessed ingredients are written into the dish', async ({ page }) => {
	await open(page, '/ratter');
	await page.getByRole('link', { name: /Pyttipanna i handlaprovet/ }).click();
	await expect(page.getByText('Claude har gissat ingredienserna till inköpslistan.')).toBeVisible();
	await expect(page.getByText('500 g potatis')).toBeVisible();
});

test('a list made before the week changed offers to be updated', async ({ page }) => {
	await open(page, '/');
	await writeDay(page, 'onsdag', 'Linsgryta i handlaprovet');

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

test('a list being made for one week leaves the other week alone', async ({ page }) => {
	await open(page, '/handla');
	let release = () => {};
	const held = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/handla?/make', async (route) => {
		await held;
		await route.continue();
	});
	await page.getByRole('button', { name: 'Gör om listan från veckan' }).click();
	const status = page.getByRole('status').filter({ hasText: 'Claude gör listan' });
	await expect(status).toBeVisible();

	// To whichever week is not shown.
	await page
		.locator(
			'm3e-icon-button:is([aria-label="Nästa vecka"], [aria-label="Den här veckan"]):not([disabled])'
		)
		.click();
	await expect(page).toHaveURL(/vecka=/);
	await expect(status).toBeHidden();
	release();
});
