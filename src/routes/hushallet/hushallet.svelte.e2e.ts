import { expect, test } from '@playwright/test';
import { open } from '../../../test/e2e';

// Made-up people only. The tests share one database, so they run in order.
test.describe.configure({ mode: 'serial' });

test('a person is added with what they do not eat, changed and removed', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('button', { name: /äter$/ }).click();
	await page.getByRole('link', { name: 'Ändra personer och regler' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hushållet');
	await expect(page.locator('m3e-list-action', { hasText: 'Kim' })).toHaveCount(0);

	await page.locator('m3e-button', { hasText: 'Lägg till person' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ny person');
	// Only spaces passes the browser's check of the required field, and not the server's.
	await page.getByLabel('Namn').fill('  ');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('alert')).toHaveText('Skriv ett namn.');

	await page.getByLabel('Namn').fill('Kim');
	await page.getByLabel('Krav').fill('Äter inte fisk\nTål inte nötter');
	await page.getByRole('button', { name: 'Spara' }).click();
	const kim = page.locator('m3e-list-action', { hasText: 'Kim' });
	await expect(kim).toContainText('Äter inte fisk');

	await kim.click();
	await page.getByLabel('Namn').fill('Kim Test');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.locator('m3e-list-action', { hasText: 'Kim Test' })).toBeVisible();

	await page.locator('m3e-list-action', { hasText: 'Kim Test' }).click();
	await page.getByRole('button', { name: 'Ta bort Kim Test' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hushållet');
	await expect(page.locator('m3e-list-action', { hasText: 'Kim Test' })).toHaveCount(0);
});

test('the rules for every week are saved as they are changed', async ({ page }) => {
	await open(page, '/hushallet');
	const rules = page.getByLabel('Skriv som till en person, en regel per rad');
	// Each change is saved on its own, so the test waits for each save before the next change.
	const saving = () => page.waitForResponse((r) => r.url().includes('/settings'));
	await rules.fill('Fisk en gång i veckan.\nVegetariskt på måndagar.');
	let saved = saving();
	await rules.blur();
	await saved;
	saved = saving();
	await page.getByRole('button', { name: 'Fler nya rätter' }).click();
	await saved;
	saved = saving();
	await page.getByRole('button', { name: '1 extra portion', exact: true }).click();
	await saved;

	await page.reload();
	await expect(rules).toHaveValue('Fisk en gång i veckan.\nVegetariskt på måndagar.');
	await expect(page.getByRole('status')).toHaveText('2');
	// m3e drops aria-pressed from a button that is not a toggle, so the variant shows the choice.
	await expect(page.getByRole('button', { name: '1 extra portion', exact: true })).toHaveAttribute(
		'variant',
		'filled'
	);
});
