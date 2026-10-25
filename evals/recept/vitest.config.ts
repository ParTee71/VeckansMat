import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Only for `npm run eval:recept`, which calls the real API; never part of `npm test` or CI.
export default defineConfig({
	root: fileURLToPath(new URL('../..', import.meta.url)),
	test: {
		include: ['evals/recept/*.eval.ts'],
		testTimeout: 120_000,
		alias: {
			'cloudflare:workers': fileURLToPath(
				new URL('../../test/cloudflare-workers.ts', import.meta.url)
			)
		}
	}
});
