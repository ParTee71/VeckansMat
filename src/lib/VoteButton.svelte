<script lang="ts">
	import Icon from './Icon.svelte';
	import { nextVote, VOTES, type Vote } from './recipes.ts';

	// One button for what the household thinks of a dish (#99): a tap gives the next vote, round
	// from thumb up to thumb down. The same quiet tone in every state, so that only the thumb
	// shows the vote and thumb up never looks like a warning.
	let {
		name,
		vote,
		onvote
	}: {
		/** The dish, for screen readers. */
		name: string;
		vote: Vote | null;
		onvote: (vote: Vote) => void;
	} = $props();

	let label = $derived(VOTES.find((v) => v.key === vote)?.label ?? 'Hur var den?');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
<m3e-button
	class={['vote', vote ?? 'none']}
	variant="tonal"
	aria-label="Röst på {name}: {label}. Tryck för att ändra."
	onclick={() => onvote(nextVote(vote))}
>
	<span slot="icon" class="slot-icon thumb"><Icon name="thumbUp" /></span>{label}
</m3e-button>

<style>
	.vote {
		--md-sys-color-secondary-container: var(--md-sys-color-surface-container-highest);
		--md-sys-color-on-secondary-container: var(--md-sys-color-on-surface);
		flex-shrink: 0;
	}

	.none {
		--md-sys-color-on-secondary-container: var(--md-sys-color-on-surface-variant);
	}

	.thumb :global(svg) {
		transition: transform 0.25s;
	}

	.ok .thumb :global(svg) {
		transform: rotate(-90deg);
	}

	.aldrig .thumb :global(svg) {
		transform: scaleY(-1);
	}
</style>
