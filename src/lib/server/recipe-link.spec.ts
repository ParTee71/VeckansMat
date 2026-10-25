import { describe, expect, it, vi } from 'vitest';
import { recipeUrl } from '../links';
import { RecipeReadError } from './recipe-draft';
import { durationMinutes, fetchPage, pageText, recipeFromHtml } from './recipe-link';

// Made-up pages in the shapes recipe sites use.
const SOURCE = 'https://recept.exempel.se/gryta';
const page = (...blocks: unknown[]) =>
	`<html><head><title>Gryta</title>${blocks
		.map(
			(b) =>
				`<script type="application/ld+json">${typeof b === 'string' ? b : JSON.stringify(b)}</script>`
		)
		.join('')}</head><body><h1>Gryta</h1></body></html>`;

const curry = {
	'@context': 'https://schema.org',
	'@type': 'Recipe',
	name: 'Kycklinggryta med curry',
	recipeYield: '4 portioner',
	totalTime: 'PT40M',
	recipeIngredient: ['600 g kycklinglårfilé', ' 1  gul lök ', '4 dl kokosmjölk', ''],
	recipeInstructions: [
		{ '@type': 'HowToStep', text: 'Skär kycklingen i bitar.' },
		{ '@type': 'HowToStep', text: 'Bryn kycklingen och häll i kokosmjölken.' }
	],
	recipeCategory: 'Middag'
};

describe('a recipe in a page', () => {
	it('is read from a single Recipe object', () => {
		expect(recipeFromHtml(page(curry), SOURCE)).toEqual({
			name: 'Kycklinggryta med curry',
			servings: 4,
			timeMinutes: 40,
			ingredients: ['600 g kycklinglårfilé', '1 gul lök', '4 dl kokosmjölk'],
			instructions: '1. Skär kycklingen i bitar.\n2. Bryn kycklingen och häll i kokosmjölken.',
			sourceUrl: SOURCE
		});
	});

	it('is found in @graph, in lists, as main entity and with several types', () => {
		const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage' }, curry] };
		const listed = [{ '@type': 'Organization' }, { ...curry, '@type': ['Recipe', 'NewsArticle'] }];
		const main = { '@type': 'WebPage', mainEntity: curry };
		for (const data of [graph, listed, main]) {
			expect(recipeFromHtml(page(data), SOURCE)?.name).toBe('Kycklinggryta med curry');
		}
	});

	it('skips broken JSON and blocks without a recipe', () => {
		const html = page('{ not json', { '@type': 'BreadcrumbList' }, curry);
		expect(recipeFromHtml(html, SOURCE)?.name).toBe('Kycklinggryta med curry');
	});

	it('is null when the page has none', () => {
		expect(recipeFromHtml('<html><body>Inget recept här</body></html>', SOURCE)).toBeNull();
		expect(recipeFromHtml(page({ '@type': 'Article', name: 'Gryta' }), SOURCE)).toBeNull();
	});

	it('takes steps in sections, as one text and as plain strings', () => {
		const sections = {
			...curry,
			recipeInstructions: [
				{
					'@type': 'HowToSection',
					name: 'Ris',
					itemListElement: [{ '@type': 'HowToStep', text: 'Koka riset.' }]
				},
				{
					'@type': 'HowToSection',
					name: 'Gryta',
					itemListElement: [{ '@type': 'HowToStep', name: 'Bryn kycklingen.' }]
				}
			]
		};
		expect(recipeFromHtml(page(sections), SOURCE)?.instructions).toBe(
			'Ris\n1. Koka riset.\nGryta\n2. Bryn kycklingen.'
		);
		const text = { ...curry, recipeInstructions: '<p>Koka riset.</p><p>Bryn kycklingen.</p>' };
		expect(recipeFromHtml(page(text), SOURCE)?.instructions).toBe(
			'1. Koka riset.\n2. Bryn kycklingen.'
		);
		const strings = { ...curry, recipeInstructions: ['Koka riset.', 'Bryn kycklingen.'] };
		expect(recipeFromHtml(page(strings), SOURCE)?.instructions).toBe(
			'1. Koka riset.\n2. Bryn kycklingen.'
		);
		const encoded = {
			...curry,
			recipeInstructions: '&lt;p&gt;Koka riset.&lt;/p&gt;&lt;p&gt;Bryn kycklingen.&lt;/p&gt;'
		};
		expect(recipeFromHtml(page(encoded), SOURCE)?.instructions).toBe(
			'1. Koka riset.\n2. Bryn kycklingen.'
		);
	});

	it('decodes entities and takes out tags', () => {
		const html = page({
			...curry,
			name: 'Pasta med r&ouml;dbetor &amp; fetaost',
			description: '&Ouml;lbr&ouml;d',
			recipeIngredient: ['&frac12; dl <b>gr&#228;dde</b>', '1&nbsp;tsk salt']
		});
		const draft = recipeFromHtml(html, SOURCE);
		expect(draft?.name).toBe('Pasta med rödbetor & fetaost');
		expect(draft?.ingredients).toEqual(['½ dl grädde', '1 tsk salt']);
	});

	it('adds preparation and cooking time when there is no total', () => {
		const rest: Record<string, unknown> = { ...curry };
		delete rest.totalTime;
		const html = page({ ...rest, prepTime: 'PT15M', cookTime: 'PT1H' });
		expect(recipeFromHtml(html, SOURCE)?.timeMinutes).toBe(75);
	});

	it('leaves out what is missing or cannot be read', () => {
		const html = page({
			'@type': 'Recipe',
			name: 'Gryta',
			recipeYield: 'några',
			totalTime: '40 min'
		});
		expect(recipeFromHtml(html, SOURCE)).toEqual({
			name: 'Gryta',
			servings: null,
			timeMinutes: null,
			ingredients: [],
			instructions: null,
			sourceUrl: SOURCE
		});
	});

	it('takes servings from a number or the first number in a list', () => {
		expect(recipeFromHtml(page({ ...curry, recipeYield: 6 }), SOURCE)?.servings).toBe(6);
		expect(recipeFromHtml(page({ ...curry, recipeYield: ['2', '2 pers'] }), SOURCE)?.servings).toBe(
			2
		);
	});
});

describe('durations', () => {
	it('are read in minutes', () => {
		expect(durationMinutes('PT40M')).toBe(40);
		expect(durationMinutes('PT1H30M')).toBe(90);
		expect(durationMinutes('P0DT0H25M')).toBe(25);
		expect(durationMinutes('P1D')).toBe(1440);
		expect(durationMinutes('PT0M')).toBeNull();
		expect(durationMinutes('40')).toBeNull();
		expect(durationMinutes(undefined)).toBeNull();
	});
});

describe('a link', () => {
	it('must be a web page on a named host', () => {
		expect(recipeUrl(' https://recept.exempel.se/gryta ')?.href).toBe(SOURCE);
		for (const text of [
			'recept.exempel.se/gryta',
			'ftp://recept.exempel.se/gryta',
			'javascript:alert(1)',
			'http://recept.exempel.se/gryta',
			'http://localhost:4174/gryta',
			'http://api.localhost/gryta',
			'http://localhost./gryta',
			'http://127.0.0.1/gryta',
			'http://[::1]/gryta',
			'http://intranat/gryta',
			'https://namn:hemligt@recept.exempel.se/gryta',
			'Kycklinggryta med curry',
			'https://recept.exempel.se/gryta\nKycklinggryta med curry'
		]) {
			expect(recipeUrl(text), text).toBeNull();
		}
	});

	it('may be local when that is allowed, as in the browser tests', () => {
		expect(recipeUrl('http://localhost:4174/gryta', true)?.host).toBe('localhost:4174');
	});
});

describe('the text of a page', () => {
	it('keeps the words a line per paragraph, without scripts, styles or tags', () => {
		const html = `<html><head><title>Gryta</title><style>p{color:red}</style>
			<script>track()</script></head><body><!-- reklam --><h1>Gryta &amp; ris</h1>
			<ul><li>2 dl  ris</li><li>1&nbsp;gul lök</li></ul><p>Koka<br>och servera.</p></body></html>`;
		expect(pageText(html)).toBe('Gryta\nGryta & ris\n2 dl ris\n1 gul lök\nKoka\noch servera.');
	});

	it('is cut short for a very long page', () => {
		expect(pageText(`<p>${'a'.repeat(40_000)}</p>`)).toHaveLength(30_000);
	});
});

describe('fetching a recipe', () => {
	const url = new URL(SOURCE);
	// What the app does with a page that has JSON-LD.
	const fetchRecipe = async (at: URL, fetcher: typeof fetch) =>
		recipeFromHtml(await fetchPage(at, fetcher), at.href)!;
	const respond = (body: BodyInit | null, init?: ResponseInit) =>
		vi.fn<typeof fetch>().mockResolvedValue(new Response(body, init));

	const reason = (promise: Promise<unknown>) =>
		promise.then(
			() => 'ok',
			(e: unknown) => (e instanceof RecipeReadError ? e.reason : String(e))
		);

	it('reads the page', async () => {
		const fetcher = respond(page(curry));
		expect((await fetchRecipe(url, fetcher)).name).toBe('Kycklinggryta med curry');
		expect(fetcher.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it('fails when the site says no or the fetch fails', async () => {
		expect(await reason(fetchPage(url, respond('Nekad', { status: 403 })))).toBe('fetch');
		expect(
			await reason(fetchPage(url, vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'))))
		).toBe('fetch');
	});

	it('follows redirects to named hosts only', async () => {
		const moved = (location: string) => new Response(null, { status: 301, headers: { location } });
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(moved('/ny-adress'))
			.mockResolvedValueOnce(new Response(page(curry)));
		expect((await fetchRecipe(url, fetcher)).sourceUrl).toBe(SOURCE);
		expect(String(fetcher.mock.calls[1][0])).toBe('https://recept.exempel.se/ny-adress');

		const inward = vi.fn<typeof fetch>().mockResolvedValue(moved('http://127.0.0.1/admin'));
		expect(await reason(fetchPage(url, inward))).toBe('fetch');
		expect(inward).toHaveBeenCalledTimes(1);

		const loop = vi.fn<typeof fetch>().mockImplementation(async () => moved(SOURCE));
		expect(await reason(fetchPage(url, loop))).toBe('fetch');
		expect(loop).toHaveBeenCalledTimes(6);
	});

	it('reads a page in the character set it names', async () => {
		// "Kålpudding" in ISO-8859-1, where å is the single byte 0xE5.
		const latin1 = (html: string) => Uint8Array.from(html, (c) => c.charCodeAt(0));
		const html = page({ ...curry, name: 'Kålpudding' });
		const byHeader = respond(latin1(html), {
			headers: { 'content-type': 'text/html; charset=ISO-8859-1' }
		});
		expect((await fetchRecipe(url, byHeader)).name).toBe('Kålpudding');
		const byMeta = respond(latin1(html.replace('<head>', '<head><meta charset="iso-8859-1">')));
		expect((await fetchRecipe(url, byMeta)).name).toBe('Kålpudding');
	});

	it('gives up after ten seconds in all, redirects included', async () => {
		const signals: AbortSignal[] = [];
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_, init) => {
			signals.push(init!.signal!);
			return signals.length < 3
				? new Response(null, { status: 302, headers: { location: SOURCE } })
				: new Response(page(curry));
		});
		await fetchPage(url, fetcher);
		expect(new Set(signals).size).toBe(1);
	});

	it('stops reading a page that is too large', async () => {
		const chunk = new Uint8Array(500_000);
		let sent = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				if (sent++ < 10) controller.enqueue(chunk);
				else controller.close();
			}
		});
		expect(await reason(fetchPage(url, respond(body)))).toBe('fetch');
		expect(sent).toBeLessThan(10);
	});
});
