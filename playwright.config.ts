import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// Its own local database with made-up data, so a test run never touches the one `npm run dev` uses.
	webServer: [
		{
			command: [
				'npm run build',
				'npx wrangler d1 migrations apply DB --local --persist-to .wrangler/e2e',
				'npx wrangler d1 execute DB --local --persist-to .wrangler/e2e --file test/e2e-seed.sql',
				// Recipe links in the tests point at the made-up site below, on localhost, which also
				// stands in for Claude's API.
				'npx wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173 --persist-to .wrangler/e2e --var ALLOW_LOCAL_FETCH:true ANTHROPIC_API_KEY:e2e CLAUDE_BASE_URL:http://localhost:4174/claude'
			].join(' && '),
			port: 4173
		},
		{ command: 'node test/e2e-recipe-site.mjs', port: 4174 }
	],
	// Set by hand, since Playwright only takes it from the web server when there is one.
	use: { baseURL: 'http://localhost:4173' },
	testMatch: '**/*.e2e.{ts,js}',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	// The household uses the app on Android phones, so that is the device tested.
	// Handla writes the same weeks as Veckan, so it runs after. The month's cap for Claude is spent
	// last, so that it stops no other test.
	projects: [
		{
			name: 'mobile',
			use: { ...devices['Pixel 7'] },
			testIgnore: ['**/manadstak.svelte.e2e.ts', '**/handla.svelte.e2e.ts']
		},
		{
			name: 'handla',
			use: { ...devices['Pixel 7'] },
			testMatch: '**/handla.svelte.e2e.ts',
			dependencies: ['mobile']
		},
		{
			name: 'manadstak',
			use: { ...devices['Pixel 7'] },
			testMatch: '**/manadstak.svelte.e2e.ts',
			dependencies: ['handla']
		}
	]
});
