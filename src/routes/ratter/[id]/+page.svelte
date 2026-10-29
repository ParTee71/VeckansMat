<script lang="ts">
	import { postAction } from '#lib/actions.ts';
	import FoldCard from '#lib/FoldCard.svelte';
	import Icon from '#lib/Icon.svelte';
	import RecipeInvite from '#lib/RecipeInvite.svelte';
	import VoteButton from '#lib/VoteButton.svelte';
	import {
		BASES,
		CATEGORIES,
		hasOnlyName,
		LUNCHBOX_TAG,
		MEAL_LABELS,
		splitSteps,
		timesText,
		type Vote
	} from '#lib/recipes.ts';
	import { weekName, weeksText } from '#lib/weeks.ts';
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

	// The vote as just tapped, saved in the background (ADR 0016).
	let voted = $state<Vote | null>(null);
	let voteFailed = $state(false);
	$effect.pre(() => {
		void data;
		voted = null;
	});
	let vote = $derived(voted ?? recipe.vote);

	// One vote is sent at a time, so the last tap is the one saved.
	let sending: Promise<unknown> = Promise.resolve();

	function setVote(value: Vote) {
		voted = value;
		sending = sending.then(async () => {
			const result = await postAction('vote', { vote: value });
			voteFailed = result?.type !== 'success';
			// What failed shows as it was saved, unless a newer tap is on its way.
			if (voteFailed && voted === value) voted = null;
		});
	}
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
		{#if facts.length || vote === 'favorit'}
			<ul class="facts">
				{#if vote === 'favorit'}
					<li class="favourite">
						<Icon name="thumbUp" />Favorit · får komma efter {weeksText(data.favouriteWeeks)}
					</li>
				{/if}
				{#each facts as fact, i (i)}<li>{fact}</li>{/each}
			</ul>
		{/if}
		{#if recipe.categoryGuessed}
			<p class="meta">Sort och bas gissade av Claude. Ändra under Redigera.</p>
		{/if}
	</div>

	<m3e-button class="cook" variant="filled" size="medium" href="/ratter/{recipe.id}/laga">
		<span slot="icon" class="slot-icon"><Icon name="cook" /></span>Laga maten
	</m3e-button>

	<section class="card opinion">
		<div class="opinion-row">
			<h2>Vad tycker ni?</h2>
			<VoteButton name={recipe.name} {vote} onvote={setVote} />
		</div>
		<p class="hint">
			Tumme ner: Claude föreslår inte rätten igen, men den går att skriva in själv.
		</p>
		{#if voteFailed}
			<p class="error-text" role="alert">
				Det gick inte att spara. Kontrollera nätet och försök igen.
			</p>
		{/if}
	</section>

	{#if onlyName}
		<RecipeInvite
			recipeId={recipe.id}
			text={recipe.ingredientsGuessed
				? 'Claude har gissat ingredienserna till inköpslistan. Hämta receptet eller skriv in det när du vill.'
				: 'Rätten har bara ett namn. Lägg till ingredienser när du vill, så kommer de med på inköpslistan.'}
		/>
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
						{#if step.number}
							<li><span class="number" aria-hidden="true">{step.number}</span>{step.text}</li>
						{:else}
							<li class="part">{step.text}</li>
						{/if}
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

	.facts .favourite {
		gap: 0.375rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.favourite :global(svg) {
		width: 1rem;
		height: 1rem;
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

	.cook {
		align-self: stretch;
	}

	.opinion-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.opinion h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
	}

	.opinion p {
		margin: 0;
	}

	.hint {
		font-size: 0.8125rem;
		line-height: 1.25rem;
		color: var(--md-sys-color-on-surface-variant);
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

	.part {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		font-weight: 700;
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
