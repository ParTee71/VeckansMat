<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import Initial from '#lib/Initial.svelte';
	import OffersSheet from '#lib/OffersSheet.svelte';
	import StorePicker from '#lib/StorePicker.svelte';
	import ThemePicker from '#lib/ThemePicker.svelte';
	import { postAction } from '#lib/actions.ts';
	import { LUNCHBOX_EXTRA_CHOICES, MAX_NEW_DISHES, MAX_REPEAT_WEEKS } from '#lib/household.ts';
	import {
		chainLabel,
		fetchedText,
		hasStores,
		type Chain,
		type ChainState,
		type StoreChoice
	} from '#lib/offers.ts';
	import { weeksText } from '#lib/weeks.ts';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	// Shown at once when tapped, and saved right after.
	let newDishes = $derived(data.settings.newDishesPerWeek);
	let lunchboxExtra = $derived(data.settings.lunchboxExtraPortions);
	let repeatWeeks = $derived(data.settings.repeatWeeks);
	let favouriteRepeatWeeks = $derived(data.settings.favouriteRepeatWeeks);

	let settingsForm: HTMLFormElement;
	let changed: string[] = [];

	// Only the fields that changed are sent, so two quick saves never undo each other. The page
	// keeps what is shown, without loading again, so nothing on it moves.
	const sendChanged: SubmitFunction = ({ formData }) => {
		for (const key of [...formData.keys()]) if (!changed.includes(key)) formData.delete(key);
		// Two taps in the same moment are sent together, with what each changed.
		changed = [];
		return async ({ update }) => update({ reset: false, invalidateAll: false });
	};

	async function save(...fields: string[]) {
		changed = [...changed, ...fields];
		await tick();
		settingsForm.requestSubmit();
	}

	// The chains change at once when tapped. Fetching their offers takes a few seconds, shown
	// on the chain, and the chain's row is then replaced with what the server answers.
	let chains = $derived(data.chains);
	let memberPrices = $derived(data.settings.memberPrices);
	let fetching = $state<Chain[]>([]);
	let showingOffers = $state(false);
	let picking = $state<Chain | null>(null);
	let pickerOpen = $state(false);
	let chainError = $state<string | null>(null);

	let shown = $derived(chains.filter((c) => c.enabled && c.fetchedAt));
	let latest = $derived(
		shown
			.map((c) => c.fetchedAt!)
			.sort()
			.at(-1)
	);
	let offerCount = $derived(shown.reduce((sum, c) => sum + c.offers, 0));

	function update(chain: Chain, change: Partial<ChainState>) {
		chains = chains.map((c) => (c.chain === chain ? { ...c, ...change } : c));
	}

	// Each chain's latest change, so an answer to an earlier one never overwrites it.
	const sent: Partial<Record<Chain, number>> = {};

	/** Saves a change to the chain, or puts back how it was when the save fails. */
	async function send(
		before: ChainState,
		action: 'chain' | 'store',
		fields: Record<string, string>
	) {
		const { chain } = before;
		const id = (sent[chain] = (sent[chain] ?? 0) + 1);
		fetching = [...fetching, chain];
		const result = await postAction(action, { chain, ...fields });
		if (sent[chain] !== id) return;
		fetching = fetching.filter((c) => c !== chain);
		if (result?.type === 'success' && result.data?.chain) {
			update(chain, result.data.chain as ChainState);
			chainError = null;
		} else {
			update(chain, before);
			chainError = 'Det gick inte att spara. Försök igen.';
		}
	}

	function toggle(chain: ChainState, enabled: boolean) {
		update(chain.chain, { enabled });
		// A chain without a store is saved when the store is chosen.
		if (enabled && hasStores(chain.chain) && !chain.storeId) choose(chain.chain);
		else send(chain, 'chain', { enabled: String(enabled) });
	}

	function choose(chain: Chain) {
		picking = chain;
		pickerOpen = true;
	}

	function pick(store: StoreChoice) {
		const before = chains.find((c) => c.chain === picking)!;
		pickerOpen = false;
		update(before.chain, { enabled: true, storeId: store.id, storeName: store.name, error: null });
		send(before, 'store', { id: store.id, name: store.name });
	}

	/** Closed without a store, a chain that had none is off again, as it is saved. */
	function closePicker() {
		const chain = chains.find((c) => c.chain === picking);
		if (chain && !chain.storeId) update(chain.chain, { enabled: false });
		pickerOpen = false;
		picking = null;
	}

	async function toggleMemberPrices(on: boolean) {
		memberPrices = on;
		const result = await postAction('settings', { memberPrices: String(on) });
		if (result?.type === 'success') chainError = null;
		else {
			memberPrices = !on;
			chainError = 'Det gick inte att spara. Försök igen.';
		}
	}
</script>

<svelte:head>
	<title>Inställningar – Veckans mat</title>
</svelte:head>

<header>
	<m3e-icon-button variant="tonal" href="/" aria-label="Tillbaka">
		<Icon name="back" />
	</m3e-icon-button>
	<h1>Inställningar</h1>
</header>

<main>
	{#if data.account}
		{@const { name, email, picture } = data.account}
		<section class="account" aria-label="Konto">
			{#if picture}
				<img src="/konto/bild?v={encodeURIComponent(picture)}" alt="" />
			{:else}
				<span class="letter" aria-hidden="true">{(name || email).charAt(0).toUpperCase()}</span>
			{/if}
			{#if name}<strong>{name}</strong>{/if}
			<span class="supporting">{email}</span>
			<span class="supporting">Inloggad med Google</span>
			<!-- A plain link, since Access logs out and the app is left in full. -->
			<a class="logout" href="/cdn-cgi/access/logout" data-sveltekit-reload>Logga ut</a>
		</section>
	{/if}

	<h2>Personer</h2>
	{#if data.people.length === 0}
		<p class="note">Inga personer än. Lägg till de som brukar äta, med det de inte äter.</p>
	{:else}
		<m3e-list variant="segmented">
			{#each data.people as person, i (person.id)}
				<m3e-list-action href="/installningar/{person.id}">
					<Initial name={person.name} index={i} />
					{person.name}
					<span slot="supporting-text">{person.requirements.split('\n')[0] || 'Inga krav'}</span>
				</m3e-list-action>
			{/each}
		</m3e-list>
	{/if}
	<m3e-button variant="tonal" href="/installningar/ny" class="add">
		<span slot="icon" class="slot-icon"><Icon name="add" /></span>Lägg till person
	</m3e-button>

	<h2>Regler för varje vecka</h2>
	<form method="POST" action="?/settings" use:enhance={sendChanged} bind:this={settingsForm}>
		<m3e-form-field variant="filled">
			<label slot="label" for="menuRules">Skriv som till en person, en regel per rad</label>
			<textarea
				id="menuRules"
				name="menuRules"
				rows="4"
				value={data.settings.menuRules}
				onchange={() => save('menuRules')}></textarea>
			<m3e-textarea-autosize for="menuRules"></m3e-textarea-autosize>
		</m3e-form-field>

		{#snippet stepper(
			id: string,
			value: number,
			min: number,
			max: number,
			fewer: string,
			more: string,
			set: (n: number) => void
		)}
			<div class="stepper">
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					variant="tonal"
					aria-label={fewer}
					disabled={value <= min || undefined}
					onclick={() => set(value - 1)}><Icon name="remove" /></m3e-icon-button
				>
				<output aria-labelledby={id}>{value}</output>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					variant="tonal"
					aria-label={more}
					disabled={value >= max || undefined}
					onclick={() => set(value + 1)}><Icon name="add" /></m3e-icon-button
				>
			</div>
		{/snippet}

		<div class="setting">
			<span id="new-dishes">Nya rätter per vecka</span>
			{@render stepper(
				'new-dishes',
				newDishes,
				0,
				MAX_NEW_DISHES,
				'Färre nya rätter',
				'Fler nya rätter',
				(n) => {
					newDishes = n;
					save('newDishesPerWeek');
				}
			)}
			<input type="hidden" name="newDishesPerWeek" value={newDishes} />
		</div>

		<div class="setting">
			<span>Extra portioner till matlådor</span>
			<m3e-button-group variant="connected">
				{#each LUNCHBOX_EXTRA_CHOICES as n (n)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
					<m3e-button
						variant={lunchboxExtra === n ? 'filled' : 'tonal'}
						aria-label={n === 1 ? '1 extra portion' : `${n} extra portioner`}
						onclick={() => {
							lunchboxExtra = n;
							save('lunchboxExtraPortions');
						}}>{n}</m3e-button
					>
				{/each}
			</m3e-button-group>
			<input type="hidden" name="lunchboxExtraPortions" value={lunchboxExtra} />
		</div>

		<h2>Hur ofta samma rätt</h2>
		<div class="setting">
			<span id="repeat-weeks" class="named">
				Vanliga rätter
				<span class="supporting">tidigast efter {weeksText(repeatWeeks)}</span>
			</span>
			{@render stepper(
				'repeat-weeks',
				repeatWeeks,
				1,
				MAX_REPEAT_WEEKS,
				'Färre veckor för vanliga rätter',
				'Fler veckor för vanliga rätter',
				(n) => {
					repeatWeeks = n;
					// A favourite never waits longer than other dishes.
					if (favouriteRepeatWeeks <= n) save('repeatWeeks');
					else {
						favouriteRepeatWeeks = n;
						save('repeatWeeks', 'favouriteRepeatWeeks');
					}
				}
			)}
			<input type="hidden" name="repeatWeeks" value={repeatWeeks} />
		</div>

		<div class="setting">
			<span id="favourite-weeks" class="named">
				<span class="favourite"><Icon name="thumbUp" />Favoriter</span>
				<span class="supporting">tidigast efter {weeksText(favouriteRepeatWeeks)}</span>
			</span>
			{@render stepper(
				'favourite-weeks',
				favouriteRepeatWeeks,
				1,
				repeatWeeks,
				'Färre veckor för favoriter',
				'Fler veckor för favoriter',
				(n) => {
					favouriteRepeatWeeks = n;
					save('favouriteRepeatWeeks');
				}
			)}
			<input type="hidden" name="favouriteRepeatWeeks" value={favouriteRepeatWeeks} />
		</div>

		{#if form?.error}
			<p class="error-text" role="alert">{form.error}</p>
		{/if}
		<p class="note">
			Sparas direkt. Gäller varje vecka, tillsammans med kraven för de som äter. Åts en rätt vecka
			40 och det står 4 veckor, föreslår Claude den tidigast vecka 44. Favoriter väljer du på
			rättens sida. Det du skriver in själv bestämmer du alltid.
		</p>
	</form>

	<h2>Erbjudanden</h2>
	<p class="note">
		Claude väljer gärna rätter med det som är på extrapris i de butiker ni handlar i. Slå på de
		kedjor ni brukar handla hos.
	</p>
	{#each chains as chain (chain.chain)}
		{@const label = chainLabel(chain.chain)}
		<section class="chain" aria-label={label}>
			<div class="chain-row">
				<label for="chain-{chain.chain}">{label}</label>
				<!-- m3e-switch takes no name from its label, so it is given its own. -->
				<m3e-switch
					id="chain-{chain.chain}"
					aria-label={label}
					checked={chain.enabled || undefined}
					onchange={(e: Event & { currentTarget: HTMLElement & { checked: boolean } }) =>
						toggle(chain, e.currentTarget.checked)}
				></m3e-switch>
			</div>
			{#if chain.enabled}
				{#if hasStores(chain.chain)}
					<div class="chain-row store">
						<span class="supporting">{chain.storeName ?? 'Ingen butik vald'}</span>
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
						<m3e-button variant="text" onclick={() => choose(chain.chain)}>
							{chain.storeId ? 'Byt butik' : 'Välj butik'}
						</m3e-button>
					</div>
				{:else}
					<p class="supporting">Samma erbjudanden i alla butiker</p>
				{/if}
				{#if fetching.includes(chain.chain)}
					<p class="supporting" role="status">Hämtar erbjudanden …</p>
				{:else if chain.error}
					<p class="error-text">Kunde inte hämta senast. {chain.error}</p>
				{/if}
			{/if}
		</section>
	{/each}

	<div class="setting">
		<span class="named">
			<label for="member-prices">Räkna med medlemspriser</label>
			<span class="supporting">Stammis, Willys Plus, Coop-medlem och Lidl Plus</span>
		</span>
		<m3e-switch
			id="member-prices"
			aria-label="Räkna med medlemspriser"
			checked={memberPrices || undefined}
			onchange={(e: Event & { currentTarget: HTMLElement & { checked: boolean } }) =>
				toggleMemberPrices(e.currentTarget.checked)}
		></m3e-switch>
	</div>

	{#if chainError}
		<p class="error-text" role="alert">{chainError}</p>
	{/if}
	<p class="note">
		Sparas direkt. Erbjudandena hämtas varje måndag morgon och när du byter butik.
		{#if latest}Senast {fetchedText(latest)}: {offerCount} erbjudanden.{/if}
	</p>
	{#if offerCount}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
		<m3e-button class="show-offers" variant="tonal" onclick={() => (showingOffers = true)}>
			<span slot="icon" class="slot-icon"><Icon name="tag" /></span>Visa veckans erbjudanden
		</m3e-button>
	{/if}

	<h2>Färg</h2>
	<ThemePicker />
</main>

<OffersSheet open={showingOffers} onclose={() => (showingOffers = false)} />

<StorePicker
	chain={picking}
	open={pickerOpen}
	chosen={chains.find((c) => c.chain === picking)?.storeId ?? null}
	onpick={pick}
	onclose={closePicker}
/>

<style>
	.account {
		padding: 1.25rem 1rem;
		border-radius: 1.5rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		text-align: center;
	}

	.account img,
	.letter {
		width: 4.5rem;
		height: 4.5rem;
		margin-bottom: 0.5rem;
		border-radius: 50%;
	}

	.account img {
		object-fit: cover;
	}

	.letter {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		font-size: 1.75rem;
		font-weight: 600;
	}

	.account strong {
		font-size: 1.125rem;
	}

	/* As an outlined button. */
	.logout {
		margin-top: 0.75rem;
		height: 2.5rem;
		padding: 0 1.5rem;
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: 1.25rem;
		display: flex;
		align-items: center;
		color: var(--md-sys-color-primary);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
	}

	.show-offers {
		align-self: flex-start;
	}

	header {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.5rem 0.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		margin: 0;
		font-size: 1.375rem;
		font-weight: 700;
	}

	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	h2 {
		margin: 0.75rem 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.add {
		align-self: flex-start;
	}

	.setting {
		min-height: 3.5rem;
		padding: 0.25rem 0.5rem 0.25rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.named {
		display: flex;
		flex-direction: column;
	}

	.supporting {
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.favourite {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.favourite :global(svg) {
		width: 1rem;
		height: 1rem;
		color: var(--md-sys-color-primary);
	}

	.chain {
		padding: 0.25rem 0.5rem 0.25rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-surface-container);
	}

	.chain-row {
		min-height: 3.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.chain-row label {
		font-size: 1.0625rem;
		font-weight: 500;
	}

	.chain-row.store {
		min-height: 2.75rem;
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.chain p {
		margin: 0;
		padding: 0.5rem 0;
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	output {
		width: 1.75rem;
		text-align: center;
		font-size: 1.125rem;
		font-weight: 700;
	}
</style>
