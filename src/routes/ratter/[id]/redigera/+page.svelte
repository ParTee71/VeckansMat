<script lang="ts">
	import { enhance } from '$app/forms';
	import FormHeader from '#lib/FormHeader.svelte';
	import RecipeFields from '#lib/RecipeFields.svelte';
	import { formValues, LUNCHBOX_TAG } from '#lib/recipes.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// After a failed save the form shows what was written, not what is stored.
	let saved = $derived(data.recipe);
	let values = $derived(form?.values ?? formValues(saved));
	let lunchbox = $derived(form?.lunchbox ?? saved.tags.includes(LUNCHBOX_TAG));
</script>

<svelte:head>
	<title>Redigera {saved.name} – Veckans mat</title>
</svelte:head>

<form method="POST" class="form-page warm-view" use:enhance>
	<FormHeader title="Redigera rätt" back="/ratter/{saved.id}" />

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	<RecipeFields {values} {lunchbox} sort={{ guessed: saved.categoryGuessed }} />
</form>
