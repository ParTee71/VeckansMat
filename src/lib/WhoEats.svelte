<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';

	// Who eats the week, a chip each, with what they do not eat and the household's rules for
	// every week. What else is asked about the week comes last, as children.
	let {
		people,
		eaterIds,
		rules,
		ontoggle,
		children
	}: {
		people: { id: number; name: string; requirements: string }[];
		eaterIds: number[];
		rules: string;
		ontoggle: (id: number, selected: boolean) => void;
		children?: Snippet;
	} = $props();

	let eaters = $derived(people.filter((p) => eaterIds.includes(p.id)));
</script>

<section>
	<h2>Vilka äter?</h2>
	{#if people.length === 0}
		<p class="hint">Lägg till de som brukar äta, med det de inte äter.</p>
	{:else}
		<div class="choices">
			{#each people as person (person.id)}
				<m3e-filter-chip
					selected={eaterIds.includes(person.id) || undefined}
					onchange={(e: Event & { currentTarget: HTMLElement & { selected: boolean } }) =>
						ontoggle(person.id, e.currentTarget.selected)}>{person.name}</m3e-filter-chip
				>
			{/each}
		</div>
		{#each eaters.filter((p) => p.requirements) as person (person.id)}
			<p class="hint">{person.name}: {person.requirements.replace(/\n+/g, ', ')}</p>
		{/each}
	{/if}
	{#if rules}
		<p class="hint">{rules.replace(/\n+/g, ' ')}</p>
	{/if}
	<a href={resolve('/hushallet')}>Ändra personer och regler</a>
	{@render children?.()}
</section>

<style>
	section {
		padding: 1rem;
		border-radius: 1.75rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	a {
		align-self: flex-start;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--md-sys-color-primary);
	}
</style>
