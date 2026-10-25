<script lang="ts">
	// The first letter of a list row's name in a shape, the shapes taking turns down the list.
	let { name, index }: { name: string; index: number } = $props();

	const SHAPES = ['round', 'square', 'leaf'];
	// It goes in the row's leading slot. Svelte takes slot="" only on an element written inside a
	// custom element, so it is passed as a plain attribute.
	const slot = { slot: 'leading' };
</script>

<span {...slot} class="initial {SHAPES[index % SHAPES.length]}" aria-hidden="true">{name[0]}</span>

<style>
	.initial {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.round {
		border-radius: 50%;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.square {
		border-radius: 0.875rem;
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.leaf {
		border-radius: 50% 50% 50% 0.75rem;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}
</style>
