// Renders the PNG icons in static/ from the SVG sources with Playwright's chromium.
// Run with `npm run icons` after changing an SVG. Set PLAYWRIGHT_CHROMIUM_PATH to use a
// chromium that is installed somewhere else.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const staticDir = new URL('../static/', import.meta.url);
const lib = new URL('../src/lib/assets/', import.meta.url);

const icons = [
	{ out: 'icon-192.png', src: new URL('favicon.svg', lib), size: 192, transparent: true },
	{ out: 'icon-512.png', src: new URL('favicon.svg', lib), size: 512, transparent: true },
	{ out: 'icon-maskable-512.png', src: new URL('icon.svg', staticDir), size: 512 },
	{ out: 'apple-touch-icon.png', src: new URL('icon.svg', staticDir), size: 180 },
	{
		out: 'icon-monochrome-512.png',
		src: new URL('icon-monochrome.svg', staticDir),
		size: 512,
		transparent: true
	}
];

const browser = await chromium.launch({
	executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
});
try {
	for (const { out, src, size, transparent } of icons) {
		const svg = await readFile(src, 'utf8');
		const page = await browser.newPage({ viewport: { width: size, height: size } });
		await page.setContent(
			`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
		);
		const png = await page.screenshot({ omitBackground: transparent === true });
		await writeFile(new URL(out, staticDir), png);
		await page.close();
	}
} finally {
	await browser.close();
}
