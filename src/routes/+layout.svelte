<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The m3e web components touch `customElements`, which only exists in the
	// browser, so they are registered after hydration instead of during SSR.
	onMount(() => {
		import('#lib/m3e.ts');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Veckans mat</title>
</svelte:head>

<m3e-theme color="#386a20" scheme="auto" motion="expressive" strong-focus>
	{@render children()}
</m3e-theme>
