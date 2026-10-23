<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/env';
	import { beforeNavigate } from '$app/navigation';
	import { updated } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
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
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Veckans mat</title>
</svelte:head>

<m3e-theme color="#386a20" scheme="auto" motion="expressive" strong-focus>
	{@render children()}
	<footer>Version {version}</footer>
</m3e-theme>

<style>
	footer {
		padding: 1rem;
		text-align: center;
		font-size: 0.75rem;
		opacity: 0.7;
	}
</style>
