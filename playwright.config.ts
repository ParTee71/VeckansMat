import { defineConfig, devices } from '@playwright/test';

/** A Worker of its own on `port`, with its own local database of made-up data, so that one group
 * of tests never sees what another writes, and a test run never touches the one `npm run dev` uses.
 * Recipe links in the tests point at the made-up site on port 4174, which also stands in for
 * Claude's API and Cloudflare Access. */
function worker(name: string, port: number, seeds: string[] = []) {
	const persist = `--persist-to .wrangler/e2e-${name}`;
	return {
		command: [
			`npx wrangler d1 migrations apply DB --local ${persist}`,
			...['test/e2e-seed.sql', ...seeds].map(
				(seed) => `npx wrangler d1 execute DB --local ${persist} --file ${seed}`
			),
			`npx wrangler dev --port ${port} ${persist} --var ALLOW_LOCAL_FETCH:true ANTHROPIC_API_KEY:e2e CLAUDE_BASE_URL:http://localhost:4174/claude OFFER_SITE_URL:http://localhost:4174/butik ACCESS_IDENTITY_URL:http://localhost:4174/access/identity`
		].join(' && '),
		port
	};
}

// Playwright starts the servers in order, so the first one builds the app for all of them.
const app = worker('app', 4173);
app.command = `npm run build && ${app.command}`;

export default defineConfig({
	webServer: [
		app,
		worker('handla', 4175),
		worker('manadstak', 4176),
		worker('erbjudanden', 4177, ['test/e2e-offers.sql']),
		{ command: 'node test/e2e-recipe-site.mjs', port: 4174 }
	],
	testMatch: '**/*.e2e.{ts,js}',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	// The household uses the app on Android phones, so that is the device tested. Handla and the
	// month's cap for Claude change the same weeks and the same month as the rest, so they have their
	// own Worker each, and the offers have one whose offers no other test fetches anew.
	projects: [
		{
			name: 'mobile',
			use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4173' },
			testIgnore: [
				'**/manadstak.svelte.e2e.ts',
				'**/handla.svelte.e2e.ts',
				'**/erbjudanden.svelte.e2e.ts'
			]
		},
		{
			name: 'handla',
			use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4175' },
			testMatch: '**/handla.svelte.e2e.ts'
		},
		{
			name: 'erbjudanden',
			use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4177' },
			testMatch: '**/erbjudanden.svelte.e2e.ts'
		},
		{
			name: 'manadstak',
			use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4176' },
			testMatch: '**/manadstak.svelte.e2e.ts'
		}
	]
});
