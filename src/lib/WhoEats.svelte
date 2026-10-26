<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import { listText } from './names.ts';

	// Who eats the week, as a line on the menu that opens a sheet: a chip for each person, what
	// they do not eat and the household's rules for every week.
	let {
		people,
		eaterIds,
		rules,
		ontoggle
	}: {
		people: { id: number; name: string; requirements: string }[];
		eaterIds: number[];
		rules: string;
		ontoggle: (id: number, selected: boolean) => void;
	} = $props();

	let eaters = $derived(people.filter((p) => eaterIds.includes(p.id)));
	let line = $derived(
		eaters.length
			? `${listText(eaters.map((p) => p.name))} äter`
			: people.length
				? 'Välj vilka som äter'
				: 'Lägg till vilka som äter'
	);
</script>

<button type="button" class="line">
	<m3e-bottom-sheet-trigger for="who-eats">
		<Icon name="people" />{line}
	</m3e-bottom-sheet-trigger>
</button>

<m3e-bottom-sheet id="who-eats" modal handle handle-label="Stäng" hideable>
	<span slot="header">Vilka äter?</span>
	<div class="body">
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
	</div>
</m3e-bottom-sheet>

<style>
	.line {
		position: relative;
		align-self: center;
		min-height: 2.25rem;
		padding: 0 0.75rem;
		border: 0;
		border-radius: 1.125rem;
		background: var(--menu-chip);
		color: var(--md-sys-color-on-surface-variant);
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	/* A taller place to tap than the line looks. */
	.line::after {
		content: '';
		position: absolute;
		inset: -0.375rem 0;
	}

	m3e-bottom-sheet-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.line :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	/* The sheet sits in the menu's centred heading, but reads from the left. */
	m3e-bottom-sheet {
		text-align: start;
		--m3e-bottom-sheet-container-color: var(--md-sys-color-surface-container-low);
		--m3e-bottom-sheet-header-font-weight: 700;
	}

	.body {
		padding-bottom: 1rem;
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
