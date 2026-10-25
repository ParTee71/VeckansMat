<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import RecipeFields from '#lib/RecipeFields.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import { timesText } from '#lib/recipes.ts';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	let review = $derived(form && 'review' in form ? form.review : null);
	// The dish being filled in stays in the URL, also in the forms' actions, since the page
	// lands where a form is sent.
	let till = $derived(data.target ? `&till=${data.target.id}` : '');
	let restart = $derived(data.target ? `/ratter/ny?till=${data.target.id}` : '/ratter/ny');

	let reading = $state(false);
	const read: SubmitFunction = () => {
		reading = true;
		return async ({ update }) => {
			await update({ reset: false });
			reading = false;
		};
	};

	// A link from the search field on Rätter is read straight away.
	let readForm: HTMLFormElement | undefined = $state();
	onMount(() => {
		if (data.link) readForm?.requestSubmit();
	});

	function existingText(timesEaten: number) {
		const eaten = timesEaten ? ` och har ätits ${timesText(timesEaten)}` : '';
		return `Den har bara ett namn${eaten}. Spara fyller i den, så ligger veckorna kvar.`;
	}
</script>

<svelte:head>
	<title>Nytt recept – Veckans mat</title>
</svelte:head>

{#if review}
	<form method="POST" action="?/save{till}" use:enhance>
		<header>
			<m3e-icon-button variant="tonal" href={restart} aria-label="Börja om">
				<Icon name="close" />
			</m3e-icon-button>
			<h1>Nytt recept</h1>
			<SubmitButton variant="filled">Spara</SubmitButton>
		</header>

		{#if review.existing}
			<section class="notice">
				<strong>{review.existing.name} finns redan</strong>
				{#if review.existing.onlyName}
					<span>{existingText(review.existing.timesEaten)}</span>
				{:else}
					<span>
						Den har redan ingredienser eller steg. Byt namn för att spara den här som en ny rätt.
					</span>
					<a href={resolve('/ratter/[id]', { id: String(review.existing.id) })}
						>Öppna {review.existing.name}</a
					>
				{/if}
			</section>
		{:else if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{:else if review.target}
			<p class="done">Fyller i {review.target.name}. Kolla att det stämmer och spara.</p>
		{:else if review.source}
			<p class="done">Hämtat från {review.source}. Kolla att det stämmer och spara.</p>
		{/if}

		<RecipeFields values={review.values} lunchbox={review.lunchbox} />
	</form>
{:else}
	<form method="POST" action="?/read{till}" use:enhance={read} bind:this={readForm}>
		<header>
			<m3e-icon-button
				variant="tonal"
				href={data.target ? `/ratter/${data.target.id}` : '/ratter'}
				aria-label="Avbryt"
			>
				<Icon name="close" />
			</m3e-icon-button>
			<h1>Nytt recept</h1>
		</header>

		{#if reading}
			<div class="reading">
				<m3e-loading-indicator></m3e-loading-indicator>
				<p role="status">Läser receptet …</p>
				<p class="hint">Det brukar ta några sekunder.</p>
			</div>
		{:else}
			<p class="hint">
				{#if data.target}
					Klistra in en länk till receptet på {data.target.name}.
				{:else}
					Klistra in en länk till ett recept.
				{/if}
			</p>

			{#if form?.readError}
				<p class="error" role="alert">{form.readError}</p>
			{/if}

			<m3e-form-field variant="filled">
				<label slot="label" for="link">Länk till receptet</label>
				<textarea id="link" name="link" rows="3" value={form?.link ?? data.link}></textarea>
				<m3e-textarea-autosize for="link"></m3e-textarea-autosize>
			</m3e-form-field>

			<SubmitButton variant="filled" size="medium">Läs in receptet</SubmitButton>
		{/if}
	</form>

	{#if !reading && form && 'canFillIn' in form && form.canFillIn}
		<form method="POST" action="?/fillIn{till}" use:enhance class="fill-in">
			<input type="hidden" name="link" value={form.link} />
			<SubmitButton variant="text">Fyll i själv, med länken sparad</SubmitButton>
		</form>
	{/if}
{/if}

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

	.hint {
		margin: 0 0.25rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.fill-in {
		padding-top: 0;
		align-items: center;
	}

	.reading {
		padding: 4rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.reading p[role='status'] {
		margin: 1rem 0 0;
		font-size: 1.375rem;
		font-weight: 700;
	}

	.error,
	.done,
	.notice {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
	}

	.error {
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.done {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.notice {
		background: var(--md-sys-color-surface-container-highest);
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.notice span {
		color: var(--md-sys-color-on-surface-variant);
	}

	.notice a {
		color: var(--md-sys-color-primary);
	}
</style>
