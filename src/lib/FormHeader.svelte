<script lang="ts">
	import Icon from './Icon.svelte';
	import SubmitButton from './SubmitButton.svelte';

	// The top of a form that is a view of its own: a button that leaves it, its title, and Spara.
	// It stays on top while the form scrolls.
	let {
		title,
		back,
		backLabel = 'Avbryt',
		save = true
	}: { title: string; back: string; backLabel?: string; save?: boolean } = $props();
</script>

<header>
	<m3e-icon-button href={back} aria-label={backLabel}>
		<Icon name="close" />
	</m3e-icon-button>
	<h1>{title}</h1>
	{#if save}
		<SubmitButton variant="filled">Spara</SubmitButton>
	{/if}
</header>

<style>
	/* Above the rows of a list, whose invisible links have z-index 1. */
	header {
		position: sticky;
		top: 0;
		z-index: 2;
		margin: 0 -1rem;
		padding: 0.5rem 1rem 0.5rem 0.5rem;
		background: var(--app-page);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
	}
</style>
