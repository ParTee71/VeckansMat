<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// The heading of a view about this week or the next, with arrows between the two.
	let {
		title,
		subtitle,
		weekStart,
		thisWeek,
		nextWeek,
		actions
	}: {
		title: string;
		subtitle: string;
		weekStart: string;
		thisWeek: string;
		nextWeek: string;
		/** Buttons before the arrows. */
		actions?: Snippet;
	} = $props();

	let isNext = $derived(weekStart === nextWeek);
</script>

<div class="title">
	<div>
		<h1>{title}</h1>
		<p class="subtitle">{subtitle}</p>
	</div>
	<div class="nav">
		{@render actions?.()}
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
	</div>
</div>

<style>
	.title {
		margin: 0.25rem 0 0 0.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h1 {
		margin: 0;
		font-size: 2.25rem;
		line-height: 2.75rem;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.nav {
		display: flex;
	}
</style>
