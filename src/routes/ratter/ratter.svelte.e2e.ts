import { expect, test } from '@playwright/test';
import { open } from '../../../test/e2e';

// The made-up data comes from test/e2e-seed.sql. Tests that change it use names of their own,
// that sort after the seeded dishes.

test('dishes are listed by how often they were eaten', async ({ page }) => {
	await open(page, '/ratter');
	const names = page.locator('m3e-list-action');
	await expect(names.first()).toContainText('Fiskgratäng');
	await expect(names.first()).toContainText('2 gånger · senast v. 3 2030');
	await page.getByRole('button', { name: 'A–Ö' }).click();
	await expect(names.first()).toContainText('Fiskgratäng');
	await expect(names.nth(1)).toContainText('Linssoppa');
});

test('a new dish is added with its name and one tap, and can be filled in', async ({ page }) => {
	await open(page, '/ratter');
	const search = page.getByRole('searchbox', { name: 'Sök eller lägg till rätt' });
	await search.fill('Ärtsoppa');
	await page.getByRole('button', { name: 'Lägg till ”Ärtsoppa”' }).click();
	await expect(page.getByText('Ärtsoppa är tillagd')).toBeVisible();
	await expect(search).toHaveValue('');

	await page.locator('m3e-list-action', { hasText: 'Ärtsoppa' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ärtsoppa');
	await expect(page.getByText('Rätten har bara ett namn.')).toBeVisible();

	await page.locator('m3e-button', { hasText: 'Skriv in själv' }).click();
	await page.getByLabel('Portioner').fill('4');
	await page.getByLabel('Ingredienser').fill('500 g köttfärs\n1 vitkål');
	await page.locator('m3e-switch#lunchbox').click();
	await page.getByRole('button', { name: 'Spara' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ärtsoppa');
	await expect(page.getByText('4 portioner')).toBeVisible();
	await expect(page.getByText('Passar till matlådor')).toBeVisible();
	await expect(page.getByText('1 vitkål')).toBeVisible();
});

test('Claude sorts the dishes in the background, and a sort chosen by hand stays', async ({
	page
}) => {
	await open(page, '/ratter');
	// The stand-in for Claude puts soups under Soppor and the rest under Fisk, with potatoes.
	await expect(async () => {
		await open(page, '/ratter/2');
		await expect(page.getByText('Soppor', { exact: true })).toBeVisible({ timeout: 1000 });
	}).toPass();
	await expect(page.getByText('Sort och bas gissade av Claude.')).toBeVisible();

	const search = page.getByRole('searchbox', { name: 'Sök eller lägg till rätt' });
	await open(page, '/ratter');
	await search.fill('Viltgryta');
	await page.getByRole('button', { name: 'Lägg till ”Viltgryta”' }).click();
	await expect(page.getByText('Viltgryta är tillagd')).toBeVisible();
	await expect(async () => {
		await open(page, '/ratter');
		await page.locator('m3e-list-action', { hasText: 'Viltgryta' }).click();
		await expect(page.getByText('Potatis', { exact: true })).toBeVisible({ timeout: 1000 });
	}).toPass();

	await page.locator('m3e-icon-button[aria-label="Redigera"]').click();
	await expect(page.getByText('Claude gissade sort och bas.')).toBeVisible();
	await page.getByText('Kött', { exact: true }).click();
	await page.getByText('Ris', { exact: true }).click();
	await page.getByRole('button', { name: 'Spara' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Viltgryta');
	await expect(page.getByText('Kött', { exact: true })).toBeVisible();
	await expect(page.getByText('Ris', { exact: true })).toBeVisible();
	await expect(page.getByText('Sort och bas gissade av Claude.')).toHaveCount(0);
});

test('the steps are numbered, the cards fold away, and Spara stays on top', async ({ page }) => {
	await open(page, '/ratter');
	const search = page.getByRole('searchbox', { name: 'Sök eller lägg till rätt' });
	await search.fill('Ugnspannkaka');
	await page.getByRole('button', { name: 'Lägg till ”Ugnspannkaka”' }).click();
	await expect(page.getByText('Ugnspannkaka är tillagd')).toBeVisible();
	await page.locator('m3e-list-action', { hasText: 'Ugnspannkaka' }).click();
	await page.locator('m3e-button', { hasText: 'Skriv in själv' }).click();

	await page.getByLabel('Ingredienser').fill('3 ägg\n6 dl mjölk');
	await page.getByLabel('Gör så här').fill('Vispa ihop allt.\n\nGrädda i 225 grader.');
	await page.getByLabel('Länk till receptet').scrollIntoViewIfNeeded();
	expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
	const save = page.getByRole('button', { name: 'Spara' });
	await expect(save).toBeInViewport();
	await save.click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ugnspannkaka');
	await expect(page.locator('ol li')).toHaveText([/^1\s*Vispa ihop allt\.$/, /^2\s*Grädda/]);
	const ingredients = page.getByRole('button', { name: /Ingredienser/ });
	await expect(ingredients).toHaveAttribute('aria-expanded', 'true');
	await ingredients.click();
	await expect(ingredients).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByText('6 dl mjölk')).toBeHidden();
	await ingredients.click();
	await expect(page.getByText('6 dl mjölk')).toBeVisible();
});

test('the weeks with a dish are folded away at first', async ({ page }) => {
	await open(page, '/ratter/1');
	const weeks = page.getByRole('button', { name: /Veckor med rätten/ });
	await expect(weeks).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator('m3e-list-action', { hasText: 'Vecka 3 2030' })).toBeHidden();
	await weeks.click();
	await expect(page.locator('m3e-list-action', { hasText: 'Vecka 3 2030' })).toBeVisible();
});

test('a dish cannot take the name of another', async ({ page }) => {
	await open(page, '/ratter/2/redigera');
	await page.getByLabel('Namn').fill('fiskgratäng');
	await page.getByRole('button', { name: 'Spara' }).click();
	await expect(page.getByRole('alert')).toHaveText(
		'Det finns redan en rätt som heter fiskgratäng.'
	);
});

test('the old weeks show dishes and lines without a dish', async ({ page }) => {
	await open(page, '/veckor');
	await expect(page.getByText('Vecka 3 2030')).toBeVisible();
	await expect(page.getByText('14 – 20 januari')).toBeVisible();
	// Other tests may add weeks of their own, so this looks in the seeded week.
	await expect(page.locator('#vecka-1').getByText('Rester')).toBeVisible();
	await page.getByRole('link', { name: 'Fiskgratäng' }).first().click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fiskgratäng');
});

test('the menu leads to each main view and marks the one shown', async ({ page }) => {
	const menu = page.getByRole('navigation', { name: 'Huvudmeny' });
	await open(page, '/');
	await expect(menu.getByRole('link', { name: 'Veckan' })).toHaveAttribute('aria-current', 'page');
	for (const [label, path] of [
		['Handla', '/handla'],
		['Rätter', '/ratter'],
		['Veckor', '/veckor'],
		['Veckan', '/']
	]) {
		await menu.getByRole('link', { name: label }).click();
		await expect(page).toHaveURL(path);
		await expect(menu.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
	}
});

test('the menu is tapped, not the dish behind it', async ({ page }) => {
	// A short screen puts the dishes behind the menu, as a long list does on the phone.
	await page.setViewportSize({ width: 412, height: 360 });
	for (const [label, path] of [
		['Veckan', '/'],
		['Handla', '/handla'],
		['Veckor', '/veckor']
	]) {
		await open(page, '/ratter');
		const box = await page
			.getByRole('navigation', { name: 'Huvudmeny' })
			.getByRole('link', { name: label })
			.boundingBox();
		await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
		await expect(page).toHaveURL(path);
	}
});

test('the last dish can be scrolled up above the menu and tapped', async ({ page }) => {
	await page.setViewportSize({ width: 412, height: 360 });
	await open(page, '/ratter');
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	const last = page.locator('m3e-list-action').last();
	const dish = (await last.boundingBox())!;
	const menu = (await page.getByRole('navigation', { name: 'Huvudmeny' }).boundingBox())!;
	expect(dish.y + dish.height).toBeLessThan(menu.y);
	await page.touchscreen.tap(dish.x + dish.width / 2, dish.y + dish.height / 2);
	await expect(page).toHaveURL(/\/ratter\/\d+$/);
});

test('the plus button on Rätter opens Ny rätt', async ({ page }) => {
	await open(page, '/ratter');
	await page.getByRole('link', { name: 'Ny rätt' }).click();
	await expect(page).toHaveURL('/ratter/ny');
	// The button belongs to Rätter, so the other views have none.
	await open(page, '/veckor');
	await expect(page.getByRole('link', { name: 'Ny rätt' })).toHaveCount(0);
});
