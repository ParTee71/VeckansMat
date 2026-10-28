<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/env';
	import { beforeNavigate, goto, invalidate, invalidateAll, preloadData } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page, updated } from '$app/state';
	import { sendIdentity } from '#lib/account.ts';
	import '#lib/app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { provideFab } from '#lib/fab.svelte.ts';
	import FloatingNav, { destinations } from '#lib/FloatingNav.svelte';
	import { neighbour, swipeNav, type Direction } from '#lib/swipe.ts';
	import { loadTheme, theme } from '#lib/theme.svelte.ts';
	import { themeOf } from '#lib/themes.ts';
	import { swedishToday } from '#lib/weeks.ts';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let showNav = $derived(destinations.some((d) => d.href === page.url.pathname));

	const fab = provideFab();

	// A swipe sideways goes to the view next to this one in the menu.
	const paths = destinations.map((d) => d.href);
	const swipe = swipeNav(
		(direction: Direction) => neighbour(paths, page.url.pathname, direction),
		(path) => goto(resolve(path)),
		// Only ahead of time; the view loads again when it is gone to.
		(path) => void preloadData(resolve(path)).catch(() => {})
	);

	let current = $derived(themeOf(theme.choice));

	// The name and Google picture are fetched once a week, after the page has loaded, and shown
	// once saved, without anything else on the page loading again.
	onMount(() => {
		if (page.data.account?.refresh) {
			sendIdentity().then((saved) => {
				if (saved) invalidate('app:account');
			});
		}
	});

	// The m3e web components touch `customElements`, which only exists in the
	// browser, so they are registered after hydration instead of during SSR.
	// The phone's theme is read first, so the scheme is built from it straight away.
	// `data-ready` tells the tests that the components are there.
	onMount(() => {
		loadTheme();
		import('#lib/m3e.ts').then(() => (document.documentElement.dataset.ready = ''));
	});

	// After a release, the next navigation loads the new version in full instead
	// of mixing old and new code in a tab that stayed open.
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	// A phone keeps the app open for days. When it comes back on another day, the week to show
	// may have changed, so the page loads again before anything is written to the old one.
	let loadedOn = swedishToday();
	function loadIfNewDay() {
		if (document.visibilityState !== 'visible' || swedishToday() === loadedOn) return;
		loadedOn = swedishToday();
		invalidateAll();
	}

	// Opening another snackbar, such as an undo, closes this one, so it reloads only when the
	// action was tapped, and comes back once no other one is showing. An undo can also be taken
	// out of the page while it shows, without closing, so it is looked for rather than awaited.
	function reloadOnAction(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState !== 'closed') return;
		const notice = event.currentTarget;
		if (notice.isActionTaken) return location.reload();
		const snackbar = customElements.get('m3e-snackbar') as typeof M3eSnackbarElement;
		const waiting = setInterval(() => {
			const other = snackbar.current;
			if (other?.isConnected && other.open) return;
			clearInterval(waiting);
			notice.open = true;
		}, 500);
	}
</script>

<svelte:document onvisibilitychange={loadIfNewDay} />

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Veckans mat</title>
</svelte:head>

<m3e-theme
	color={current.color}
	variant={current.variant}
	scheme="auto"
	motion="expressive"
	strong-focus
>
	<div class="app">
		<div class="content" class:floating={showNav} {@attach showNav && swipe}>
			{@render children()}
			<footer>Version {version}</footer>
		</div>
		{#if showNav}
			<div class="fade"></div>
			<FloatingNav />
			{#if fab.current}
				<div class="fab">{@render fab.current()}</div>
			{/if}
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
		/* The new look (#73): white cards on a warm background, and fields with a warm fill. Both
		   take a little of the theme colour, so every theme gets its own warmth. */
		--app-warm: color-mix(in srgb, var(--md-sys-color-primary) 5%, #f5f4f2);
		--app-fill: color-mix(in srgb, var(--md-sys-color-primary) 4%, #f9f8f7);
		--app-card: #ffffff;
		--app-card-shadow: 0 1px 2px rgb(60 30 15 / 0.06);
		/* What the view lies on, for what must cover it, such as a header that stays on top. */
		--app-page: var(--md-sys-color-background);

		min-height: 100dvh;
		/* A view swiped out to the side does not make the page scroll sideways. */
		overflow-x: clip;
		display: flex;
		flex-direction: column;
		/* m3e-theme only sets the type when it is the body's child; Roboto is Android's own. */
		font-family: Roboto, system-ui, sans-serif;
		background-color: var(--app-page);
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
			--app-warm: var(--md-sys-color-background);
			--app-fill: var(--md-sys-color-surface-container-highest);
			--app-card: var(--md-sys-color-surface-container);
			--app-card-shadow: none;
		}
	}

	/* A view in the new look marks itself with .warm-view. */
	.app:has(:global(.warm-view)) {
		--app-page: var(--app-warm);
	}

	.content {
		flex-grow: 1;
		display: flow-root;
	}

	/* Room at the end of a view, so its last row can be scrolled up above the floating menu. */
	.content.floating {
		padding-bottom: calc(7.5rem + env(safe-area-inset-bottom));
	}

	/* A soft fade at the bottom, so the list does not show straight behind the menu. It lies above
	   the rows' invisible links (z-index 1) but lets taps through. */
	.fade {
		position: fixed;
		inset: auto 0 0;
		height: calc(7.5rem + env(safe-area-inset-bottom));
		z-index: 2;
		pointer-events: none;
		background: linear-gradient(to bottom, transparent, var(--app-page) 60%);
	}

	.fab {
		position: fixed;
		right: 1rem;
		bottom: calc(1.25rem + env(safe-area-inset-bottom));
		z-index: 3;
	}

	.fab :global(m3e-fab) {
		--m3e-fab-container-height: 4rem;
		--m3e-fab-shape: 1.25rem;
		--m3e-fab-icon-size: 1.625rem;
		--m3e-fab-leading-space: 1.1875rem;
		--m3e-fab-trailing-space: 1.1875rem;
	}

	footer {
		padding: 1rem;
		text-align: center;
		font-size: 0.75rem;
		opacity: 0.7;
	}
</style>
