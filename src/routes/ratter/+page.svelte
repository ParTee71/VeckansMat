<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import ThemeSheet from '#lib/ThemeSheet.svelte';
	import { nameKey } from '#lib/names.ts';
	import { timesText } from '#lib/recipes.ts';
	import { shortWeekName } from '#lib/weeks.ts';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	let query = $state('');
	const orders = [
		['often', 'Oftast'],
		['name', 'A–Ö']
	] as const;
	let order = $state<(typeof orders)[number][0]>('often');

	const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'sv');

	let sorted = $derived(
		data.recipes.toSorted(
			order === 'name'
				? byName
				: (a, b) =>
						b.timesEaten - a.timesEaten ||
						(b.lastWeek ?? '').localeCompare(a.lastWeek ?? '') ||
						byName(a, b)
		)
	);
	let key = $derived(nameKey(query));
	let shown = $derived(key ? sorted.filter((r) => nameKey(r.name).includes(key)) : sorted);
	let exact = $derived(key ? data.recipes.find((r) => nameKey(r.name) === key) : undefined);
	// A link is not a dish's name but a recipe to read.
	let link = $derived(/^https?:\/\/\S+$/i.test(query.trim()));

	function meta(timesEaten: number, lastWeek: string | null) {
		if (timesEaten === 0) return 'Inte ätit än';
		const times = timesText(timesEaten);
		return lastWeek ? `${times} · senast ${shortWeekName(lastWeek)}` : times;
	}

	// A dish that already exists is opened instead of added again. A link is sent on, and the
	// server sends it to Nytt recept.
	const add: SubmitFunction = ({ cancel }) => {
		if (exact) {
			cancel();
			goto(resolve('/ratter/[id]', { id: String(exact.id) }));
			return;
		}
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') query = '';
		};
	};

	function openAdded(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState === 'closed' && event.currentTarget.isActionTaken && form?.added) {
			goto(resolve('/ratter/[id]', { id: String(form.added.id) }));
		}
	}

	const shapes = ['round', 'square', 'leaf'];
</script>

<svelte:head>
	<title>Rätter – Veckans mat</title>
</svelte:head>

<main>
	<div class="title">
		<h1>Rätter</h1>
		<m3e-icon-button aria-label="Byt färg">
			<m3e-bottom-sheet-trigger for="theme"><Icon name="palette" /></m3e-bottom-sheet-trigger>
		</m3e-icon-button>
	</div>

	<form method="POST" action="?/add" use:enhance={add}>
		<m3e-search-bar clearable clear-label="Rensa">
			<span slot="leading" class="slot-icon"><Icon name="search" /></span>
			<input
				slot="input"
				name="name"
				type="search"
				autocomplete="off"
				placeholder="Sök eller lägg till rätt"
				aria-label="Sök eller lägg till rätt"
				bind:value={query}
			/>
		</m3e-search-bar>
		{#if link}
			<SubmitButton variant="filled" size="medium" icon="link">Hämta receptet</SubmitButton>
		{:else if key && !exact}
			<SubmitButton variant="filled" size="medium" icon="add"
				>Lägg till ”{query.trim()}”</SubmitButton
			>
		{/if}
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
	</form>

	{#if !key}
		<div class="order">
			<m3e-button-group variant="connected">
				{#each orders as [value, label] (value)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
					<m3e-button
						variant={order === value ? 'filled' : 'tonal'}
						aria-pressed={order === value}
						onclick={() => (order = value)}>{label}</m3e-button
					>
				{/each}
			</m3e-button-group>
			<span>{data.recipes.length} rätter</span>
		</div>
	{:else if shown.length > 0 && !exact && !link}
		<h2>Liknande rätter</h2>
	{/if}

	{#if data.recipes.length === 0}
		<p class="empty">Inga rätter än. Skriv namnet på en rätt ovan och lägg till den.</p>
	{:else if shown.length > 0}
		<m3e-list variant="segmented">
			{#each shown as recipe, i (recipe.id)}
				<m3e-list-action href="/ratter/{recipe.id}">
					<span slot="leading" class="initial {shapes[i % shapes.length]}" aria-hidden="true"
						>{recipe.name[0]}</span
					>
					{recipe.name}
					<span slot="supporting-text">{meta(recipe.timesEaten, recipe.lastWeek)}</span>
					<span slot="trailing" class="slot-icon"><Icon name="next" /></span>
				</m3e-list-action>
			{/each}
		</m3e-list>
	{/if}
</main>

<m3e-fab extended variant="primary-container" href="/ratter/ny">
	<Icon name="add" />
	<span slot="label">Nytt recept</span>
</m3e-fab>

<ThemeSheet id="theme" />

{#key form?.added}
	{#if form?.added}
		<m3e-snackbar action="Öppna" duration="6000" open ontoggle={openAdded}>
			{form.added.name} är tillagd
		</m3e-snackbar>
	{/if}
{/key}

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		/* Room below the list for the floating button. */
		padding: 1rem 1rem 5.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.title {
		margin: 0.75rem 0 0 0.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h1 {
		margin: 0;
		font-size: 2.25rem;
		line-height: 2.75rem;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	h2 {
		margin: 0.25rem 0 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.error {
		margin: 0;
		color: var(--md-sys-color-error);
	}

	.order {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	m3e-list {
		--m3e-segmented-list-item-container-color: var(--md-sys-color-surface-container);
	}

	m3e-fab {
		position: fixed;
		right: 1rem;
		/* Above the nav bar, which is 5rem high. */
		bottom: calc(5rem + 1rem + env(safe-area-inset-bottom));
		z-index: 1;
	}

	.empty {
		color: var(--md-sys-color-on-surface-variant);
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
