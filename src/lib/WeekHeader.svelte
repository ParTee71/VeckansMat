<script lang="ts">
	import type { Snippet } from 'svelte';
	import AccountButton from './AccountButton.svelte';
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

<header class="view-top">
	<p class="view-label week-label">
		Vecka {isoWeek(weekStart).week} · {weekStart === nextWeek ? 'nästa vecka' : 'den här veckan'}
	</p>
	<div class="nav">
		{@render actions?.()}
		<WeekArrows {weekStart} {thisWeek} {nextWeek} />
		<AccountButton />
	</div>
</header>

<style>
	.nav {
		display: flex;
		align-items: center;
	}
</style>
