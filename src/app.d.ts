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
			/** Set only in the browser tests, to a made-up identity in place of Access's. */
			ACCESS_IDENTITY_URL?: string;
			/** A secret on each Worker, never in the repo. */
			ANTHROPIC_API_KEY: string;
			/** Set only in the browser tests, to a stand-in for Claude's API. */
			CLAUDE_BASE_URL?: string;
			/** Set only in the browser tests, to made-up chain sites in place of the real ones. */
			OFFER_SITE_URL?: string;
		}
	}
}

export {};
