<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	// The logged-in account as in Google's apps: its Google picture, else the first letter of its
	// name, else a figure when nobody is known, as without Access.
	let { large = false }: { large?: boolean } = $props();

	let account = $derived(page.data.account);
	let src = $derived(
		account?.picture ? `/konto/bild?v=${encodeURIComponent(account.picture)}` : null
	);
	let letter = $derived((account?.name || account?.email || '').charAt(0).toUpperCase());
	// A picture that does not load gives way to the letter, until there is a new one.
	let failed = $state<string | null>(null);
</script>

{#if src && failed !== src}
	<img class:large {src} alt="" onerror={() => (failed = src)} />
{:else}
	<span class:large aria-hidden="true">
		{#if letter}{letter}{:else}<Icon name="person" />{/if}
	</span>
{/if}

<style>
	img,
	span {
		flex: none;
		width: 2.125rem;
		height: 2.125rem;
		border-radius: 50%;
	}

	.large {
		width: 4.5rem;
		height: 4.5rem;
	}

	img {
		object-fit: cover;
	}

	span {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	span.large {
		font-size: 1.75rem;
	}

	span :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
