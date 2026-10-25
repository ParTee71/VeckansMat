<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import RecipeFields from '#lib/RecipeFields.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import { LUNCHBOX_TAG } from '#lib/recipes.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// After a failed save the form shows what was written, not what is stored.
	let saved = $derived(data.recipe);
	let values = $derived(
		form?.values ?? {
			name: saved.name,
			servings: saved.servings?.toString() ?? '',
			timeMinutes: saved.timeMinutes?.toString() ?? '',
			ingredients: saved.ingredients.join('\n'),
			instructions: saved.instructions ?? '',
			tags: saved.tags.filter((tag) => tag !== LUNCHBOX_TAG).join(', '),
			sourceUrl: saved.sourceUrl ?? ''
		}
	);
	let lunchbox = $derived(form?.lunchbox ?? saved.tags.includes(LUNCHBOX_TAG));
</script>

<svelte:head>
	<title>Redigera {saved.name} – Veckans mat</title>
</svelte:head>

<form method="POST" use:enhance>
	<header>
		<m3e-icon-button variant="tonal" href="/ratter/{saved.id}" aria-label="Avbryt">
			<Icon name="close" />
		</m3e-icon-button>
		<h1>Redigera rätt</h1>
		<SubmitButton variant="filled">Spara</SubmitButton>
	</header>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	<RecipeFields {values} {lunchbox} />
</form>

<style>
	form {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

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

	.error {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}
</style>
