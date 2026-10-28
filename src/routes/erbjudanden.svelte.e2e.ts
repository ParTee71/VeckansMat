import { expect, test } from '@playwright/test';
import { open } from '../../test/e2e';
import { mondayOf, swedishToday } from '../lib/weeks';

// This week, empty, whatever day the tests run; from Wednesday Veckan shows the next by itself.
const thisWeek = `/?vecka=${mondayOf(swedishToday())}`;

// The made-up offers come from test/e2e-offers.sql, on a Worker of their own.
test('a dish chosen for an offer shows its price tag, which opens the offers', async ({ page }) => {
	await open(page, thisWeek);
	await expect(page.getByText('Med erbjudanden från ICA och Willys.')).toBeVisible();
	await page.locator('m3e-icon-button[href]').click();
	await expect(
		page.getByText('Med erbjudandena som gäller nu, när ni handlar: ICA och Willys.')
	).toBeVisible();

	await page.locator('m3e-button', { hasText: 'Föreslå veckan' }).click();
	const monday = page.getByRole('button', { name: 'Middag måndag: Blomkålssoppa' });
	await expect(monday).toBeVisible();
	// The price tag stands where the reason would.
	await expect(monday).not.toContainText('Senast v. 36');
	const tag = page.getByRole('button', { name: /^Erbjudande: Kycklingfilé 99 kr\/kg · ICA/ });
	await expect(tag).toBeVisible();
	await expect(page.getByRole('button', { name: /^Erbjudande:/ })).toHaveCount(1);

	await tag.click();
	const sheet = page.locator('m3e-bottom-sheet', { hasText: 'Veckans erbjudanden' });
	await expect(sheet.getByRole('heading', { name: 'I veckans meny' })).toBeVisible();
	await expect(sheet.getByRole('listitem').first()).toContainText(
		'Kycklingfilé 99 kr/kg ICA · medlemspris · t.o.m. 31 december Mån'
	);
	await expect(sheet.getByRole('heading', { name: 'Övriga' })).toBeVisible();
	await expect(sheet).toContainText('Nötfärs 12 %');
	await expect(sheet).toContainText('jfr 89 kr/kg');
	// What no dinner is made of is not listed.
	await expect(sheet).not.toContainText('Läsk');

	// A chain at a time.
	await sheet.locator('m3e-filter-chip', { hasText: 'Willys 2' }).click();
	await expect(sheet.getByRole('heading', { name: 'I veckans meny' })).toHaveCount(0);
	await expect(sheet.getByRole('listitem')).toHaveCount(2);
	await sheet.locator('m3e-filter-chip', { hasText: 'Alla 3' }).click();
	await expect(sheet.getByRole('listitem')).toHaveCount(3);
	await page.keyboard.press('Escape');

	// Inställningar opens the same offers.
	await open(page, '/installningar');
	await page.locator('m3e-button', { hasText: 'Visa veckans erbjudanden' }).click();
	await expect(sheet.getByRole('listitem')).toHaveCount(3);
	await expect(sheet.getByRole('heading', { name: 'I veckans meny' })).toHaveCount(0);
	await page.keyboard.press('Escape');

	// Without offers, the planning card says nothing about them.
	for (const chain of ['ICA', 'Willys']) {
		await page.getByRole('region', { name: chain }).getByRole('switch', { name: chain }).click();
	}
	await open(page, thisWeek);
	await expect(page.locator('m3e-button', { hasText: 'Föreslå veckan' })).toBeVisible();
	await expect(page.getByText(/^Med erbjudanden/)).toHaveCount(0);
});
