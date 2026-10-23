<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/env';
	import { beforeNavigate } from '$app/navigation';
	import { updated } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

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

<m3e-theme color="#386a20" scheme="auto" motion="expressive" strong-focus>
	<div class="app">
		{@render children()}
		<footer>Version {version}</footer>
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

	.app {
		min-height: 100dvh;
		display: flow-root;
		background-color: var(--md-sys-color-background);
		color: var(--md-sys-color-on-background);
	}

	footer {
		padding: 1rem;
		text-align: center;
		font-size: 0.75rem;
		opacity: 0.7;
	}
</style>
