import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	// The household uses the app on Android phones, so that is the device tested.
	projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }]
});
