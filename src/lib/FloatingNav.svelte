<script lang="ts" module>
	// The main views, as a menu that floats at the bottom left. A dish and its form have a back
	// button instead.
	export const destinations = [
		{ href: '/', label: 'Veckan', icon: 'week' },
		{ href: '/handla', label: 'Handla', icon: 'shop' },
		{ href: '/ratter', label: 'Rätter', icon: 'dishes' },
		{ href: '/veckor', label: 'Veckor', icon: 'history' }
	] as const;
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
</script>

<!-- Plain links rather than m3e-nav-bar, which spreads its items over the whole width (#86).
     Only the view shown has its name written out; the others are named for screen readers. -->
<nav aria-label="Huvudmeny">
	{#each destinations as d (d.href)}
		{@const current = d.href === page.url.pathname}
		<a
			href={resolve(d.href)}
			aria-current={current ? 'page' : undefined}
			aria-label={current ? undefined : d.label}
		>
			<Icon name={d.icon} />{#if current}{d.label}{/if}
		</a>
	{/each}
</nav>

<style>
	nav {
		position: fixed;
		left: 1rem;
		bottom: calc(1.25rem + env(safe-area-inset-bottom));
		/* Above the rows of a list, whose invisible links have z-index 1, and the fade under it. */
		z-index: 3;
		height: 4rem;
		padding: 0 0.5rem;
		box-sizing: border-box;
		border-radius: 2rem;
		background: #ffffff;
		box-shadow: 0 6px 20px rgb(40 20 10 / 0.18);
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	a {
		min-width: 3rem;
		height: 3rem;
		border-radius: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 150ms;
	}

	a:active {
		background: color-mix(in srgb, currentColor 12%, transparent);
	}

	a:focus-visible {
		outline: 3px solid var(--md-sys-color-secondary);
		outline-offset: 2px;
	}

	a[aria-current='page'] {
		padding: 0 1rem;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
	}

	/* A narrow phone keeps the menu clear of the plus button. */
	@media (max-width: 380px) {
		nav {
			padding: 0 0.25rem;
		}

		a {
			min-width: 2.75rem;
			height: 2.75rem;
		}

		a[aria-current='page'] {
			padding: 0 0.75rem;
		}
	}

	@media (prefers-color-scheme: dark) {
		nav {
			background: var(--md-sys-color-surface-container-high);
			box-shadow: 0 6px 20px rgb(0 0 0 / 0.5);
		}
	}
</style>
