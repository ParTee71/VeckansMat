import { expect, test } from '@playwright/test';
import { open, saved } from '../../../test/e2e';

// Made-up people only. The tests share one database, so they run in order.
test.describe.configure({ mode: 'serial' });

test('a person is added with what they do not eat, changed and removed', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('link', { name: /^Konto och inställningar/ }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inställningar');
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
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inställningar');
	await expect(page.locator('m3e-list-action', { hasText: 'Kim Test' })).toHaveCount(0);
});

test('the rules for every week are saved as they are changed', async ({ page }) => {
	await open(page, '/installningar');
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
	await expect(page.getByRole('status', { name: 'Nya rätter per vecka' })).toHaveText('2');
	// m3e drops aria-pressed from a button that is not a toggle, so the variant shows the choice.
	await expect(page.getByRole('button', { name: '1 extra portion', exact: true })).toHaveAttribute(
		'variant',
		'filled'
	);
});

test('how often the same dish may come is saved as it is changed', async ({ page }) => {
	await open(page, '/installningar');
	const ordinary = page.getByRole('status', { name: /^Vanliga rätter/ });
	const favourites = page.getByRole('status', { name: /^Favoriter/ });
	await expect(ordinary).toHaveText('4');
	await expect(favourites).toHaveText('2');

	const saving = () => page.waitForResponse((r) => r.url().includes('/settings'));
	let saved = saving();
	await page.getByRole('button', { name: 'Fler veckor för favoriter' }).click();
	await saved;
	await expect(favourites).toHaveText('3');
	// A favourite never waits longer than other dishes.
	saved = saving();
	await page.getByRole('button', { name: 'Fler veckor för favoriter' }).click();
	await saved;
	await expect(page.getByRole('button', { name: 'Fler veckor för favoriter' })).toHaveAttribute(
		'disabled'
	);
	saved = saving();
	await page.getByRole('button', { name: 'Färre veckor för vanliga rätter' }).click();
	await saved;
	await expect(ordinary).toHaveText('3');
	await expect(favourites).toHaveText('3');
	await expect(page.getByText('tidigast efter 3 veckor')).toHaveCount(2);

	await page.reload();
	await expect(ordinary).toHaveText('3');
	await expect(favourites).toHaveText('3');
});

test('chains and a store are chosen for the offers, and fetched at once', async ({ page }) => {
	// Reached from Veckan, as the app's components are then already there (#116).
	await open(page, '/');
	await page.getByRole('link', { name: /^Konto och inställningar/ }).click();

	const lidl = page.getByRole('region', { name: 'Lidl' });
	await lidl.getByRole('switch', { name: 'Lidl' }).click();
	await expect(lidl).toContainText('Samma erbjudanden i alla butiker');
	await expect(page.getByText(/Senast .+: 3 erbjudanden\./)).toBeVisible();

	// Switched on without a store, ICA asks for one. The made-up site stands in for ica.se.
	const ica = page.getByRole('region', { name: 'ICA' });
	await ica.getByRole('switch', { name: 'ICA' }).click();
	await expect(page.getByText('Välj ICA-butik')).toBeVisible();
	await expect(page.getByRole('searchbox', { name: 'Sök på ort eller butik' })).toBeInViewport();
	await page.getByRole('searchbox', { name: 'Sök på ort eller butik' }).fill('exempelby');
	await page.getByRole('searchbox', { name: 'Sök på ort eller butik' }).press('Enter');
	await page.getByRole('button', { name: /ICA Supermarket Exempelby/ }).click();
	await expect(ica).toContainText('ICA Supermarket Exempelby');
	await expect(page.getByText(/Senast .+: 5 erbjudanden\./)).toBeVisible();

	// Coop's page is read in a browser on Cloudflare; here the made-up site answers in its place.
	const coop = page.getByRole('region', { name: 'Coop' });
	await coop.getByRole('switch', { name: 'Coop' }).click();
	await expect(page.getByText('Välj Coop-butik')).toBeVisible();
	await page.getByRole('searchbox', { name: 'Sök på ort eller butik' }).fill('exempelby');
	await page.getByRole('searchbox', { name: 'Sök på ort eller butik' }).press('Enter');
	await page.getByRole('button', { name: /Stora Coop Exempelby/ }).click();
	await expect(coop).toContainText('Stora Coop Exempelby');
	await expect(page.getByText(/Senast .+: 9 erbjudanden\./)).toBeVisible();

	await saved(page);
	await lidl.getByRole('switch', { name: 'Lidl' }).click();
	await expect(page.getByText(/: 6 erbjudanden\./)).toBeVisible();
	await page.getByRole('switch', { name: 'Räkna med medlemspriser' }).click();

	await open(page, '/installningar');
	await expect(ica.getByRole('switch', { name: 'ICA' })).toHaveAttribute('checked');
	await expect(ica.getByRole('button', { name: 'Byt butik' })).toBeVisible();
	await expect(lidl.getByRole('switch', { name: 'Lidl' })).not.toHaveAttribute('checked');
	await expect(page.getByRole('switch', { name: 'Räkna med medlemspriser' })).not.toHaveAttribute(
		'checked'
	);
});
