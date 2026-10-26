<script lang="ts">
	import Icon from './Icon.svelte';
	import { isDish } from './recipes.ts';

	// A dinner or a lunch on the menu, which opens for writing when tapped. Claude's dishes have a
	// button that swaps them.
	let {
		name,
		label = '',
		text,
		meta = '',
		swapped = false,
		swap,
		onedit,
		onswap
	}: {
		/** The meal and the day, as "Middag måndag". */
		name: string;
		/** What stands before the dish, as "Lunch". */
		label?: string;
		text: string;
		/** A line under the dish, such as why Claude chose it. */
		meta?: string;
		/** Just swapped, which the line shows until the snackbar is gone. */
		swapped?: boolean;
		/** Whether the dish can be swapped, and whether that is going on or must wait. */
		swap?: 'ready' | 'busy' | 'swapping';
		onedit: () => void;
		onswap: () => void;
	} = $props();
</script>

<div class={['menu-line', label && 'lunch', swapped && 'swapped']}>
	<button type="button" class="show" aria-label="{name}: {text || 'tom'}" onclick={onedit}>
		{#if label}<span class="label">{label}</span>{/if}
		<span class="text">
			<span class={['dish ink', !text && 'empty', text && !isDish(text) && 'other']}
				>{text || 'Skriv en rätt'}</span
			>
			{#if meta}<span class="reason ink">{meta}</span>{/if}
		</span>
	</button>
	{#if swap === 'swapping'}
		<m3e-loading-indicator class="swap" aria-label="Byter {name}"></m3e-loading-indicator>
	{:else if swap}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
		<m3e-icon-button
			class="swap"
			aria-label="Byt {name}"
			disabled={swap === 'busy' || undefined}
			onclick={onswap}
		>
			<Icon name="swap" />
		</m3e-icon-button>
	{/if}
</div>

<style>
	.menu-line {
		border-radius: 0.5rem;
		display: flex;
		align-items: flex-start;
		transition: background-color 0.3s;
	}

	.swapped {
		background: var(--md-sys-color-primary-container);
	}

	.show {
		flex-grow: 1;
		min-width: 0;
		min-height: 2.75rem;
		padding: var(--menu-line-padding);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		cursor: pointer;
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.dish {
		font-family: var(--menu-script);
		font-size: var(--menu-dish-size);
		line-height: 1.3;
	}

	.empty {
		color: var(--menu-empty);
		font-style: italic;
	}

	.other {
		font-style: italic;
	}

	.reason {
		font-family: var(--menu-script);
		font-size: 0.8125rem;
		line-height: 1.3;
		color: var(--md-sys-color-on-surface-variant);
	}

	.label {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.swap {
		flex-shrink: 0;
		margin-top: 0.125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	m3e-loading-indicator.swap {
		width: 2.5rem;
		height: 2.5rem;
	}
</style>
