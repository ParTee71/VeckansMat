<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	// The logged-in account in the top right of the main views, as in Google's apps: its Google
	// picture, else the first letter of its name. It leads to Inställningar.
	let account = $derived(page.data.account);
	let label = $derived(
		account?.name ? `Konto och inställningar, ${account.name}` : 'Konto och inställningar'
	);
	let letter = $derived((account?.name || account?.email || '').charAt(0).toUpperCase());
	// A picture that fails to load gives way to the letter.
	let failed = $state(false);
</script>

<a href={resolve('/installningar')} aria-label={label}>
	{#if account?.picture && !failed}
		<img
			src="/konto/bild?v={encodeURIComponent(account.picture)}"
			alt=""
			onerror={() => (failed = true)}
		/>
	{:else if letter}
		<span aria-hidden="true">{letter}</span>
	{:else}
		<span aria-hidden="true"><Icon name="person" /></span>
	{/if}
</a>

<style>
	a {
		flex: none;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		text-decoration: none;
	}

	a:focus-visible {
		outline: 2px solid var(--md-sys-color-secondary);
	}

	img,
	span {
		width: 2.125rem;
		height: 2.125rem;
		border-radius: 50%;
		box-shadow:
			0 0 0 2px var(--app-page),
			0 0 0 3px var(--md-sys-color-outline-variant);
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

	span :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
