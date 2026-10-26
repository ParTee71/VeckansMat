<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import Initial from '#lib/Initial.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import { useFab } from '#lib/fab.svelte.ts';
	import ThemeSheet from '#lib/ThemeSheet.svelte';
	import { recipeUrl } from '#lib/links.ts';
	import { nameKey } from '#lib/names.ts';
	import { byName, byOften, matching, timesText } from '#lib/recipes.ts';
	import { shortWeekName } from '#lib/weeks.ts';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import type { RecipeSummary } from '#lib/server/db/recipes.ts';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	useFab(newDish);

	let query = $state('');
	const orders = [
		['often', 'Oftast'],
		['name', 'A–Ö']
	] as const;
	let order = $state<(typeof orders)[number][0]>('often');

	// Dishes added here, shown at once without loading the page again.
	let added = $state<RecipeSummary[]>([]);
	$effect.pre(() => {
		void data;
		added = [];
	});
	let recipes = $derived([...data.recipes, ...added]);

	let key = $derived(nameKey(query));
	let shown = $derived(matching(recipes, query).toSorted(order === 'name' ? byName : byOften));
	let exact = $derived(key ? recipes.find((r) => nameKey(r.name) === key) : undefined);
	// A link is not a dish's name but a recipe to read.
	let link = $derived(!!recipeUrl(query, true));

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
			await update({ invalidateAll: false });
			if (result.type === 'success' && result.data?.added) {
				const { id, name } = result.data.added as { id: number; name: string };
				added.push({ id, name, timesEaten: 0, lastWeek: null, category: null, base: null });
				query = '';
			}
		};
	};

	function openAdded(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState === 'closed' && event.currentTarget.isActionTaken && form?.added) {
			goto(resolve('/ratter/[id]', { id: String(form.added.id) }));
		}
	}
</script>

<svelte:head>
	<title>Rätter – Veckans mat</title>
</svelte:head>

<main>
	<div class="title">
		<h1 class="view-title">Rätter</h1>
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
			<p class="error-text" role="alert">{form.error}</p>
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
			<span>{recipes.length} rätter</span>
		</div>
	{:else if shown.length > 0 && !exact && !link}
		<h2>Liknande rätter</h2>
	{/if}

	{#if recipes.length === 0}
		<p class="empty">Inga rätter än. Skriv namnet på en rätt ovan och lägg till den.</p>
	{:else if shown.length > 0}
		<m3e-list variant="segmented">
			{#each shown as recipe, i (recipe.id)}
				<m3e-list-action href="/ratter/{recipe.id}">
					<Initial name={recipe.name} index={i} />
					{recipe.name}
					<span slot="supporting-text">{meta(recipe.timesEaten, recipe.lastWeek)}</span>
					<span slot="trailing" class="slot-icon"><Icon name="next" /></span>
				</m3e-list-action>
			{/each}
		</m3e-list>
	{/if}
</main>

{#snippet newDish()}
	<m3e-fab variant="primary" href="/ratter/ny" aria-label="Ny rätt"><Icon name="add" /></m3e-fab>
{/snippet}

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
		padding: 1rem;
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

	.order {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.empty {
		color: var(--md-sys-color-on-surface-variant);
	}
</style>
