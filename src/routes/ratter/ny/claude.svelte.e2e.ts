import { expect, test } from '@playwright/test';
import { open, read, SITE } from '../../../../test/e2e';

// Photos and text are read by the stand-in for Claude in test/e2e-recipe-site.mjs. The tests
// run in order, since the last one spends the month's cap, and no other test file calls Claude.
test.describe.configure({ mode: 'serial' });

// A one-pixel PNG; the phone makes it a JPEG before it is sent.
const png = (name: string) => ({
	name,
	mimeType: 'image/png',
	buffer: Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
		'base64'
	)
});

test('photos of a recipe are read, checked and saved', async ({ page }) => {
	await open(page, '/ratter/ny');
	await page.locator('input[type=file][multiple]').setInputFiles([png('a.png'), png('b.png')]);
	await expect(page.getByRole('img', { name: 'Sida 2' })).toBeVisible();
	await expect(page.getByLabel('Länk eller recepttext (frivilligt)')).toBeVisible();
	await page.getByRole('button', { name: 'Ta bort sida 2' }).click();
	await expect(page.getByRole('img')).toHaveCount(1);
	await page.getByRole('button', { name: 'Läs in receptet' }).click();

	await expect(page.getByText('Läst från fotot. Kolla att det stämmer och spara.')).toBeVisible();
	await expect(page.getByLabel('Namn')).toHaveValue('Saffransbullar');
	await expect(page.getByLabel('Portioner')).toHaveValue('30');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Saffransbullar');
	await expect(page.getByText('50 g jäst')).toBeVisible();
});

test('pasted recipe text is read', async ({ page }) => {
	await open(page, '/ratter/ny');
	await read(page, 'Pannkakor\n3 dl vetemjöl\n6 dl mjölk');
	await expect(page.getByText('Läst ur texten. Kolla att det stämmer och spara.')).toBeVisible();
	await expect(page.getByLabel('Ingredienser, en per rad')).toHaveValue(
		'3 dl vetemjöl\n6 dl mjölk'
	);
	await expect(page.getByLabel('Gör så här')).toHaveValue('1. Blanda och laga.');
});

test('a page without JSON-LD is read from its text', async ({ page }) => {
	await open(page, '/ratter/ny');
	await page.getByLabel('Länk eller recepttext').fill(`${SITE}/utan-jsonld`);
	await expect(page.getByText('En länk till localhost')).toBeVisible();
	await page.getByRole('button', { name: 'Läs in receptet' }).click();
	await expect(
		page.getByText('Hämtat från localhost. Kolla att det stämmer och spara.')
	).toBeVisible();
	await expect(page.getByLabel('Namn')).toHaveValue('Kålsoppa');
	await expect(page.getByLabel('Länk till receptet')).toHaveValue(`${SITE}/utan-jsonld`);
});

test('a page that cannot be read can still be filled in with the link', async ({ page }) => {
	await open(page, '/ratter/ny');
	await read(page, `${SITE}/nekad`);
	await expect(page.getByRole('alert')).toHaveText(
		'Sidan gick inte att hämta. Fyll i receptet själv, med länken sparad.'
	);
	await read(page, `${SITE}/inget-recept`);
	await expect(page.getByRole('alert')).toContainText('Sidan har inget recept');

	await page.getByRole('button', { name: 'Fyll i själv, med länken sparad' }).click();
	await expect(page.getByLabel('Länk till receptet')).toHaveValue(`${SITE}/inget-recept`);
	await page.getByLabel('Namn').fill('Rotfruktsgratäng');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rotfruktsgratäng');
});

test('text without a recipe can be filled in with the text kept', async ({ page }) => {
	await open(page, '/ratter/ny');
	await read(page, 'Hej hej');
	await expect(page.getByRole('alert')).toHaveText(
		'Det gick inte att hitta något recept i texten. Fyll i det själv.'
	);
	await page.getByRole('button', { name: 'Fyll i själv' }).click();
	await expect(page.getByLabel('Gör så här')).toHaveValue('Hej hej');
});

test('nothing more is read once the month has cost the cap', async ({ page }) => {
	await open(page, '/ratter/ny');
	await read(page, 'Dyr gryta');
	await expect(page.getByLabel('Namn')).toHaveValue('Dyr gryta');

	await page.getByRole('button', { name: 'Börja om' }).click();
	await read(page, 'Pannkakor');
	await expect(page.getByRole('alert')).toHaveText(
		'Appen har läst så många recept som månadens tak tillåter. Fyll i det själv, eller vänta till nästa månad.'
	);
	await expect(page.getByRole('button', { name: 'Fyll i själv' })).toBeVisible();
});
