<script lang="ts">
	import {
		CHAINS,
		chainLabel,
		offerKey,
		type Chain,
		type ChosenOffer,
		type ShownOffer
	} from './offers.ts';
	import { dateText } from './weeks.ts';

	// Veckans erbjudanden (#110): what can be cooked from the offers that hold today, with the
	// offers the week's dishes were chosen for first, and a filter per chain. The offers are
	// asked for each time the sheet opens, so the page loads no slower for them.
	let {
		open,
		used = [],
		onclose
	}: {
		open: boolean;
		/** The offers the week's dishes were chosen for, with the day of each. */
		used?: { offer: ChosenOffer; day: string }[];
		onclose: () => void;
	} = $props();

	let offers = $state<ShownOffer[] | null>(null);
	let failed = $state(false);
	let chain = $state<Chain | null>(null);
	// Only the latest opening's answer is shown.
	let latest = 0;

	$effect.pre(() => {
		if (!open) return;
		chain = null;
		load();
	});

	async function load() {
		const asked = ++latest;
		// What was shown before may have changed since, so it is never shown again.
		offers = null;
		failed = false;
		try {
			const response = await fetch('/installningar/erbjudanden');
			if (!response.ok) throw new Error(String(response.status));
			const answer = (await response.json()) as ShownOffer[];
			if (asked === latest) offers = answer;
		} catch {
			if (asked === latest) failed = true;
		}
	}

	let usedKeys = $derived(new Set(used.map((u) => offerKey(u.offer))));
	let others = $derived((offers ?? []).filter((o) => !usedKeys.has(offerKey(o))));
	// Each chain with offers, in the order Inställningar lists them, and how many it has.
	let all = $derived([...used.map((u) => u.offer), ...others]);
	let counts = $derived(
		CHAINS.map((c): [Chain, number] => [c.key, all.filter((o) => o.chain === c.key).length]).filter(
			([, n]) => n
		)
	);
	let total = $derived(all.length);
	let shownUsed = $derived(used.filter((u) => !chain || u.offer.chain === chain));
	let shownOthers = $derived(others.filter((o) => !chain || o.chain === chain));

	const details = (o: ChosenOffer) =>
		[chainLabel(o.chain), o.member && 'medlemspris', `t.o.m. ${dateText(o.validTo)}`]
			.filter(Boolean)
			.join(' · ');
</script>

{#snippet line(offer: ChosenOffer, side: string, isDay: boolean)}
	<li>
		<span class="name">{offer.name}</span>
		<span class="price">{offer.price}</span>
		<span class="meta">{details(offer)}</span>
		<span class={['side', isDay && 'day']}>{side}</span>
	</li>
{/snippet}

<!-- detents is a list: a text would be read letter by letter once m3e has loaded (#116). -->
<m3e-bottom-sheet
	modal
	handle
	handle-label="Stäng"
	hideable
	detents={['full']}
	open={open || undefined}
	onclosed={onclose}
>
	<span slot="header">Veckans erbjudanden</span>
	{#if open}
		<div class="body">
			<p class="supporting">Matvaror att laga middag av, som gäller i dag.</p>
			{#if failed}
				<p class="error-text" role="alert">Kunde inte visa erbjudandena.</p>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button class="retry" variant="text" onclick={load}>Försök igen</m3e-button>
			{:else if !offers}
				<m3e-loading-indicator aria-label="Hämtar erbjudanden"></m3e-loading-indicator>
			{:else if !total}
				<p>
					Inga erbjudanden just nu. Slå på kedjorna ni handlar hos under Inställningar, så hämtas de
					varje måndag.
				</p>
			{:else}
				{#if counts.length > 1}
					<div class="chains" role="group" aria-label="Kedja">
						<m3e-filter-chip
							selected={!chain || undefined}
							onchange={(e: Event & { currentTarget: HTMLElement & { selected: boolean } }) => {
								// All stays chosen until a chain is: tapping it again changes nothing.
								chain = null;
								e.currentTarget.selected = true;
							}}>Alla {total}</m3e-filter-chip
						>
						{#each counts as [key, n] (key)}
							<m3e-filter-chip
								selected={chain === key || undefined}
								onchange={(e: Event & { currentTarget: HTMLElement & { selected: boolean } }) =>
									(chain = e.currentTarget.selected ? key : null)}
								>{chainLabel(key)} {n}</m3e-filter-chip
							>
						{/each}
					</div>
				{/if}
				{#if shownUsed.length}
					<h3 class="used">I veckans meny</h3>
					<ul>
						{#each shownUsed as u, i (i)}
							{@render line(u.offer, u.day, true)}
						{/each}
					</ul>
				{/if}
				{#if shownOthers.length}
					{#if shownUsed.length}<h3>Övriga</h3>{/if}
					<ul>
						<!-- A chain can have the same name twice, in two sizes, so they are not keyed. -->
						{#each shownOthers as o, i (i)}
							{@render line(o, o.comparePrice, false)}
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	{/if}
</m3e-bottom-sheet>

<style>
	m3e-bottom-sheet {
		text-align: start;
		--m3e-bottom-sheet-container-color: var(--md-sys-color-surface-container-low);
		--m3e-bottom-sheet-header-font-weight: 700;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 1rem;
	}

	p {
		margin: 0;
	}

	.supporting {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.retry {
		align-self: flex-start;
	}

	.chains {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
	}

	h3 {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--md-sys-color-on-surface-variant);
	}

	h3.used {
		color: var(--md-sys-color-primary);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		padding: 0.75rem 0.25rem;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.125rem 0.75rem;
	}

	li + li {
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.price {
		font-weight: 500;
		text-align: right;
	}

	.meta,
	.side {
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.side {
		text-align: right;
	}

	.side.day {
		font-weight: 500;
		color: var(--md-sys-color-primary);
	}
</style>
