<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
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

	<m3e-form-field variant="filled">
		<label slot="label" for="name">Namn</label>
		<input id="name" name="name" required value={values.name} />
	</m3e-form-field>
	<div class="pair">
		<m3e-form-field variant="filled">
			<label slot="label" for="servings">Portioner</label>
			<input id="servings" name="servings" inputmode="numeric" value={values.servings} />
		</m3e-form-field>
		<m3e-form-field variant="filled">
			<label slot="label" for="timeMinutes">Tid i minuter</label>
			<input id="timeMinutes" name="timeMinutes" inputmode="numeric" value={values.timeMinutes} />
		</m3e-form-field>
	</div>
	<m3e-form-field variant="filled">
		<label slot="label" for="ingredients">Ingredienser, en per rad</label>
		<textarea id="ingredients" name="ingredients" rows="4" value={values.ingredients}></textarea>
		<m3e-textarea-autosize for="ingredients"></m3e-textarea-autosize>
	</m3e-form-field>
	<m3e-form-field variant="filled">
		<label slot="label" for="instructions">Gör så här</label>
		<textarea id="instructions" name="instructions" rows="3" value={values.instructions}></textarea>
		<m3e-textarea-autosize for="instructions"></m3e-textarea-autosize>
	</m3e-form-field>
	<div class="switch">
		<label for="lunchbox">Passar till matlådor</label>
		<m3e-switch id="lunchbox" name="lunchbox" checked={lunchbox || undefined}></m3e-switch>
	</div>
	<m3e-form-field variant="filled">
		<label slot="label" for="tags">Taggar, med komma emellan</label>
		<input id="tags" name="tags" value={values.tags} />
	</m3e-form-field>
	<m3e-form-field variant="filled">
		<label slot="label" for="sourceUrl">Länk till receptet</label>
		<input id="sourceUrl" name="sourceUrl" type="url" value={values.sourceUrl} />
	</m3e-form-field>
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

	m3e-form-field {
		width: 100%;
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.switch {
		min-height: 3.5rem;
		padding: 0 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-surface-container-highest);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.error {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}
</style>
