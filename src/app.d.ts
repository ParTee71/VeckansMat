// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces.
// Bindings such as the database come from `import { env } from 'cloudflare:workers'`;
// adapter-cloudflare does not fill in event.platform.
declare global {
	namespace App {}

	namespace Cloudflare {
		interface Env {
			/** "true" only in the browser tests, so a recipe link may point at the test's own server. */
			ALLOW_LOCAL_FETCH?: string;
		}
	}
}

export {};
