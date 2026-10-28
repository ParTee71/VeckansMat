<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Avatar from './Avatar.svelte';

	// The logged-in account in the top right of the main views, as in Google's apps. It leads to
	// Inställningar.
	let name = $derived(page.data.account?.name);
</script>

<a
	href={resolve('/installningar')}
	aria-label={name ? `Konto och inställningar, ${name}` : 'Konto och inställningar'}
>
	<Avatar />
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

	/* A thin ring, so the picture stands apart from the page. */
	a :global(:is(img, span)) {
		box-shadow:
			0 0 0 2px var(--app-page),
			0 0 0 3px var(--md-sys-color-outline-variant);
	}
</style>
