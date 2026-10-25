import { expect, test } from '@playwright/test';
import { open } from '../../test/e2e';

// The made-up dishes come from test/e2e-seed.sql. Veckan shows this week or the next, so the
// tests do not depend on which day they run.
test.describe.configure({ mode: 'serial' });

test('a week is written as quickly as on a note', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('button', { name: /^Middag måndag/ }).click();
	await page.getByRole('textbox', { name: 'Middag måndag' }).fill('fiskgr');
	await page.getByRole('button', { name: /^Fiskgratäng/ }).click();
	await expect(page.getByRole('button', { name: 'Middag måndag: Fiskgratäng' })).toBeVisible();

	// Enter writes the day and goes on to the next.
	await page.getByRole('button', { name: /^Middag tisdag/ }).click();
	await page.getByRole('textbox', { name: 'Middag tisdag' }).fill('Ärtgryta med bacon');
	await expect(page.getByRole('button', { name: 'Ny rätt: ”Ärtgryta med bacon”' })).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('textbox', { name: 'Middag onsdag' })).toBeFocused();
	await page.getByRole('button', { name: 'Rester', exact: true }).click();

	// Lunch on a weekday.
	await page.locator('m3e-button', { hasText: 'Lunch en vardag' }).click();
	await page.getByRole('group', { name: 'Välj dag för lunch' }).getByText('Tor').click();
	await page.getByRole('textbox', { name: 'Lunch torsdag' }).fill('Ostfrallor');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: 'Lunch torsdag: Ostfrallor' })).toBeVisible();

	await page.reload();
	await expect(page.getByRole('button', { name: 'Middag måndag: Fiskgratäng' })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Middag tisdag: Ärtgryta med bacon' })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Middag onsdag: Rester' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lunch torsdag: Ostfrallor' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lunch lördag: tom' })).toBeVisible();

	// The new dish is a recipe with just a name, and the week is among the old weeks.
	await open(page, '/ratter');
	await expect(page.locator('m3e-list-action', { hasText: 'Ärtgryta med bacon' })).toBeVisible();

	// Emptying a day takes it off the week.
	await open(page, '/');
	await page.getByRole('button', { name: 'Middag onsdag: Rester' }).click();
	await page.getByRole('button', { name: 'Töm raden' }).click();
	await expect(page.getByRole('button', { name: 'Middag onsdag: tom' })).toBeVisible();
});

test('who eats is chosen per week, and shows what they do not eat', async ({ page }) => {
	await open(page, '/hushallet/ny');
	await page.getByLabel('Namn').fill('Ätare Test');
	await page.getByLabel('Krav').fill('Äter inte svamp');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.locator('m3e-list-action', { hasText: 'Ätare Test' })).toBeVisible();

	await open(page, '/');
	const chip = page.locator('m3e-filter-chip', { hasText: 'Ätare Test' });
	await expect(chip).not.toHaveAttribute('selected');
	const saved = page.waitForResponse((r) => r.url().includes('/eaters'));
	await chip.click();
	await saved;
	await expect(page.getByText('Ätare Test: Äter inte svamp')).toBeVisible();
	await page.reload();
	await expect(chip).toHaveAttribute('selected');
});

test('the arrows go between this week and the next', async ({ page }) => {
	await open(page, '/');
	const dates = page.locator('.dates');
	const first = await dates.textContent();
	// Only the arrow to the other week is a link.
	const arrow = page.locator('m3e-icon-button[href]');
	await expect(arrow).toHaveCount(1);
	await arrow.click();
	await expect(dates).not.toHaveText(first!);
});
