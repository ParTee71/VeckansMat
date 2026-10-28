<script lang="ts">
	import Icon from './Icon.svelte';
	import { chainLabel, type Chain, type StoreChoice } from './offers.ts';

	// Finds a chain's store by town or name, through the app's server, and chooses it.
	let {
		chain,
		open,
		chosen,
		onpick,
		onclose
	}: {
		/** The chain whose stores are searched, until the sheet has closed. */
		chain: Chain | null;
		open: boolean;
		/** The store chosen now, shown as chosen when it is found. */
		chosen: string | null;
		onpick: (store: StoreChoice) => void;
		onclose: () => void;
	} = $props();

	let query = $state('');
	let stores = $state<StoreChoice[] | null>(null);
	let searching = $state(false);
	let failed = $state<string | null>(null);
	// Asks once the typing stops, so the chain is asked once per search and not per letter.
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Only the latest search's answer is shown.
	let latest = 0;

	// Each opening starts with an empty search, and a search from before is let go.
	$effect.pre(() => {
		if (!open) return;
		clearTimeout(timer);
		latest++;
		query = '';
		stores = null;
		failed = null;
		searching = false;
	});
	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(search, 700);
	}

	async function search() {
		clearTimeout(timer);
		const text = query.trim();
		if (!chain || text.length < 2) return;
		const asked = ++latest;
		searching = true;
		failed = null;
		try {
			const response = await fetch(
				`/installningar/butiker?kedja=${chain}&q=${encodeURIComponent(text)}`
			);
			// An error page that is not JSON reads as no answer.
			const answer = (await response.json().catch(() => null)) as
				StoreChoice[] | { error?: string } | null;
			if (asked !== latest) return;
			if (Array.isArray(answer)) stores = answer;
			else failed = answer?.error ?? `Kunde inte söka hos ${chainLabel(chain)}. Försök igen.`;
		} catch {
			if (asked === latest) failed = 'Kunde inte söka. Är telefonen uppkopplad?';
		}
		if (asked === latest) searching = false;
	}
</script>

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
	<span slot="header">{chain ? `Välj ${chainLabel(chain)}-butik` : ''}</span>
	{#if chain}
		<div class="body">
			<m3e-search-bar clearable clear-label="Rensa">
				<span slot="leading" class="slot-icon"><Icon name="search" /></span>
				<input
					slot="input"
					type="search"
					autocomplete="off"
					enterkeyhint="search"
					placeholder="Sök på ort eller butik"
					aria-label="Sök på ort eller butik"
					bind:value={query}
					{oninput}
					onkeydown={(e) => e.key === 'Enter' && search()}
				/>
			</m3e-search-bar>
			{#if searching}
				<m3e-loading-indicator aria-label="Söker"></m3e-loading-indicator>
			{:else if failed}
				<p class="error-text" role="alert">{failed}</p>
			{:else if stores?.length === 0}
				<p>Inga butiker hittades. Sök på orten där butiken ligger.</p>
			{/if}
			{#if stores && !searching}
				<ul>
					{#each stores as store (store.id)}
						<li>
							<button
								type="button"
								aria-pressed={store.id === chosen}
								onclick={() => onpick(store)}
							>
								<span class="dot" aria-hidden="true"></span>
								<span class="text">
									<span>{store.name}</span>
									{#if store.place}<span class="place">{store.place}</span>{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			<p>Butiken sparas bara här i appen. Erbjudandena hämtas direkt när du valt.</p>
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

	m3e-loading-indicator {
		align-self: center;
	}

	p {
		margin: 0 0.25rem;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	button {
		width: 100%;
		min-height: 4rem;
		padding: 0.5rem;
		border: 0;
		border-radius: 1rem;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 0.875rem;
		cursor: pointer;
	}

	button[aria-pressed='true'] {
		background: var(--md-sys-color-secondary-container);
	}

	.dot {
		flex: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		border: 2px solid var(--md-sys-color-on-surface-variant);
		box-sizing: border-box;
	}

	[aria-pressed='true'] .dot {
		border-color: var(--md-sys-color-primary);
		background: radial-gradient(var(--md-sys-color-primary) 45%, transparent 50%);
	}

	.text {
		display: flex;
		flex-direction: column;
	}

	.place {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}
</style>
