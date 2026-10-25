<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { MEAL_LABELS } from '#lib/recipes.ts';
	import { WEEKDAYS, weekDates, weekName } from '#lib/weeks.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// A link to a week (from a dish) opens that week; otherwise the newest is open.
	// The hash only exists in the browser.
	let target = $state('');
	onMount(() => (target = location.hash));
	const isOpen = (id: number, index: number) => (target ? target === `#vecka-${id}` : index === 0);

	const meals = Object.entries(MEAL_LABELS);

	type Menu = (typeof data.menus)[number];
	// Undated weeks are told apart by their first dishes.
	const subtitle = (menu: Menu) =>
		menu.weekStart
			? weekDates(menu.weekStart)
			: menu.items
					.filter((item) => item.recipeId)
					.slice(0, 3)
					.map((item) => item.text)
					.join(', ');
</script>

<svelte:head>
	<title>Veckor – Veckans mat</title>
</svelte:head>

<main>
	<div class="title">
		<h1>Veckor</h1>
		<span>{data.menus.length} veckor</span>
	</div>

	{#if data.menus.length === 0}
		<p class="empty">Inga veckor än. När ni har planerat en vecka hamnar den här.</p>
	{:else}
		<m3e-accordion>
			{#each data.menus as menu, i (menu.id)}
				<m3e-expansion-panel id="vecka-{menu.id}" open={isOpen(menu.id, i) || undefined}>
					<span slot="header" class="header">
						<span class="week">{weekName(menu.weekStart)}</span>
						<span class="sub">{subtitle(menu)}</span>
					</span>
					{#each meals as [meal, label] (meal)}
						{@const items = menu.items.filter((item) => item.meal === meal)}
						{#if items.length}
							<h2>{label}</h2>
							<ul>
								{#each items as item, j (j)}
									<li>
										<span class="day">{item.weekday ? WEEKDAYS[item.weekday - 1] : ''}</span>
										{#if item.recipeId}
											<a href={resolve('/ratter/[id]', { id: String(item.recipeId) })}
												>{item.text}</a
											>
										{:else}
											<span class="other">{item.text}</span>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					{/each}
				</m3e-expansion-panel>
			{/each}
		</m3e-accordion>
	{/if}
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem;
	}

	.title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin: 0.75rem 0.25rem 1rem;
		color: var(--md-sys-color-on-surface-variant);
		font-size: 0.875rem;
	}

	h1 {
		margin: 0;
		font-size: 2.25rem;
		line-height: 2.75rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--md-sys-color-on-surface);
	}

	.header {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.week {
		font-weight: 700;
	}

	.sub {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	h2 {
		margin: 0.5rem 0 0.125rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--md-sys-color-primary);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		min-height: 2.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.day {
		width: 2rem;
		flex-shrink: 0;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	a {
		color: inherit;
		text-decoration: none;
		flex-grow: 1;
		min-height: 2.75rem;
		display: flex;
		align-items: center;
	}

	.other {
		font-style: italic;
		color: var(--md-sys-color-on-surface-variant);
	}

	.empty {
		color: var(--md-sys-color-on-surface-variant);
	}
</style>
