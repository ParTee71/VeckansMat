<script lang="ts">
	import Icon from './Icon.svelte';
	import SubmitButton from './SubmitButton.svelte';

	// The top of a form that is a view of its own: a button that leaves it, its title, and Spara.
	let {
		title,
		back,
		backLabel = 'Avbryt',
		save = true
	}: { title: string; back: string; backLabel?: string; save?: boolean } = $props();
</script>

<header>
	<m3e-icon-button variant="tonal" href={back} aria-label={backLabel}>
		<Icon name="close" />
	</m3e-icon-button>
	<h1>{title}</h1>
	{#if save}
		<SubmitButton variant="filled">Spara</SubmitButton>
	{/if}
</header>

<style>
	header {
		margin: 0 -0.5rem;
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		font-size: 1.375rem;
		font-weight: 700;
	}
</style>
