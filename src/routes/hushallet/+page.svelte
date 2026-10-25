<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import { LUNCHBOX_EXTRA_CHOICES, MAX_NEW_DISHES } from '#lib/household.ts';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	// Shown at once when tapped, and saved right after.
	let newDishes = $derived(data.settings.newDishesPerWeek);
	let lunchboxExtra = $derived(data.settings.lunchboxExtraPortions);

	let settingsForm: HTMLFormElement;

	// The rules field keeps what is being written while the page reloads its data.
	const keepFields: SubmitFunction =
		() =>
		async ({ update }) =>
			update({ reset: false });

	async function save() {
		await tick();
		settingsForm.requestSubmit();
	}

	const shapes = ['round', 'square', 'leaf'];
</script>

<svelte:head>
	<title>Hushållet – Veckans mat</title>
</svelte:head>

<header>
	<m3e-icon-button variant="tonal" href="/" aria-label="Tillbaka">
		<Icon name="back" />
	</m3e-icon-button>
	<h1>Hushållet</h1>
</header>

<main>
	<h2>Personer</h2>
	{#if data.people.length === 0}
		<p class="hint">Inga personer än. Lägg till de som brukar äta, med det de inte äter.</p>
	{:else}
		<m3e-list variant="segmented">
			{#each data.people as person, i (person.id)}
				<m3e-list-action href="/hushallet/{person.id}">
					<span slot="leading" class="initial {shapes[i % shapes.length]}" aria-hidden="true"
						>{person.name[0]}</span
					>
					{person.name}
					<span slot="supporting-text">{person.requirements.split('\n')[0] || 'Inga krav'}</span>
				</m3e-list-action>
			{/each}
		</m3e-list>
	{/if}
	<m3e-button variant="tonal" href="/hushallet/ny" class="add">
		<span slot="icon" class="slot-icon"><Icon name="add" /></span>Lägg till person
	</m3e-button>

	<h2>Regler för varje vecka</h2>
	<form method="POST" action="?/settings" use:enhance={keepFields} bind:this={settingsForm}>
		<m3e-form-field variant="filled">
			<label slot="label" for="menuRules">Skriv som till en person, en regel per rad</label>
			<textarea
				id="menuRules"
				name="menuRules"
				rows="4"
				value={data.settings.menuRules}
				onchange={save}></textarea>
			<m3e-textarea-autosize for="menuRules"></m3e-textarea-autosize>
		</m3e-form-field>

		<div class="setting">
			<span id="new-dishes">Nya rätter per vecka</span>
			<div class="stepper">
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					variant="tonal"
					aria-label="Färre nya rätter"
					disabled={newDishes <= 0 || undefined}
					onclick={() => {
						newDishes--;
						save();
					}}><Icon name="remove" /></m3e-icon-button
				>
				<output aria-labelledby="new-dishes">{newDishes}</output>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					variant="tonal"
					aria-label="Fler nya rätter"
					disabled={newDishes >= MAX_NEW_DISHES || undefined}
					onclick={() => {
						newDishes++;
						save();
					}}><Icon name="add" /></m3e-icon-button
				>
			</div>
			<input type="hidden" name="newDishesPerWeek" value={newDishes} />
		</div>

		<div class="setting">
			<span>Extra portioner till matlådor</span>
			<m3e-button-group variant="connected">
				{#each LUNCHBOX_EXTRA_CHOICES as n (n)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
					<m3e-button
						variant={lunchboxExtra === n ? 'filled' : 'tonal'}
						aria-label="{n} extra portioner"
						onclick={() => {
							lunchboxExtra = n;
							save();
						}}>{n}</m3e-button
					>
				{/each}
			</m3e-button-group>
			<input type="hidden" name="lunchboxExtraPortions" value={lunchboxExtra} />
		</div>

		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
		<p class="hint">Sparas direkt. Gäller varje vecka, tillsammans med kraven för de som äter.</p>
	</form>
</main>

<style>
	header {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.5rem 0.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		margin: 0;
		font-size: 1.375rem;
		font-weight: 700;
	}

	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	h2 {
		margin: 0.75rem 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	m3e-form-field {
		width: 100%;
	}

	m3e-list {
		--m3e-segmented-list-item-container-color: var(--md-sys-color-surface-container);
	}

	.add {
		align-self: flex-start;
	}

	.setting {
		min-height: 3.5rem;
		padding: 0.25rem 0.5rem 0.25rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	output {
		width: 1.75rem;
		text-align: center;
		font-size: 1.125rem;
		font-weight: 700;
	}

	.hint {
		margin: 0 0.25rem;
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.error {
		margin: 0;
		color: var(--md-sys-color-error);
	}

	.initial {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.round {
		border-radius: 50%;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.square {
		border-radius: 0.875rem;
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.leaf {
		border-radius: 50% 50% 50% 0.75rem;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}
</style>
