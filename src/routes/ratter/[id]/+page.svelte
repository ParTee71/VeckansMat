<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import {
		BASES,
		CATEGORIES,
		hasOnlyName,
		LUNCHBOX_TAG,
		MEAL_LABELS,
		timesText
	} from '#lib/recipes.ts';
	import { weekName } from '#lib/weeks.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let recipe = $derived(data.recipe);
	let onlyName = $derived(hasOnlyName(recipe));
	let category = $derived(CATEGORIES.find((c) => c.key === recipe.category));
	// "Annat" says nothing about the dish, so it is not shown.
	let base = $derived(
		recipe.base === 'annat' ? undefined : BASES.find((b) => b.key === recipe.base)
	);
	let lastWeek = $derived(recipe.weeks.find((w) => w.weekStart)?.weekStart ?? null);
	let eaten = $derived(
		recipe.weeks.length === 0
			? 'Inte ätit än'
			: `Ätits ${timesText(recipe.weeks.length)}` +
					(lastWeek ? `, senast ${weekName(lastWeek).toLocaleLowerCase('sv')}` : '')
	);
</script>

<svelte:head>
	<title>{recipe.name} – Veckans mat</title>
</svelte:head>

<header>
	<m3e-icon-button variant="tonal" href="/ratter" aria-label="Tillbaka till rätter">
		<Icon name="back" />
	</m3e-icon-button>
	<m3e-button variant="tonal" href="/ratter/{recipe.id}/redigera">
		<span slot="icon" class="slot-icon"><Icon name="edit" /></span>Redigera
	</m3e-button>
</header>

<main>
	<section class="hero">
		<h1>{recipe.name}</h1>
		<p>{eaten}</p>
		{#if category || base || recipe.servings || recipe.timeMinutes || recipe.tags.length}
			<ul class="facts">
				{#if category}
					<li class="category" style:background={category.tint} style:color={category.ink}>
						<Icon name={category.key} />{category.label}
					</li>
				{/if}
				{#if base}<li>Med {base.label.toLocaleLowerCase('sv')}</li>{/if}
				{#if recipe.servings}<li>{recipe.servings} portioner</li>{/if}
				{#if recipe.timeMinutes}<li>{recipe.timeMinutes} min</li>{/if}
				{#each recipe.tags as tag (tag)}
					<li class="tag">{tag === LUNCHBOX_TAG ? 'Passar till matlådor' : tag}</li>
				{/each}
			</ul>
		{/if}
		{#if recipe.categoryGuessed}
			<p class="guessed">Sort och bas gissade av Claude. Ändra under Redigera.</p>
		{/if}
	</section>

	{#if onlyName}
		<section class="invite">
			<p>
				{#if recipe.ingredientsGuessed}
					Claude har gissat ingredienserna till inköpslistan. Hämta receptet eller skriv in det när
					du vill.
				{:else}
					Rätten har bara ett namn. Lägg till ingredienser när du vill, så kommer de med på
					inköpslistan.
				{/if}
			</p>
			<div class="invite-actions">
				<m3e-button variant="filled" href="/ratter/ny?till={recipe.id}">
					<span slot="icon" class="slot-icon"><Icon name="camera" /></span>Hämta från länk, foto
					eller text
				</m3e-button>
				<m3e-button variant="tonal" href="/ratter/{recipe.id}/redigera">Skriv in själv</m3e-button>
			</div>
		</section>
	{/if}

	<m3e-accordion multi>
		{#if recipe.ingredients.length}
			<m3e-expansion-panel open>
				<span slot="header">Ingredienser</span>
				<ul>
					{#each recipe.ingredients as line, i (i)}<li>{line}</li>{/each}
				</ul>
			</m3e-expansion-panel>
		{/if}
		{#if recipe.instructions || recipe.sourceUrl}
			<m3e-expansion-panel>
				<span slot="header">Gör så här</span>
				{#if recipe.instructions}<p class="steps">{recipe.instructions}</p>{/if}
				{#if recipe.sourceUrl}
					<p class="source">
						Källa:
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a page on another site -->
						<a href={recipe.sourceUrl} target="_blank" rel="noreferrer"
							>{URL.parse(recipe.sourceUrl)?.hostname ?? recipe.sourceUrl}</a
						>
					</p>
				{/if}
			</m3e-expansion-panel>
		{/if}
		{#if recipe.weeks.length}
			<m3e-expansion-panel open={onlyName || undefined}>
				<span slot="header">Veckor med rätten <span class="count">{recipe.weeks.length}</span></span
				>
				<m3e-list>
					{#each recipe.weeks as week, i (i)}
						<m3e-list-action href="/veckor#vecka-{week.menuId}">
							{weekName(week.weekStart)}
							<span slot="trailing">{MEAL_LABELS[week.meal]}</span>
						</m3e-list-action>
					{/each}
				</m3e-list>
			</m3e-expansion-panel>
		{/if}
	</m3e-accordion>
</main>

<style>
	header {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.25rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.hero {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: 1.75rem;
		padding: 1.25rem;
	}

	h1 {
		margin: 0;
		font-size: 1.875rem;
		line-height: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}

	.hero p {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
	}

	.facts {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.facts li {
		padding: 0.375rem 0.875rem;
		border-radius: 1rem;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.facts .category {
		padding-left: 0.625rem;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.category :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.hero .guessed {
		margin-top: 0.625rem;
		font-size: 0.8125rem;
	}

	.facts .tag {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.invite {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: 1.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.875rem;
	}

	.invite p {
		margin: 0;
	}

	.invite-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	ul {
		margin: 0;
		padding-left: 1.25rem;
		line-height: 1.75;
	}

	.steps {
		margin: 0;
		white-space: pre-line;
	}

	.source {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.source a {
		color: var(--md-sys-color-primary);
	}

	.count {
		margin-left: 0.5rem;
		color: var(--md-sys-color-on-surface-variant);
		font-weight: 400;
	}
</style>
