import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The adapter's own config says where it writes the Worker that src/worker.js wraps.
			adapter: adapter({
				config: 'wrangler.sveltekit.jsonc',
				platformProxy: { configPath: 'wrangler.jsonc' }
			}),
			// Shown in the app and /api/health; a new name also tells open tabs to reload.
			version: { name: pkg.version }
		})
	],
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts', 'test/**/*.spec.ts', 'evals/*.spec.ts'],
		alias: {
			'cloudflare:workers': fileURLToPath(new URL('test/cloudflare-workers.ts', import.meta.url))
		},
		globalSetup: ['test/d1-setup.ts'],
		expect: { requireAssertions: true }
	}
});
