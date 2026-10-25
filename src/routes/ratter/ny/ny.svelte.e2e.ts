import { expect, test, type Page } from '@playwright/test';

// Links point at the made-up recipe site in test/e2e-recipe-site.mjs. The dishes come from
// test/e2e-seed.sql; new ones have names that sort after the seeded dishes.
const SITE = 'http://localhost:4174';

async function open(page: Page, path: string) {
	await page.goto(path);
	await expect.poll(() => page.evaluate(() => !!customElements.get('m3e-fab'))).toBe(true);
}

async function readLink(page: Page, link: string) {
	await page.getByLabel('Länk till receptet').fill(link);
	await page.getByRole('button', { name: 'Läs in receptet' }).click();
}

test('a recipe is read from a link, checked and saved', async ({ page }) => {
	await open(page, '/ratter');
	await page.locator('m3e-fab', { hasText: 'Nytt recept' }).click();
	await expect(page).toHaveURL('/ratter/ny');
	await readLink(page, `${SITE}/pumpasoppa`);

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

	await page.locator('m3e-button', { hasText: 'Hämta från en länk' }).click();
	await readLink(page, `${SITE}/nekad`);
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.getByText('Klistra in en länk till receptet på Ostfrallor.')).toBeVisible();
	await readLink(page, `${SITE}/frallor`);

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
	await readLink(page, `${SITE}/fiskgratang`);
	await expect(page.getByText('Fiskgratäng finns redan')).toBeVisible();
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByText('Fiskgratäng finns redan')).toBeVisible();
	await expect(page).toHaveURL(/\/ratter\/ny/);

	await page.getByLabel('Namn').fill('Rödspätta i ugn');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rödspätta i ugn');
});

test('a page that cannot be read can still be filled in with the link', async ({ page }) => {
	await open(page, '/ratter/ny');
	await readLink(page, `${SITE}/nekad`);
	await expect(page.getByRole('alert')).toHaveText(
		'Sidan gick inte att hämta. Fyll i receptet själv, med länken sparad.'
	);
	await readLink(page, `${SITE}/inget-recept`);
	await expect(page.getByRole('alert')).toContainText('Sidan har inget recept');

	await page.getByRole('button', { name: 'Fyll i själv, med länken sparad' }).click();
	await expect(page.getByLabel('Länk till receptet')).toHaveValue(`${SITE}/inget-recept`);
	await page.getByLabel('Namn').fill('Rotfruktsgratäng');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rotfruktsgratäng');
});

test('text that is not a link is not read yet', async ({ page }) => {
	await open(page, '/ratter/ny');
	await readLink(page, 'Pannkakor\n3 dl vetemjöl');
	await expect(page.getByRole('alert')).toHaveText(
		'Än så länge går bara länkar att läsa. Text och foton kommer snart.'
	);
	await expect(page.getByLabel('Länk till receptet')).toHaveValue('Pannkakor\n3 dl vetemjöl');
});
