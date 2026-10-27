import { expect, test, type Locator } from '@playwright/test';
import { countLoads, open, saved, writeDay } from '../../test/e2e';
import { shownWeek, swedishToday } from '../lib/weeks';

// The made-up dishes come from test/e2e-seed.sql. Veckan shows this week or the next, so the
// tests do not depend on which day they run.
test.describe.configure({ mode: 'serial' });

test('a week is written as quickly as on a note', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('button', { name: /^Middag måndag/ }).click();
	await page.getByRole('textbox', { name: 'Middag måndag' }).fill('fiskgr');
	await page.getByRole('button', { name: /^Fiskgratäng/ }).click();
	await expect(page.getByRole('button', { name: 'Middag måndag: Fiskgratäng' })).toBeVisible();

	// Writing a day does not load the page again, so nothing on it jumps.
	const loads = countLoads(page);

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
	// The lunch stands under its day's dinner on the menu.
	await expect(
		page
			.getByRole('listitem')
			.filter({ has: page.getByRole('button', { name: /^Middag torsdag/ }) })
			.getByRole('button', { name: 'Lunch torsdag: Ostfrallor' })
	).toBeVisible();

	await saved(page);
	expect(loads()).toBe(0);
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

test('a day is written with the keyboard alone', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('button', { name: /^Middag fredag/ }).click();
	await page.getByRole('textbox', { name: 'Middag fredag' }).fill('linss');
	// Tab goes past the clear button to the suggestion, without writing what is typed.
	await page.keyboard.press('Tab');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: /^Linssoppa/ })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: 'Middag fredag: Linssoppa' })).toBeVisible();

	await page.getByRole('button', { name: 'Middag fredag: Linssoppa' }).click();
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: 'Töm raden' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: 'Middag fredag: tom' })).toBeVisible();

	await open(page, '/ratter');
	await expect(page.getByText('linss', { exact: true })).toHaveCount(0);
});

test('a day is chosen without writing, from the usual dishes or all of them', async ({ page }) => {
	// Reached from another view, as the app's components are then already there (#116).
	await open(page, '/ratter');
	await page.getByRole('link', { name: 'Veckan' }).click();
	const loads = countLoads(page);
	const sunday = page.getByRole('textbox', { name: 'Middag söndag' });

	// The usual dishes show before anything is written. The favourite Ostfrallor is not among
	// them, since the first test wrote it on the week.
	await page.getByRole('button', { name: /^Middag söndag/ }).click();
	const usual = page.locator('.suggestions button');
	await expect(usual).toHaveText([/^Linssoppa/, 'Alla rätter']);
	await usual.first().click();
	await expect(page.getByRole('button', { name: 'Middag söndag: Linssoppa' })).toBeVisible();

	// A day with a dish opens with it selected, so writing replaces it, and a dish already on the
	// week is not offered again.
	await page.getByRole('button', { name: 'Middag söndag: Linssoppa' }).click();
	await expect(sunday).toHaveValue('Linssoppa');
	expect(await sunday.evaluate((input: HTMLInputElement) => input.selectionEnd)).toBe(9);
	expect(await sunday.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(0);
	await expect(page.getByRole('button', { name: /^Linssoppa/ })).toHaveCount(0);
	await page.keyboard.type('Fisk');
	await expect(sunday).toHaveValue('Fisk');
	await page.keyboard.press('Escape');

	// All the dishes, by sort and by what is written, and a new one.
	await page.getByRole('button', { name: 'Middag söndag: Linssoppa' }).click();
	await page.getByRole('button', { name: 'Alla rätter' }).click();
	const sheet = page.locator('m3e-bottom-sheet', { hasText: 'Middag söndag' });
	await expect(sheet.getByRole('button', { name: /^Linssoppa/ })).toBeVisible();
	await sheet.locator('m3e-filter-chip', { hasText: 'Fisk' }).click();
	await expect(sheet.getByRole('button', { name: /^Fiskgratäng/ })).toBeVisible();
	await expect(sheet.getByRole('button', { name: /^Linssoppa/ })).toHaveCount(0);
	await sheet.locator('m3e-filter-chip', { hasText: 'Fisk' }).click();
	const search = sheet.getByRole('searchbox', { name: 'Sök eller skriv en ny rätt' });
	await expect(search).toBeInViewport();
	await search.fill('soppa');
	await expect(sheet.getByRole('button', { name: /^Linssoppa/ })).toBeVisible();
	await expect(sheet.getByRole('button', { name: /^Fiskgratäng/ })).toHaveCount(0);
	await search.fill('Ugnsomelett');
	await sheet.getByRole('button', { name: 'Ny rätt: ”Ugnsomelett”' }).click();
	// Focus goes back to the day.
	await expect(page.getByRole('button', { name: 'Middag söndag: Ugnsomelett' })).toBeFocused();

	await saved(page);
	expect(loads()).toBe(0);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Middag söndag: Ugnsomelett' })).toBeVisible();
	await open(page, '/ratter');
	await expect(page.locator('m3e-list-action', { hasText: 'Ugnsomelett' })).toBeVisible();

	// The day is left as it was.
	await open(page, '/');
	await page.getByRole('button', { name: 'Middag söndag: Ugnsomelett' }).click();
	await page.getByRole('button', { name: 'Töm raden' }).click();
	await expect(page.getByRole('button', { name: 'Middag söndag: tom' })).toBeVisible();
	await saved(page);
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
	// Who eats is a line on the menu, which opens a sheet with a chip for each person.
	const line = page.getByRole('button', { name: /äter$/ });
	await line.click();
	const chips = people.map((name) => page.locator('m3e-filter-chip', { hasText: name }));
	await expect(chips[0]).not.toHaveAttribute('selected');
	// Two quick taps both count, even before the first is saved.
	await chips[0].click();
	await chips[1].click();
	await expect(page.getByText('Ätare Två: Ätare Två äter inte svamp')).toBeVisible();
	await expect(line).toContainText('Ätare Ett och Ätare Två äter');
	await saved(page);
	await page.reload();
	await expect(line).toContainText('Ätare Ett och Ätare Två äter');
	await line.click();
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
	const dates = page.locator('.dates');
	const first = await dates.textContent();
	// Only the arrow to the other week is a link.
	const arrow = page.locator('m3e-icon-button[href]');
	await expect(arrow).toHaveCount(1);
	await arrow.click();
	await expect(dates).not.toHaveText(first!);
});

test('a day opens for writing where it stands, without jumping', async ({ page }) => {
	await open(page, '/');
	const shown = page.getByRole('button', { name: /^Middag lördag/ });
	const before = await textTop(shown.locator('.dish'));
	await shown.click();
	const after = await textTop(page.getByRole('textbox', { name: 'Middag lördag' }));
	expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
	expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
	await page.keyboard.press('Escape');
});

test('the handwriting comes with the app, and nothing is fetched from elsewhere', async ({
	page,
	baseURL
}) => {
	const elsewhere: string[] = [];
	const fonts: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== new URL(baseURL!).origin) elsewhere.push(url.href);
		if (request.resourceType() === 'font') fonts.push(url.pathname);
	});
	await open(page, '/');
	const loaded = await page.evaluate(async () => {
		await document.fonts.ready;
		return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
	});
	expect(loaded).toEqual(expect.arrayContaining(['Caveat', 'Kalam']));
	for (const font of ['caveat', 'kalam']) expect(fonts.some((f) => f.includes(font))).toBe(true);
	expect(elsewhere).toEqual([]);
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
	const dialog = page.locator('m3e-dialog');
	await expect(dialog).toContainText('Föreslå veckan?');
	await expect(dialog).toContainText('Du har skrivit in tisdag själv.');
	await dialog.locator('m3e-button', { hasText: 'Fyll i resten' }).click();
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

	// A new suggestion for the week asks first, and nothing changes when it is cancelled.
	const again = page.locator('m3e-icon-button[aria-label="Nytt förslag på hela veckan"]');
	await again.click();
	await expect(dialog).toContainText('Föreslå veckan igen?');
	await expect(dialog).toContainText('Du har skrivit in tisdag själv.');
	await dialog.locator('m3e-button', { hasText: 'Avbryt' }).click();
	await expect(dialog).not.toHaveAttribute('open');
	await expect(monday('Fiskpinnar')).toBeVisible();

	// Only Claude's dishes keeps what was written by hand.
	const loads = countLoads(page);
	await again.click();
	await dialog.locator('m3e-button', { hasText: 'Bara Claudes rätter' }).click();
	await expect(monday('Blomkålssoppa')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Middag tisdag: Ärtsoppa' })).toBeVisible();
	await saved(page);
	expect(loads()).toBe(0);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Middag tisdag: Ärtsoppa' })).toBeVisible();
	await expect(monday('Blomkålssoppa')).toBeVisible();

	// The whole week replaces it too; with only Claude's dishes left, the question is shorter.
	await again.click();
	await dialog.locator('m3e-button', { hasText: 'Hela veckan' }).click();
	await expect(page.getByRole('button', { name: 'Middag tisdag: Kycklinggryta' })).toBeVisible();
	await again.click();
	await expect(dialog).toContainText(/Claudes rätter för vecka \d+ byts mot nya förslag\./);
	await page.keyboard.press('Escape');
	await expect(dialog).not.toHaveAttribute('open');
});

test('a new dish is voted on with one button, and Aldrig mer is never suggested', async ({
	page
}) => {
	// Saturday in the week Veckan shows, on the phone, so the days before have passed.
	const { weekStart } = shownWeek(null, swedishToday());
	await page.clock.setFixedTime(new Date(`${weekStart}T12:00:00+01:00`).getTime() + 5 * DAY);
	await open(page, '/');
	// Enter goes on to the next day, which Escape closes.
	for (const [day, dish] of [
		['måndag', 'Linssoppa'],
		['torsdag', 'Shakshuka'],
		['söndag', 'Pho']
	]) {
		await writeDay(page, day, dish);
		await page.keyboard.press('Escape');
	}

	// Only a new dish on a day that has passed: not one eaten before, nor one still to come.
	const vote = (dish: string) => page.locator(`m3e-button[aria-label^="Röst på ${dish}:"]`);
	await expect(vote('Linssoppa')).toHaveCount(0);
	await expect(vote('Pho')).toHaveCount(0);
	await expect(page.locator('m3e-icon-button[aria-label="Byt Middag torsdag"]')).toHaveCount(0);

	// Each tap takes the next vote, saved without loading the page.
	const loads = countLoads(page);
	await expect(vote('Shakshuka')).toHaveText('Hur var den?');
	for (const label of ['Ny favorit', 'Ok', 'Aldrig mer']) {
		await vote('Shakshuka').click();
		await expect(vote('Shakshuka')).toHaveText(label);
		await expect(vote('Shakshuka')).toHaveAttribute(
			'aria-label',
			`Röst på Shakshuka: ${label}. Tryck för att ändra.`
		);
	}
	await saved(page);
	expect(loads()).toBe(0);
	await page.reload();
	await expect(vote('Shakshuka')).toHaveText('Aldrig mer');

	// Rätter marks it, and the dish page shows the same vote and changes it.
	await open(page, '/ratter');
	const dish = page.locator('m3e-list-action', { hasText: 'Shakshuka' });
	await expect(dish.getByRole('img', { name: 'Aldrig mer' })).toBeVisible();
	await dish.click();
	await expect(vote('Shakshuka')).toHaveText('Aldrig mer');
	await vote('Shakshuka').click();
	await expect(vote('Shakshuka')).toHaveText('Ny favorit');
	await saved(page);
	await page.reload();
	await expect(vote('Shakshuka')).toHaveText('Ny favorit');
	await vote('Shakshuka').click();
	await vote('Shakshuka').click();
	await expect(vote('Shakshuka')).toHaveText('Aldrig mer');

	// Claude's stand-in chooses it for Monday, and the app takes the next dish instead.
	await open(page, '/');
	await page.locator('m3e-button', { hasText: 'Föreslå veckan' }).click();
	await page.locator('m3e-dialog m3e-button', { hasText: 'Hela veckan' }).click();
	await expect(page.getByRole('button', { name: 'Middag måndag: Pytt i panna' })).toBeVisible();
	await expect(page.getByRole('button', { name: /Shakshuka/ })).toHaveCount(0);
});

const DAY = 24 * 60 * 60 * 1000;

/** Where the text of an element starts, inside its padding. */
async function textTop(locator: Locator) {
	return locator.evaluate((el) => {
		const box = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		// On the page, not the screen: focusing the field may scroll it up into view, which is no jump.
		return {
			x: box.left + scrollX + parseFloat(style.paddingLeft),
			y: box.top + scrollY + parseFloat(style.paddingTop)
		};
	});
}
