import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Only for `npm run eval:…`, which call the real API; never part of `npm test` or CI. Each script
// names the folder of its eval.
export default defineConfig({
	root: fileURLToPath(new URL('..', import.meta.url)),
	test: {
		include: ['evals/*/*.eval.ts'],
		testTimeout: 180_000,
		alias: {
			'cloudflare:workers': fileURLToPath(new URL('../test/cloudflare-workers.ts', import.meta.url))
		}
	}
});
