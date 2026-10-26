<script lang="ts">
	import Icon from './Icon.svelte';

	// The arrows between this week and the next, on a view about one of them.
	let { weekStart, thisWeek, nextWeek }: { weekStart: string; thisWeek: string; nextWeek: string } =
		$props();

	let isNext = $derived(weekStart === nextWeek);
</script>

<m3e-icon-button
	href={isNext ? `?vecka=${thisWeek}` : undefined}
	disabled={!isNext || undefined}
	aria-label="Den här veckan"
>
	<Icon name="previous" />
</m3e-icon-button>
<m3e-icon-button
	href={isNext ? undefined : `?vecka=${nextWeek}`}
	disabled={isNext || undefined}
	aria-label="Nästa vecka"
>
	<Icon name="next" />
</m3e-icon-button>
