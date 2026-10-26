<script lang="ts">
	import Icon from './Icon.svelte';

	// An item on the shopping list: tick it off, see which dishes it is for, or swipe it away to
	// the left.
	let {
		text,
		amount,
		dishes,
		checked,
		oncheck,
		onremove
	}: {
		text: string;
		amount: string | null;
		/** The dishes it is for, as one line, or empty. */
		dishes: string;
		checked: boolean;
		oncheck: (checked: boolean) => void;
		onremove: () => void;
	} = $props();

	const id = $props.id();

	// How far the row is pulled to the left, in pixels.
	let shift = $state(0);
	let row: HTMLElement | undefined = $state();
	let start: { x: number; y: number } | null = null;
	let swiping = $state(false);
	// A swipe ends with a click on the row, which must not tick it.
	let swiped = false;

	function down(event: PointerEvent) {
		if (event.button !== 0) return;
		swiped = false;
		start = { x: event.clientX, y: event.clientY };
	}

	function move(event: PointerEvent) {
		if (!start || !row) return;
		const dx = event.clientX - start.x;
		const dy = event.clientY - start.y;
		if (!swiping) {
			// Sideways to the left, rather than a scroll or a tap.
			if (dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
				swiping = true;
				row.setPointerCapture(event.pointerId);
			} else if (Math.abs(dy) > 10) start = null;
			return;
		}
		shift = Math.min(0, dx);
	}

	function up() {
		if (swiping && row) {
			swiped = true;
			if (-shift > row.offsetWidth / 2) {
				shift = -row.offsetWidth;
				onremove();
			} else shift = 0;
		}
		start = null;
		swiping = false;
	}

	function cancel() {
		start = null;
		swiping = false;
		shift = 0;
	}

	function click(event: MouseEvent) {
		if (!swiped) return;
		swiped = false;
		event.preventDefault();
		event.stopPropagation();
	}

	// The popup with the dishes opens under its button, in the top layer.
	let info: HTMLElement | undefined = $state();
	let infoButton: HTMLElement | undefined = $state();
	function place(event: ToggleEvent) {
		if (event.newState !== 'open' || !info || !infoButton) return;
		const rect = infoButton.getBoundingClientRect();
		info.style.top = `${rect.bottom + 4}px`;
		info.style.right = `${document.documentElement.clientWidth - rect.right}px`;
	}

	function remove() {
		info?.hidePopover();
		onremove();
	}
</script>

<li class="row" class:checked>
	{#if shift < 0}
		<div class="behind" aria-hidden="true"><Icon name="delete" />Ta bort</div>
	{/if}
	<div
		bind:this={row}
		class="front"
		class:swiping
		style:transform={shift ? `translateX(${shift}px)` : undefined}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={cancel}
		onclickcapture={click}
		role="presentation"
	>
		<!-- svelte-ignore a11y_label_has_associated_control (m3e-checkbox is the control; a tap anywhere on the row ticks it) -->
		<label>
			<m3e-checkbox
				aria-label={text}
				checked={checked || undefined}
				onchange={(e: Event & { currentTarget: HTMLElement & { checked: boolean } }) =>
					oncheck(e.currentTarget.checked)}
			></m3e-checkbox>
			<span class="text">{text}</span>
		</label>
		{#if dishes}
			<button
				bind:this={infoButton}
				type="button"
				class="info"
				aria-label="Till vilka rätter: {text}"
				popovertarget="{id}-info"
			>
				<Icon name="info" />
			</button>
			<div bind:this={info} id="{id}-info" class="popup" popover="auto" ontoggle={place}>
				<strong>Till</strong>
				<span>{dishes}</span>
				<button type="button" class="remove" aria-label="Ta bort {text}" onclick={remove}>
					<Icon name="delete" />Ta bort
				</button>
			</div>
		{:else}
			<!-- Swiping is not for everyone, so the row can be removed with a button too. -->
			<button type="button" class="remove hidden" onclick={onremove}>Ta bort {text}</button>
			<span class="spacer"></span>
		{/if}
		{#if amount}<span class="amount">{amount}</span>{/if}
	</div>
</li>

<style>
	.row {
		position: relative;
		overflow: hidden;
	}

	.behind {
		position: absolute;
		inset: 0;
		padding-right: 1.25rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.behind :global(svg) {
		width: 1.25rem;
	}

	.front {
		position: relative;
		min-height: 2.875rem;
		padding: 0 0.75rem 0 0.375rem;
		background: var(--app-card);
		display: flex;
		align-items: center;
		/* Up and down still scroll the page; sideways is the row's own. */
		touch-action: pan-y;
		transition: transform 200ms;
	}

	.front.swiping {
		transition: none;
	}

	label {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.125rem;
		cursor: pointer;
	}

	.text {
		flex: 1;
		min-width: 0;
		font-size: 1rem;
		line-height: 1.375rem;
	}

	.checked .text,
	.checked .amount {
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: line-through;
	}

	.info {
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--md-sys-color-on-surface-variant);
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	.info :global(svg) {
		width: 1.125rem;
	}

	.info:focus-visible {
		outline: 2px solid var(--md-sys-color-primary);
	}

	.popup {
		position: fixed;
		inset: auto;
		max-width: 15rem;
		margin: 0;
		padding: 0.625rem 0.875rem;
		border: 0;
		border-radius: 0.75rem;
		background: var(--md-sys-color-inverse-surface);
		color: var(--md-sys-color-inverse-on-surface);
		box-shadow: 0 6px 18px rgb(40 20 10 / 0.25);
		font-size: 0.8125rem;
		line-height: 1.45;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
	}

	.popup:popover-open {
		display: flex;
	}

	.popup strong {
		font-size: 0.6875rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.8;
	}

	.popup .remove {
		margin: 0.375rem 0 0 -0.25rem;
		padding: 0.25rem;
		border: 0;
		background: transparent;
		color: var(--md-sys-color-inverse-primary);
		font: inherit;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
	}

	.popup .remove :global(svg) {
		width: 1rem;
	}

	/* Out of sight until it has the focus, as from the keyboard or a screen reader. */
	.remove.hidden {
		position: absolute;
		right: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 0;
		border-radius: 1rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		font: inherit;
		font-size: 0.875rem;
		clip-path: inset(50%);
	}

	.remove.hidden:focus {
		clip-path: none;
	}

	.spacer {
		width: 2.5rem;
		flex-shrink: 0;
	}

	.amount {
		min-width: 4rem;
		padding-left: 0.5rem;
		text-align: right;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
