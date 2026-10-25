// Renders the eval's made-up photos: a cookbook page, a spread and a handwritten note, as a
// phone would send them. Run again only when PHOTOS in cases.ts changes:
//   node --experimental-strip-types evals/recept/render-photos.ts
import { chromium } from 'playwright';
import { PHOTOS, type PhotoPage } from './cases.ts';

const escape = (text: string) =>
	text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function html(page: PhotoPage): string {
	const lines = page.lines
		.map((line) =>
			line.startsWith('# ')
				? `<h1>${escape(line.slice(2))}</h1>`
				: line.startsWith('## ')
					? `<h2>${escape(line.slice(3))}</h2>`
					: `<p>${escape(line)}</p>`
		)
		.join('');
	const style =
		page.style === 'book'
			? `body{background:#f3ecdf;font-family:Georgia,serif;color:#2a2622;padding:70px 80px;transform:rotate(-1.5deg)}
				h1{font-size:46px;margin:0 0 10px}h2{font-size:28px;margin:34px 0 10px;color:#7a3b22}p{font-size:24px;margin:6px 0;line-height:1.4}`
			: `body{background:repeating-linear-gradient(#fffbea 0 46px,#c9d8f0 46px 48px);font-family:Caveat,cursive;color:#1d2f6b;padding:40px 70px;transform:rotate(2deg)}
				p{font-size:40px;margin:0;line-height:48px}`;
	return `<!doctype html><html><head><meta charset="utf-8">
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat&display=swap">
		<style>${style}</style></head><body>${lines}</body></html>`;
}

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 900, height: 1200 } });
for (const photo of PHOTOS) {
	await tab.setContent(html(photo), { waitUntil: 'networkidle' });
	await tab.screenshot({
		path: new URL(`photos/${photo.file}`, import.meta.url).pathname,
		type: 'jpeg',
		quality: 80
	});
}
await browser.close();
