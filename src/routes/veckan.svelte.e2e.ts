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
	const people = ['Ätare Ett', 'Ätare Två'];
	for (const name of people) {
		await open(page, '/hushallet/ny');
		await page.getByLabel('Namn').fill(name);
		await page.getByLabel('Krav').fill(`${name} äter inte svamp`);
		await page.getByRole('button', { name: 'Spara' }).click();
		await expect(page.locator('m3e-list-action', { hasText: name })).toBeVisible();
	}

	await open(page, '/');
	const chips = people.map((name) => page.locator('m3e-filter-chip', { hasText: name }));
	await expect(chips[0]).not.toHaveAttribute('selected');
	// Two quick taps both count, even before the first is saved.
	const saved = page.waitForResponse((r) => r.url().includes('/eaters'));
	await chips[0].click();
	await chips[1].click();
	await saved;
	await expect(page.getByText('Ätare Två: Ätare Två äter inte svamp')).toBeVisible();
	await page.waitForLoadState('networkidle');
	await page.reload();
	for (const chip of chips) await expect(chip).toHaveAttribute('selected');

	// The people are made up for this test, so they are removed again.
	for (const name of people) {
		await open(page, '/hushallet');
		await page.locator('m3e-list-action', { hasText: name }).click();
		await page.getByRole('button', { name: `Ta bort ${name}` }).click();
		await expect(page.locator('m3e-list-action', { hasText: name })).toHaveCount(0);
	}
});

test('the arrows go between this week and the next', async ({ page }) => {
	await open(page, '/');
	const dates = page.locator('.subtitle');
	const first = await dates.textContent();
	// Only the arrow to the other week is a link.
	const arrow = page.locator('m3e-icon-button[href]');
	await expect(arrow).toHaveCount(1);
	await arrow.click();
	await expect(dates).not.toHaveText(first!);
});

test('Claude suggests the week, and a day is swapped with one tap', async ({ page }) => {
	// The other week than the one the first test writes in.
	await open(page, '/');
	await page.locator('m3e-icon-button[href]').click();
	await expect(page.getByRole('button', { name: 'Middag måndag: tom' })).toBeVisible();

	// When Claude fails, the week can be written by hand or asked for again.
	await page.getByLabel('Något särskilt den här veckan?').fill('Krascha');
	await page.locator('m3e-button', { hasText: 'Föreslå veckan' }).click();
	await expect(page.getByRole('alert')).toHaveText(/Claude kunde inte föreslå något just nu/);
	await expect(page.getByRole('button', { name: 'Middag måndag: tom' })).toBeVisible();

	// A wish stays while a day is written by hand, and the day stays when Claude suggests.
	await page.getByLabel('Något särskilt den här veckan?').fill('Något med pumpa');
	await page.getByRole('button', { name: /^Middag tisdag/ }).click();
	await page.getByRole('textbox', { name: 'Middag tisdag' }).fill('Ärtsoppa');
	await page.keyboard.press('Enter');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Middag tisdag: Ärtsoppa' })).toBeVisible();
	await expect(page.getByLabel('Något särskilt den här veckan?')).toHaveValue('Något med pumpa');
	await page.locator('m3e-button', { hasText: 'Föreslå veckan' }).click();
	const monday = (dish: string) => page.getByRole('button', { name: `Middag måndag: ${dish}` });
	await expect(monday('Blomkålssoppa')).toBeVisible();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(monday('Blomkålssoppa')).toContainText('Senast v. 36');
	await expect(page.getByRole('button', { name: 'Middag söndag: Pannkakor' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lunch lördag: Varm korv' })).toBeVisible();

	// A swap takes the next dish at once, and can be undone.
	await page.locator('m3e-icon-button[aria-label="Byt Middag måndag"]').click();
	await expect(monday('Pytt i panna')).toBeVisible();
	const snackbar = page.locator('m3e-snackbar');
	await expect(snackbar).toContainText('Blomkålssoppa byttes mot Pytt i panna');
	await snackbar.getByRole('button', { name: 'Ångra' }).click();
	await expect(monday('Blomkålssoppa')).toBeVisible();

	// Past the alternatives, Claude is asked for new dishes for the day.
	for (const dish of ['Pytt i panna', 'Korv stroganoff', 'Fiskpinnar']) {
		await page.locator('m3e-icon-button[aria-label="Byt Middag måndag"]').click();
		await expect(monday(dish)).toBeVisible();
	}

	// A new suggestion for the whole week keeps what was written by hand.
	await page.locator('m3e-icon-button[aria-label="Nytt förslag på hela veckan"]').click();
	await expect(monday('Blomkålssoppa')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Middag tisdag: Ärtsoppa' })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Middag tisdag: Ärtsoppa' })).toBeVisible();
	await expect(monday('Blomkålssoppa')).toBeVisible();
});
