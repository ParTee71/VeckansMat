<script lang="ts">
	import FoldCard from '#lib/FoldCard.svelte';
	import Icon from '#lib/Icon.svelte';
	import {
		BASES,
		CATEGORIES,
		hasOnlyName,
		LUNCHBOX_TAG,
		MEAL_LABELS,
		splitSteps,
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
	let facts = $derived([
		...(recipe.servings ? [`${recipe.servings} portioner`] : []),
		...(recipe.timeMinutes ? [`${recipe.timeMinutes} min`] : []),
		...recipe.tags.map((tag) => (tag === LUNCHBOX_TAG ? 'Passar till matlådor' : tag))
	]);
	let steps = $derived(splitSteps(recipe.instructions));
</script>

<svelte:head>
	<title>{recipe.name} – Veckans mat</title>
</svelte:head>

<header class="warm-view">
	<m3e-icon-button href="/ratter" aria-label="Tillbaka till rätter">
		<Icon name="back" />
	</m3e-icon-button>
	<m3e-icon-button href="/ratter/{recipe.id}/redigera" aria-label="Redigera">
		<Icon name="edit" />
	</m3e-icon-button>
</header>

<main>
	<div class="title">
		{#if category || base}
			<p class="label">
				{#if category}
					<span class="sort" style:background={category.tint} style:color={category.ink}>
						<Icon name={category.key} />
					</span>
					<span>{category.label}</span>
				{/if}
				{#if category && base}·{/if}
				{#if base}<span>{base.label}</span>{/if}
			</p>
		{/if}
		<h1>{recipe.name}</h1>
		<p class="eaten">{eaten}</p>
		{#if facts.length}
			<ul class="facts">
				{#each facts as fact (fact)}<li>{fact}</li>{/each}
			</ul>
		{/if}
		{#if recipe.categoryGuessed}
			<p class="meta">Sort och bas gissade av Claude. Ändra under Redigera.</p>
		{/if}
	</div>

	{#if onlyName}
		<section class="banner invite">
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
					<span slot="icon" class="slot-icon"><Icon name="camera" /></span>Hämta receptet
				</m3e-button>
				<m3e-button variant="text" href="/ratter/{recipe.id}/redigera">Skriv in själv</m3e-button>
			</div>
		</section>
	{/if}

	{#if recipe.ingredients.length}
		<FoldCard
			title="Ingredienser"
			count={recipe.ingredients.length}
			note={recipe.ingredientsGuessed ? 'Gissade' : undefined}
		>
			<ul class="lines">
				{#each recipe.ingredients as line, i (i)}<li>{line}</li>{/each}
			</ul>
		</FoldCard>
	{/if}
	{#if steps.length || recipe.sourceUrl}
		<FoldCard title="Gör så här">
			{#if steps.length}
				<ol class="steps">
					{#each steps as step, i (i)}
						<li><span class="number" aria-hidden="true">{i + 1}</span><span>{step}</span></li>
					{/each}
				</ol>
			{/if}
			{#if recipe.sourceUrl}
				<p class="source">
					Från
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a page on another site -->
					<a href={recipe.sourceUrl} target="_blank" rel="noreferrer"
						>{URL.parse(recipe.sourceUrl)?.hostname ?? recipe.sourceUrl}</a
					>
				</p>
			{/if}
		</FoldCard>
	{/if}
	{#if recipe.weeks.length}
		<FoldCard title="Veckor med rätten" count={recipe.weeks.length} open={onlyName}>
			<m3e-list>
				{#each recipe.weeks as week, i (i)}
					<m3e-list-action href="/veckor#vecka-{week.menuId}">
						{weekName(week.weekStart)}
						<span slot="trailing">{MEAL_LABELS[week.meal]}</span>
					</m3e-list-action>
				{/each}
			</m3e-list>
		</FoldCard>
	{/if}
</main>

<style>
	header {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.5rem 0.5rem 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.title {
		margin: 0.125rem 0.375rem 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.title p {
		margin: 0;
	}

	.label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--md-sys-color-primary);
	}

	.sort {
		width: 1.375rem;
		height: 1.375rem;
		border-radius: 0.4375rem;
		display: grid;
		place-items: center;
	}

	.sort :global(svg) {
		width: 0.8125rem;
		height: 0.8125rem;
	}

	h1 {
		margin: 0;
		font-size: 1.875rem;
		line-height: 2.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}

	.eaten {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.facts {
		list-style: none;
		margin: 0.375rem 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.facts li {
		min-height: 1.875rem;
		padding: 0 0.75rem;
		box-sizing: border-box;
		border-radius: 0.9375rem;
		background: var(--app-card);
		box-shadow: var(--app-card-shadow);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant);
		display: flex;
		align-items: center;
	}

	.invite {
		padding: 1rem 1rem 0.875rem;
		border-radius: 1.5rem;
		font-size: 0.9375rem;
		line-height: 1.3125rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.invite p {
		margin: 0;
	}

	.invite-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.invite-actions m3e-button[variant='text'] {
		--m3e-text-button-label-text-color: var(--md-sys-color-on-primary-container);
	}

	.lines {
		margin: 0;
		padding: 0 0 0.5rem;
		list-style: none;
	}

	.lines li {
		min-height: 2.375rem;
		padding: 0.375rem 1.125rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		line-height: 1.375rem;
	}

	.lines li::before {
		content: '';
		width: 0.3125rem;
		height: 0.3125rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--md-sys-color-outline-variant);
	}

	.steps {
		margin: 0;
		padding: 0.125rem 1.125rem 0.625rem;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.steps li {
		display: flex;
		gap: 0.75rem;
		line-height: 1.4375rem;
		white-space: pre-line;
	}

	.number {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		border-radius: 0.75rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		font-size: 0.75rem;
		font-weight: 700;
		display: grid;
		place-items: center;
	}

	.source {
		margin: 0;
		padding: 0.25rem 1.125rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.source a {
		color: var(--md-sys-color-primary);
	}

	m3e-list {
		--m3e-list-item-container-color: transparent;
		padding-bottom: 0.25rem;
	}
</style>
