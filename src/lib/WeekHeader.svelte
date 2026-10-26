<script lang="ts">
	import type { Snippet } from 'svelte';
	import WeekArrows from './WeekArrows.svelte';
	import { isoWeek } from './weeks.ts';

	// The small line at the top of a view about this week or the next: which week it is, and the
	// arrows between the two.
	let {
		weekStart,
		thisWeek,
		nextWeek,
		actions
	}: {
		weekStart: string;
		thisWeek: string;
		nextWeek: string;
		/** Buttons before the arrows. */
		actions?: Snippet;
	} = $props();
</script>

<header>
	<p class="week-label">
		Vecka {isoWeek(weekStart).week} · {weekStart === nextWeek ? 'nästa vecka' : 'den här veckan'}
	</p>
	<div class="nav">
		{@render actions?.()}
		<WeekArrows {weekStart} {thisWeek} {nextWeek} />
	</div>
</header>

<style>
	header {
		margin: 0 -0.5rem -0.75rem 0.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.week-label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--md-sys-color-primary);
	}

	.nav {
		display: flex;
	}
</style>
