<script lang="ts">
	import Icon from './Icon.svelte';
	import { chooseTheme, theme } from './theme.svelte.ts';
	import { isThemeId, THEMES, themeOf } from './themes';

	let { id }: { id: string } = $props();

	// A colour of one's own, when that is what the phone has chosen.
	let own = $derived(isThemeId(theme.choice) ? null : theme.choice);
</script>

<m3e-bottom-sheet {id} modal handle handle-label="Stäng" hideable>
	<span slot="header">Färg</span>
	<p>Gäller bara på den här telefonen.</p>
	<div class="swatches">
		{#each THEMES as t (t.id)}
			{@const on = t.id === theme.choice}
			<button type="button" aria-pressed={on} onclick={() => chooseTheme(t.id)}>
				<span class="swatch" class:on style:--swatch={t.swatch}>
					{#if on}<Icon name="check" />{/if}
				</span>
				{t.label}
			</button>
		{/each}
		<label>
			<span class="swatch" class:on={own} class:rainbow={!own} style:--swatch={own}>
				{#if own}<Icon name="check" />{/if}
			</span>
			Egen
			<input
				type="color"
				aria-label={own ? 'Egen färg, vald' : 'Egen färg'}
				value={themeOf(theme.choice).color}
				oninput={(event) => (theme.choice = event.currentTarget.value)}
				onchange={(event) => chooseTheme(event.currentTarget.value)}
			/>
		</label>
	</div>
</m3e-bottom-sheet>

<style>
	m3e-bottom-sheet {
		--m3e-bottom-sheet-container-color: var(--md-sys-color-surface-container-low);
		--m3e-bottom-sheet-header-font-weight: 700;
	}

	p {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.5rem, 1fr));
		gap: 1rem 0.5rem;
		padding-bottom: 1rem;
	}

	button,
	label {
		position: relative;
		border: 0;
		padding: 0;
		background: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		color: var(--md-sys-color-on-surface);
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1rem;
		cursor: pointer;
	}

	.swatch {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 1.75rem;
		background: var(--swatch);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		/* An edge, so that a very light colour of one's own still shows on the sheet. */
		box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
		transition: border-radius 0.2s;
	}

	.swatch :global(svg) {
		filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.6));
	}

	button:focus-visible .swatch,
	label:has(input:focus-visible) .swatch {
		outline: 2px solid var(--md-sys-color-secondary);
		outline-offset: 4px;
	}

	.swatch.on {
		border-radius: 1.125rem;
		box-shadow:
			0 0 0 3px var(--md-sys-color-surface-container-low),
			0 0 0 5px var(--swatch);
	}

	.rainbow {
		background: conic-gradient(
			#c26b4e,
			#c9a54a,
			#7d9a78,
			#6e9a8e,
			#5f7a99,
			#8a78a8,
			#b07a86,
			#c26b4e
		);
	}

	/* The phone's own colour picker opens when the swatch is tapped. */
	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
</style>
