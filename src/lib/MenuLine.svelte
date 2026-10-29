<script lang="ts">
	import Icon from './Icon.svelte';
	import VoteButton from './VoteButton.svelte';
	import { offerText, type ChosenOffer } from './offers.ts';
	import { isDish, MEAL_LABELS, type Vote } from './recipes.ts';
	import { heading } from './swipe.ts';

	// A dinner or a lunch on the menu, which opens for writing when tapped. Claude's dishes have a
	// button that swaps them, and a new dish on a day that has passed one to vote on it instead.
	// A dish chosen for an offer shows its price tag instead of why, which opens the offers.
	// A finger held on a dish opens it for cooking (#137).
	let {
		name,
		lunch = false,
		text,
		meta = '',
		swapped = false,
		swappable = false,
		swapping = false,
		busy = false,
		vote = null,
		offer = null,
		onedit,
		onoffer,
		onswap,
		onvote,
		oncook
	}: {
		/** The meal and the day, as "Middag måndag". */
		name: string;
		lunch?: boolean;
		text: string;
		/** A line under the dish, such as why Claude chose it. */
		meta?: string;
		/** Just swapped, which the line shows until the snackbar is gone. */
		swapped?: boolean;
		/** Claude's dish, which can be swapped. */
		swappable?: boolean;
		swapping?: boolean;
		/** Claude is busy with the week, so a swap must wait. */
		busy?: boolean;
		onedit: () => void;
		onswap: () => void;
		vote?: Vote | null;
		/** Given when the household may vote on the dish. */
		onvote?: (vote: Vote) => void;
		/** The offer the dish was chosen for. */
		offer?: ChosenOffer | null;
		onoffer?: () => void;
		/** Given when the line is a dish that can be cooked. */
		oncook?: () => void;
	} = $props();

	/** How long a finger is held on a dish before it opens for cooking, in milliseconds. */
	const HOLD = 500;
	// Where the finger came down, while it is held.
	let from = $state<{ x: number; y: number } | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	// A hold ends with a click on the line, which must not open it for writing.
	let held = false;

	function down(event: PointerEvent) {
		const cook = oncook;
		if (!cook || event.button !== 0) return;
		held = false;
		from = { x: event.clientX, y: event.clientY };
		timer = setTimeout(() => {
			held = true;
			release();
			navigator.vibrate?.(20);
			cook();
		}, HOLD);
	}

	function release() {
		clearTimeout(timer);
		from = null;
	}

	// A line that goes while the finger is held cooks nothing.
	$effect(() => () => clearTimeout(timer));

	// A finger that moves scrolls or swipes instead.
	function move(event: PointerEvent) {
		if (from && heading(event.clientX - from.x, event.clientY - from.y)) release();
	}

	function click() {
		if (held) held = false;
		else onedit();
	}
</script>

<div class={['menu-line', lunch && 'lunch', swapped && 'swapped', from && 'holding']}>
	<div class="main">
		<button
			type="button"
			class="show"
			aria-label="{name}: {text || 'tom'}"
			onclick={click}
			onpointerdown={down}
			onpointermove={move}
			onpointerup={release}
			onpointercancel={release}
			onpointerleave={release}
			oncontextmenu={(e) => oncook && e.preventDefault()}
		>
			{#if lunch}<span class="label">{MEAL_LABELS.lunch}</span>{/if}
			<span class="text">
				<span class={['dish ink', !text && 'empty', text && !isDish(text) && 'other']}
					>{text || 'Skriv en rätt'}</span
				>
				{#if meta && !offer}<span class="reason ink">{meta}</span>{/if}
			</span>
		</button>
		{#if offer}
			<button
				type="button"
				class="offer"
				aria-label="Erbjudande: {offerText(offer)}. Visa veckans erbjudanden"
				onclick={onoffer}
			>
				<Icon name="tag" />{offerText(offer)}
			</button>
		{/if}
	</div>
	{#if onvote}
		<div class="vote"><VoteButton name={text} {vote} {onvote} /></div>
	{:else if swapping}
		<m3e-loading-indicator class="swap" aria-label="Byter {name}"></m3e-loading-indicator>
	{:else if swappable}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
		<m3e-icon-button
			class="swap"
			aria-label="Byt {name}"
			disabled={busy || undefined}
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

	.lunch {
		--menu-dish-size: 1rem;
	}

	.swapped {
		background: var(--md-sys-color-primary-container);
	}

	/* Marked while the finger is held, after a moment so that a tap does not flash. */
	.holding {
		background: var(--md-sys-color-primary-container);
		transition-delay: 120ms;
	}

	.main {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.show {
		align-self: stretch;
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
		/* A held finger opens the dish rather than selecting its text or a menu. */
		user-select: none;
		-webkit-touch-callout: none;
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

	/* The price tag, under the dish where the reason would be. */
	.offer {
		margin: -0.25rem 0 0.375rem 0.25rem;
		min-height: 2rem;
		padding: 0.25rem 0.625rem;
		border: 0;
		border-radius: 0.625rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		text-align: left;
		cursor: pointer;
	}

	.offer :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
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

	.vote {
		flex-shrink: 0;
		align-self: center;
	}

	m3e-loading-indicator.swap {
		width: 2.5rem;
		height: 2.5rem;
	}
</style>
