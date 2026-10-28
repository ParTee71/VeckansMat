<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AccountButton from '#lib/AccountButton.svelte';
	import FoldCard from '#lib/FoldCard.svelte';
	import Icon from '#lib/Icon.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import { useFab } from '#lib/fab.svelte.ts';
	import { recipeUrl } from '#lib/links.ts';
	import { nameKey } from '#lib/names.ts';
	import { byName, byOften, CATEGORIES, categoryLook, matching } from '#lib/recipes.ts';
	import { eatenText } from '#lib/weeks.ts';
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
	// The dishes per sort, in the sorts' order. A dish Claude has not sorted yet is Övrigt.
	let groups = $derived(
		CATEGORIES.map((c) => ({
			...c,
			recipes: shown.filter((r) => (r.category ?? 'ovrigt') === c.key)
		})).filter((g) => g.recipes.length)
	);

	// The sorts folded away, which each phone remembers. All start open, since a dish just added
	// is Övrigt until Claude has sorted it.
	const FOLDED_KEY = 'ratter-stangda';
	let folded = $state<Record<string, boolean>>({});
	$effect(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? 'null');
			if (stored && typeof stored === 'object') folded = stored;
		} catch {
			// Nothing remembered, or no storage.
		}
	});
	function fold(key: string, open: boolean) {
		folded[key] = !open;
		try {
			localStorage.setItem(FOLDED_KEY, JSON.stringify(folded));
		} catch {
			// Remembered for this visit only.
		}
	}
	let exact = $derived(key ? recipes.find((r) => nameKey(r.name) === key) : undefined);
	// A link is not a dish's name but a recipe to read.
	let link = $derived(!!recipeUrl(query, true));

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
				added.push({
					id,
					name,
					timesEaten: 0,
					lastWeek: null,
					category: null,
					base: null,
					vote: null
				});
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

<main class="warm-view">
	<div class="top">
		<p class="label">{recipes.length} rätter</p>
		<AccountButton />
	</div>
	<h1 class="view-title">Rätter</h1>

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
		</div>
	{:else if shown.length > 0 && !exact && !link}
		<h2>Liknande rätter</h2>
	{/if}

	{#if recipes.length === 0}
		<p class="empty">Inga rätter än. Skriv namnet på en rätt ovan och lägg till den.</p>
	{:else}
		{#each groups as group (group.key)}
			<!-- While searching, every sort with a match is open, and stays so. -->
			<FoldCard
				title={group.label}
				look={categoryLook(group.key)}
				count={group.recipes.length}
				bind:open={() => !!key || !folded[group.key], (open) => key || fold(group.key, open)}
			>
				<m3e-list>
					{#each group.recipes as recipe (recipe.id)}
						<m3e-list-action href="/ratter/{recipe.id}">
							<span
								>{recipe.name}{#if recipe.vote === 'favorit'}<span
										class="vote"
										role="img"
										aria-label="Favorit"><Icon name="thumbUp" /></span
									>{:else if recipe.vote === 'aldrig'}<span
										class="vote never"
										role="img"
										aria-label="Aldrig mer"><Icon name="thumbUp" /></span
									>{/if}</span
							>
							<span slot="trailing" class="meta">{eatenText(recipe)}</span>
						</m3e-list-action>
					{/each}
				</m3e-list>
			</FoldCard>
		{/each}
	{/if}
</main>

{#snippet newDish()}
	<m3e-fab variant="primary" href="/ratter/ny" aria-label="Ny rätt"><Icon name="add" /></m3e-fab>
{/snippet}

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

	/* Like the line of a week at the top of Veckan and Handla. */
	.top {
		margin: 0 -0.5rem -0.75rem 0.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--md-sys-color-primary);
	}

	h1 {
		margin-left: 0.25rem;
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

	/* Compact rows, as in Handla. */
	m3e-list {
		--m3e-list-item-container-color: transparent;
		--m3e-list-item-one-line-height: 2.875rem;
		--m3e-list-item-one-line-top-space: 0.25rem;
		--m3e-list-item-one-line-bottom-space: 0.25rem;
		padding-bottom: 0.25rem;
	}

	.vote {
		margin-left: 0.25rem;
		vertical-align: -0.125rem;
		color: var(--md-sys-color-primary);
	}

	.vote :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.never {
		color: var(--md-sys-color-on-surface-variant);
	}

	.never :global(svg) {
		transform: scaleY(-1);
	}

	.meta {
		font-size: 0.75rem;
		color: var(--md-sys-color-on-surface-variant);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
