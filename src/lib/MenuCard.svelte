<script lang="ts">
	import type { Snippet } from 'svelte';
	import caveat from './assets/fonts/caveat-700.woff2';
	import kalam from './assets/fonts/kalam-400.woff2';

	// The week as a menu written on paper (#89): the heading, who eats, and the days as children.
	// In light mode it is a sheet of paper with a fine texture, and the text looks printed into
	// it; in dark mode it is a plain card. The handwriting is only used here (ADR 0019).
	let { dates, eaters, children }: { dates: string; eaters: Snippet; children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="preload" href={caveat} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" href={kalam} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<article class="menu">
	<!-- Uneven edges and ink that takes a little differently, applied to the text marked .ink. -->
	<svg width="0" height="0" aria-hidden="true">
		<filter id="ink" x="-2%" y="-10%" width="104%" height="120%">
			<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" />
			<feDisplacementMap
				in="SourceGraphic"
				in2="n"
				scale="1.4"
				xChannelSelector="R"
				yChannelSelector="G"
				result="d"
			/>
			<feColorMatrix
				in="n"
				type="matrix"
				values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.0 1.9"
				result="mask"
			/>
			<feComposite in="d" in2="mask" operator="in" />
		</filter>
	</svg>
	<div class="head">
		<h1 class="ink">Veckans meny</h1>
		<p class="dates ink">{dates}</p>
		<div class="ornament" aria-hidden="true"><span></span><span></span><span></span></div>
		{@render eaters()}
	</div>
	{@render children()}
</article>

<style>
	@font-face {
		font-family: 'Caveat';
		src: url('./assets/fonts/caveat-700.woff2') format('woff2');
		font-weight: 700;
		font-display: swap;
	}

	@font-face {
		font-family: 'Kalam';
		src: url('./assets/fonts/kalam-400.woff2') format('woff2');
		font-weight: 400;
		font-display: swap;
	}

	.menu {
		--menu-hand: Caveat, cursive;
		--menu-script: Kalam, cursive;
		--menu-paper: #fefdfb;
		--menu-rule: color-mix(in srgb, var(--md-sys-color-primary) 10%, #d9d0c9);
		--menu-chip: var(--app-fill);
		--menu-empty: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, var(--menu-paper));
		/* A dish, shown or written, has the same size and place, so the line does not jump. */
		--menu-dish-size: 1.1875rem;
		--menu-line-padding: 0.5rem 0.25rem;

		position: relative;
		margin: 0 0.125rem;
		padding: 1.625rem 1.375rem 1.5rem;
		border-radius: 0.375rem;
		background: var(--menu-paper) url('./assets/papper.webp') 0 0 / 16rem 16rem;
		background-blend-mode: multiply;
		box-shadow:
			0 2px 4px rgb(60 30 15 / 0.1),
			0 14px 28px -6px rgb(60 30 15 / 0.22),
			0 28px 60px -12px rgb(60 30 15 / 0.18);
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.menu :global(.lunch) {
		--menu-dish-size: 1rem;
	}

	@media (prefers-color-scheme: light) {
		.menu :global(.ink) {
			filter: url(#ink);
		}
	}

	@media (prefers-color-scheme: dark) {
		.menu {
			--menu-paper: var(--md-sys-color-surface-container-low);
			--menu-rule: color-mix(in srgb, var(--md-sys-color-primary) 8%, #463f3b);
			border: 1px solid #3a3330;
			border-radius: 1.25rem;
			background: var(--menu-paper);
			box-shadow: none;
		}
	}

	svg {
		position: absolute;
	}

	.head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		text-align: center;
	}

	h1 {
		margin: 0;
		font-family: var(--menu-hand);
		font-weight: 700;
		font-size: 2.875rem;
		line-height: 1.05;
	}

	.dates {
		margin: 0;
		font-family: var(--menu-script);
		font-size: 0.9375rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.ornament {
		width: 8.75rem;
		margin: 0.375rem 0 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.ornament span {
		flex: 1;
		height: 1px;
		background: var(--menu-rule);
	}

	.ornament span:nth-child(2) {
		flex: none;
		width: 6px;
		height: 6px;
		transform: rotate(45deg);
		background: var(--md-sys-color-primary);
	}
</style>
