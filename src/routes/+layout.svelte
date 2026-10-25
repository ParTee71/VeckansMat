<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/env';
	import { beforeNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import Icon from '#lib/Icon.svelte';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The three main views have the nav bar; a dish and its form have a back button instead.
	const destinations = [
		{ href: '/', label: 'Veckan', icon: 'week' },
		{ href: '/ratter', label: 'Rätter', icon: 'dishes' },
		{ href: '/veckor', label: 'Veckor', icon: 'history' }
	] as const;
	let showNav = $derived(destinations.some((d) => d.href === page.url.pathname));

	// The m3e web components touch `customElements`, which only exists in the
	// browser, so they are registered after hydration instead of during SSR.
	onMount(() => {
		import('#lib/m3e.ts');
	});

	// After a release, the next navigation loads the new version in full instead
	// of mixing old and new code in a tab that stayed open.
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	// Opening another snackbar also closes this one, so only reload when the
	// action was tapped.
	function reloadOnAction(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState === 'closed' && event.currentTarget.isActionTaken) {
			location.reload();
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Veckans mat</title>
</svelte:head>

<m3e-theme color="#c26b4e" variant="tonal-spot" scheme="auto" motion="expressive" strong-focus>
	<div class="app">
		<div class="content">
			{@render children()}
			<footer>Version {version}</footer>
		</div>
		{#if showNav}
			<!-- m3e reads any boolean attribute as true, even "false", so false is left out with `|| undefined`. -->
			<m3e-nav-bar>
				{#each destinations as d (d.href)}
					<m3e-nav-item href={d.href} selected={d.href === page.url.pathname || undefined}>
						<span slot="icon" class="slot-icon"><Icon name={d.icon} /></span>{d.label}
					</m3e-nav-item>
				{/each}
			</m3e-nav-bar>
		{/if}
	</div>
	{#if updated.current}
		<m3e-snackbar action="Ladda om" duration="0" open ontoggle={reloadOnAction}>
			Ny version finns
		</m3e-snackbar>
	{/if}
</m3e-theme>

<style>
	/* m3e-theme only colours <body> when it is the body's direct child, which
	   SvelteKit's app.html wrapper rules out, so the app root takes the colours. */
	:global(body) {
		margin: 0;
	}

	/* An icon put in an m3e slot sits in a span, since a component cannot take slot="". */
	:global(.slot-icon) {
		display: inline-flex;
	}

	/* White and grey surfaces instead of the theme's tinted ones, so the theme colour is
	   an accent (decided with the mockup in #21). The rest of the scheme comes from m3e. */
	.app {
		--md-sys-color-background: #fefefd;
		--md-sys-color-on-background: #1c1c1b;
		--md-sys-color-surface: #fefefd;
		--md-sys-color-surface-bright: #fefefd;
		--md-sys-color-surface-dim: #dedddb;
		--md-sys-color-surface-container-lowest: #ffffff;
		--md-sys-color-surface-container-low: #f9f9f8;
		--md-sys-color-surface-container: #f4f4f2;
		--md-sys-color-surface-container-high: #efefec;
		--md-sys-color-surface-container-highest: #e9e9e6;
		--md-sys-color-surface-variant: #e9e9e6;
		--md-sys-color-on-surface: #1c1c1b;
		--md-sys-color-on-surface-variant: #4a4946;
		--md-sys-color-outline: #7a7975;
		--md-sys-color-outline-variant: #d9d8d4;

		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		/* m3e-theme only sets the type when it is the body's child; Roboto is Android's own. */
		font-family: Roboto, system-ui, sans-serif;
		background-color: var(--md-sys-color-background);
		color: var(--md-sys-color-on-background);
	}

	@media (prefers-color-scheme: dark) {
		.app {
			--md-sys-color-background: #131313;
			--md-sys-color-on-background: #e5e4e2;
			--md-sys-color-surface: #131313;
			--md-sys-color-surface-bright: #3a3a39;
			--md-sys-color-surface-dim: #131313;
			--md-sys-color-surface-container-lowest: #0e0e0e;
			--md-sys-color-surface-container-low: #1c1c1b;
			--md-sys-color-surface-container: #201f1f;
			--md-sys-color-surface-container-high: #2a2a29;
			--md-sys-color-surface-container-highest: #353534;
			--md-sys-color-surface-variant: #353534;
			--md-sys-color-on-surface: #e5e4e2;
			--md-sys-color-on-surface-variant: #c9c7c3;
			--md-sys-color-outline: #93918d;
			--md-sys-color-outline-variant: #484745;
		}
	}

	.content {
		flex-grow: 1;
		display: flow-root;
	}

	m3e-nav-bar {
		position: sticky;
		bottom: 0;
	}

	footer {
		padding: 1rem;
		text-align: center;
		font-size: 0.75rem;
		opacity: 0.7;
	}
</style>
