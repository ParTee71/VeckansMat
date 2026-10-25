import { expect, test } from '@playwright/test';
import { open, read, SITE } from '../../../../test/e2e';

// The dishes come from test/e2e-seed.sql; new ones have names that sort after the seeded
// dishes. Pages without JSON-LD are read by Claude, so those tests are in claude.svelte.e2e.ts.

test('a recipe is read from a link, checked and saved', async ({ page }) => {
	await open(page, '/ratter');
	await page.locator('m3e-fab', { hasText: 'Nytt recept' }).click();
	await expect(page).toHaveURL('/ratter/ny');
	await read(page, `${SITE}/pumpasoppa`);

	await expect(
		page.getByText('Hämtat från localhost. Kolla att det stämmer och spara.')
	).toBeVisible();
	await expect(page.getByLabel('Namn')).toHaveValue('Pumpasoppa med ingefära');
	await expect(page.getByLabel('Portioner')).toHaveValue('4');
	await expect(page.getByLabel('Tid i minuter')).toHaveValue('35');
	await expect(page.getByLabel('Ingredienser, en per rad')).toHaveValue(
		'1 kg pumpa\n1 msk riven ingefära\n8 dl grönsaksbuljong'
	);
	await expect(page.getByLabel('Gör så här')).toHaveValue(
		'1. Skala och tärna pumpan.\n2. Koka allt mjukt och mixa.'
	);
	await page.getByRole('button', { name: 'Spara' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pumpasoppa med ingefära');
	await expect(page.getByText('1 msk riven ingefära')).toBeVisible();
});

test('a link in the search field fills in the dish that has only the name', async ({ page }) => {
	await open(page, '/ratter');
	await page.getByRole('searchbox', { name: 'Sök eller lägg till rätt' }).fill(`${SITE}/linssoppa`);
	await page.getByRole('button', { name: 'Hämta receptet' }).click();

	await expect(page.getByText('Linssoppa finns redan')).toBeVisible();
	await expect(
		page.getByText('Den har bara ett namn och har ätits 2 gånger. Spara fyller i den')
	).toBeVisible();
	await page.getByRole('button', { name: 'Spara' }).click();

	await expect(page).toHaveURL('/ratter/2');
	await expect(page.getByText('3 dl röda linser')).toBeVisible();
	await expect(page.getByText('Ätits 2 gånger')).toBeVisible();

	// Going back does not read the link again.
	let readAgain = false;
	page.on('request', (request) => {
		if (request.url().includes('?/read')) readAgain = true;
	});
	await page.goBack();
	await expect(page.getByLabel('Länk eller recepttext')).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect(readAgain).toBe(false);
});

test('a dish with only a name is filled in from its own page and keeps its name', async ({
	page
}) => {
	// Tags and the lunch box switch do not make it more than a name, and are kept.
	await open(page, '/ratter/3/redigera');
	await page.getByLabel('Taggar, med komma emellan').fill('bröd');
	await page.locator('m3e-switch#lunchbox').click();
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page).toHaveURL('/ratter/3');

	await page.locator('m3e-button', { hasText: 'Hämta från länk, foto eller text' }).click();
	await read(page, `${SITE}/nekad`);
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(
		page.getByText(
			'Klistra in en länk eller texten till receptet på Ostfrallor, eller fotografera det.'
		)
	).toBeVisible();
	await read(page, `${SITE}/frallor`);

	await expect(page.getByText('Fyller i Ostfrallor.')).toBeVisible();
	await expect(page.getByLabel('Namn')).toHaveValue('Ostfrallor');
	await page.getByRole('button', { name: 'Spara' }).click();

	await expect(page).toHaveURL('/ratter/3');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ostfrallor');
	await expect(page.getByText('2 dl riven ost')).toBeVisible();
	await expect(page.getByText('bröd')).toBeVisible();
	await expect(page.getByText('Passar till matlådor')).toBeVisible();

	// Now that it has more than a name, an old link to fill it in shows it instead.
	await page.goto('/ratter/ny?till=3');
	await expect(page).toHaveURL('/ratter/3');
});

test('a recipe is not saved over a dish that already has ingredients', async ({ page }) => {
	await open(page, '/ratter/ny');
	await read(page, `${SITE}/fiskgratang`);
	await expect(page.getByText('Fiskgratäng finns redan')).toBeVisible();
	// The notice is there before the save too, so the answer is awaited: it fills the form
	// again, and would undo a name written before it came.
	const saved = page.waitForResponse((response) => response.url().includes('?/save'));
	await page.getByRole('button', { name: 'Spara' }).click();
	await saved;
	await expect(page.getByText('Fiskgratäng finns redan')).toBeVisible();
	await expect(page).toHaveURL(/\/ratter\/ny/);

	await page.getByLabel('Namn').fill('Rödspätta i ugn');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rödspätta i ugn');
});
