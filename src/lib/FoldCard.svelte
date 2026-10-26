<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// A white card whose content folds away under its heading, with a count and a short note.
	let {
		title,
		count,
		note,
		open = $bindable(true),
		children
	}: {
		title: string;
		count?: number;
		note?: string;
		open?: boolean;
		children: Snippet;
	} = $props();

	const id = $props.id();
</script>

<section class="card">
	<h2>
		<button type="button" aria-expanded={open} aria-controls={id} onclick={() => (open = !open)}>
			<span class="title">{title}</span>
			{#if note}<span class="note">{note}</span>{/if}
			{#if count !== undefined}<span class="count">{count}</span>{/if}
			<span class="chevron" class:open><Icon name="expand" /></span>
		</button>
	</h2>
	<div {id} hidden={!open}>
		{@render children()}
	</div>
</section>

<style>
	/* Rows inside, such as an m3e list, are clipped to the round corners. */
	.card {
		padding: 0.25rem 0;
		gap: 0;
		overflow: hidden;
	}

	h2 {
		font-size: 0.875rem;
	}

	button {
		width: 100%;
		min-height: 3rem;
		padding: 0.25rem 0.75rem 0.25rem 1.125rem;
		border: 0;
		border-radius: 1.5rem;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: -2px;
	}

	.title {
		flex: 1;
	}

	.note {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant);
	}

	.count {
		min-width: 1.5rem;
		height: 1.5rem;
		padding: 0 0.5rem;
		box-sizing: border-box;
		border-radius: 0.75rem;
		background: var(--app-fill);
		color: var(--md-sys-color-on-surface-variant);
		font-size: 0.75rem;
		font-weight: 500;
		display: grid;
		place-items: center;
	}

	.chevron {
		display: flex;
		color: var(--md-sys-color-on-surface-variant);
		transition: transform 200ms;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.chevron :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
