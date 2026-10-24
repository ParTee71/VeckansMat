<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	// m3e-button type="submit" makes itself the submitter, which SvelteKit's enhance hands
	// to new FormData() and the browser rejects, so the form is submitted without one.
	let {
		children,
		icon,
		...rest
	}: { children: Snippet; icon?: IconName; variant?: string; size?: string } = $props();

	function submit(event: MouseEvent & { currentTarget: HTMLElement }) {
		event.currentTarget.closest('form')?.requestSubmit();
	}
</script>

<m3e-button {...rest} onclick={submit}>
	{#if icon}<span slot="icon" class="slot-icon"><Icon name={icon} /></span>{/if}
	{@render children()}
</m3e-button>
