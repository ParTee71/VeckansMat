<script lang="ts">
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { postAction, type Fields } from '#lib/actions.ts';
	import Icon from '#lib/Icon.svelte';
	import WeekHeader from '#lib/WeekHeader.svelte';
	import type { ShoppingItem } from '#lib/server/db/shopping.ts';
	import { plural } from '#lib/names.ts';
	import { sectionRank } from '#lib/shopping.ts';
	import { isoWeek } from '#lib/weeks.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The list as the latest change answered with it, per week, which the page shows until it
	// loads again. An answer to an older change than one already shown is left out.
	let answered = $state<Record<string, { items: ShoppingItem[]; change: number }>>({});
	let changes = 0;
	$effect.pre(() => {
		void data;
		answered = {};
	});
	let items = $derived(answered[data.weekStart]?.items ?? data.items);

	let isNext = $derived(data.weekStart === data.nextWeek);

	// A tap shows at once, before the server has answered.
	let pendingChecked = $state<Record<number, boolean>>({});
	// Items written in but not yet saved, per week.
	let adding = $state<Record<string, string[]>>({});
	let draft = $state('');
	// Per week, so that the other week shows its own list meanwhile.
	let makingWeeks = $state<Record<string, boolean>>({});
	let making = $derived(!!makingWeeks[data.weekStart]);
	let failed = $state(false);
	let showBasket = $state(true);
	// The latest item put in the basket, which the snackbar can undo.
	let basketed = $state<ShoppingItem | null>(null);
	// Why Claude made no list, per week; then the list is the recipes' lines.
	let listErrors = $state<Record<string, 'failed' | 'limit'>>({});
	// Per week, the week as it was when the household chose not to update the list; a later
	// change to the week asks again.
	let notNow = $state<Record<string, string>>({});
	let listError = $derived(listErrors[data.weekStart]);

	const isChecked = (item: ShoppingItem) => pendingChecked[item.id] ?? item.checked;
	let toBuy = $derived(items.filter((item) => !isChecked(item)));
	let basket = $derived(items.filter(isChecked));
	let added = $derived(adding[data.weekStart] ?? []);

	// Written by hand first, under the field they are written in, then the store's sections in
	// their order; a list of the recipes' lines has a heading per dish.
	const BY_HAND = 'Skrivet själv';
	const rank = (item: ShoppingItem) => (item.origin === 'hand' ? -1 : sectionRank(item.section));
	let groups = $derived(
		Map.groupBy(
			toBuy.toSorted((a, b) => rank(a) - rank(b)),
			(item) => (item.origin === 'hand' ? BY_HAND : (item.section ?? ''))
		)
	);
	const dishesOf = (item: ShoppingItem) =>
		item.dishes.map((dish) => dish.name).join(', ') +
		(item.dishes.some((dish) => dish.guessed) ? ' · gissat' : '');

	let onlyName = $derived(data.dishes.filter((dish) => !dish.hasIngredients));
	let isEmpty = $derived(items.length === 0 && added.length === 0);

	async function post(action: string, fields: Fields) {
		const weekStart = data.weekStart;
		const change = ++changes;
		const result = await postAction(action, { weekStart, ...fields });
		if (result?.type === 'success' && result.data?.items) {
			const fresh = result.data.items as ShoppingItem[];
			if (change > (answered[weekStart]?.change ?? 0))
				answered[weekStart] = { items: fresh, change };
		}
		if (!result || result.type === 'error') failed = true;
		return result;
	}

	async function make() {
		const weekStart = data.weekStart;
		makingWeeks[weekStart] = true;
		delete listErrors[weekStart];
		const result = await post('make', {});
		if (result?.type === 'failure') {
			listErrors[weekStart] = result.data?.shoppingError as 'failed' | 'limit';
		}
		// A new list changes the whole page, so it loads again.
		await invalidateAll();
		delete makingWeeks[weekStart];
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		const text = draft.trim();
		if (!text) return;
		const weekStart = data.weekStart;
		draft = '';
		adding[weekStart] = [...(adding[weekStart] ?? []), text];
		await post('add', { text });
		adding[weekStart] = adding[weekStart].toSpliced(adding[weekStart].indexOf(text), 1);
	}

	async function check(item: ShoppingItem, checked: boolean) {
		pendingChecked[item.id] = checked;
		if (checked) basketed = item;
		else if (basketed?.id === item.id) basketed = null;
		await post('check', { id: item.id, checked: String(checked) });
		// A newer tap on the same item stays until its own answer comes.
		if (pendingChecked[item.id] === checked) delete pendingChecked[item.id];
	}

	function undoCheck(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState !== 'closed' || !basketed) return;
		const item = basketed;
		basketed = null;
		if (event.currentTarget.isActionTaken) check(item, false);
	}
</script>

<svelte:head>
	<title>Handla – Veckans mat</title>
</svelte:head>

{#snippet itemRow(item: ShoppingItem)}
	<li class="item">
		<!-- svelte-ignore a11y_label_has_associated_control (m3e-checkbox is the control; a tap anywhere on the row ticks it) -->
		<label>
			<m3e-checkbox
				aria-label={item.text}
				checked={isChecked(item) || undefined}
				onchange={(e: Event & { currentTarget: HTMLElement & { checked: boolean } }) =>
					check(item, e.currentTarget.checked)}
			></m3e-checkbox>
			<span class="text">
				<span>{item.text}</span>
				{#if item.origin === 'claude' && item.dishes.length}
					<span class="meta">{dishesOf(item)}</span>
				{/if}
			</span>
			{#if item.amount}
				<span class="amount">{item.amount}</span>
			{/if}
		</label>
		{#if item.origin === 'hand'}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
			<m3e-icon-button
				aria-label="Ta bort {item.text}"
				onclick={() => post('remove', { id: item.id })}
			>
				<Icon name="close" />
			</m3e-icon-button>
		{/if}
	</li>
{/snippet}

<main>
	<WeekHeader
		title="Handla"
		subtitle="Vecka {isoWeek(data.weekStart).week} · {isNext
			? 'nästa vecka'
			: 'den här veckan'}{toBuy.length ? ` · ${plural(toBuy.length, 'vara', 'varor')} kvar` : ''}"
		weekStart={data.weekStart}
		thisWeek={data.thisWeek}
		nextWeek={data.nextWeek}
	>
		{#snippet actions()}
			{#if !isEmpty}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					aria-label="Gör om listan från veckan"
					disabled={making || undefined}
					onclick={make}
				>
					<Icon name="refresh" />
				</m3e-icon-button>
			{/if}
		{/snippet}
	</WeekHeader>

	<form class="add" onsubmit={add}>
		<input
			aria-label="Lägg till en vara"
			placeholder="Lägg till en vara"
			autocomplete="off"
			enterkeyhint="done"
			maxlength="200"
			bind:value={draft}
		/>
		<m3e-icon-button type="submit" aria-label="Lägg till">
			<Icon name="add" />
		</m3e-icon-button>
	</form>

	{#if failed}
		<p class="error" role="alert">Det gick inte att spara. Kontrollera nätet och försök igen.</p>
	{/if}

	{#if making}
		<!-- No notice while the list is being made. -->
	{:else if listError}
		<section class="notice">
			<p>
				{listError === 'limit'
					? 'Appen har använt Claude så mycket som månadens tak tillåter'
					: 'Claude kunde inte göra listan just nu'}, så här står ingredienserna rätt för rätt som
				de står i recepten.
			</p>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
			<m3e-button variant="outlined" onclick={make}>Försök igen</m3e-button>
		</section>
	{:else if data.changed && notNow[data.weekStart] !== data.basis}
		<section class="notice changed">
			<h2>Veckan har ändrats</h2>
			<p>Det du skrivit själv och det som ligger i korgen står kvar när listan uppdateras.</p>
			<div class="buttons">
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button variant="filled" onclick={make}>Uppdatera listan</m3e-button>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button variant="text" onclick={() => (notNow[data.weekStart] = data.basis)}
					>Inte nu</m3e-button
				>
			</div>
		</section>
	{/if}

	{#if making}
		<div class="making">
			<m3e-loading-indicator></m3e-loading-indicator>
			<p role="status">Claude gör listan …</p>
			<p class="hint">Räknar om till veckans portioner och slår ihop det som behövs.</p>
		</div>
	{:else if isEmpty}
		<section class="empty">
			{#if data.dishes.length === 0}
				<h2>Veckan har inga rätter än</h2>
				<p class="hint">Skriv in veckan först, så blir listan av rätternas ingredienser.</p>
				<a href="{resolve('/')}?vecka={data.weekStart}">Till veckan</a>
			{:else}
				<h2>Ingen inköpslista för veckan än</h2>
				<p class="hint">
					Claude läser veckans rätter, räknar om till rätt antal portioner och slår ihop det som
					behövs till en lista sorterad efter butikens avdelningar.
				</p>
				<p class="hint">
					{plural(data.dishes.length - onlyName.length, 'rätt har', 'rätter har')} ingredienser.
					{#if onlyName.length}
						{plural(onlyName.length, 'rätt har', 'rätter har')} bara namn, och Claude gissar vad som brukar
						behövas och skriver in det i rätten.
					{/if}
				</p>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button variant="filled" onclick={make}>
					<span slot="icon" class="slot-icon"><Icon name="suggest" /></span>Gör inköpslistan
				</m3e-button>
			{/if}
		</section>
	{:else}
		{#if added.length}
			<ul class="items" aria-label="Sparas">
				{#each added as text, i (i)}
					<li class="item pending"><span class="text">{text}</span></li>
				{/each}
			</ul>
		{/if}
		{#each groups as [title, items] (title)}
			<h2 class="section">{title}</h2>
			<ul class="items">
				{#each items as item (item.id)}
					{@render itemRow(item)}
				{/each}
			</ul>
		{/each}

		{#if basket.length}
			<div class="section basket">
				<h2>I korgen · {basket.length}</h2>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button variant="text" onclick={() => (showBasket = !showBasket)}>
					{showBasket ? 'Dölj' : 'Visa'}
				</m3e-button>
			</div>
			{#if showBasket}
				<ul class="items done">
					{#each basket as item (item.id)}
						{@render itemRow(item)}
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}

	{#if onlyName.length && !isEmpty && !making}
		<p class="hint only-name">
			Bara namn, inget att lista:
			{#each onlyName as dish, i (dish.id)}<a
					href={resolve('/ratter/[id]', { id: String(dish.id) })}>{dish.name}</a
				>{i < onlyName.length - 1 ? ', ' : '.'}
			{/each}
		</p>
	{/if}
</main>

{#key basketed}
	{#if basketed}
		<m3e-snackbar action="Ångra" duration="6000" open ontoggle={undoCheck}>
			{basketed.text} i korgen
		</m3e-snackbar>
	{/if}
{/key}

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
	}

	.add {
		min-height: 3.25rem;
		padding: 0 0.25rem 0 1rem;
		border-radius: 1.625rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		align-items: center;
	}

	.add input {
		flex-grow: 1;
		min-width: 0;
		padding: 0.75rem 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 1rem;
		outline: none;
	}

	.error {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.empty {
		padding: 1.25rem;
		border-radius: 1.75rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty m3e-button,
	.empty a {
		align-self: flex-start;
	}

	a {
		color: var(--md-sys-color-primary);
		font-weight: 500;
	}

	.hint {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.only-name {
		margin: 0.25rem 0.25rem 0;
	}

	.making {
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.making p {
		margin: 0;
	}

	.section {
		margin: 0.5rem 0 0 0.25rem;
		min-height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.section h2,
	h2.section {
		font-size: 0.875rem;
	}

	.items {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.item {
		min-height: 3.25rem;
		border-radius: 0.25rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		align-items: center;
	}

	.item:first-child {
		border-top-left-radius: 1.25rem;
		border-top-right-radius: 1.25rem;
	}

	.item:last-child {
		border-bottom-left-radius: 1.25rem;
		border-bottom-right-radius: 1.25rem;
	}

	.item label {
		flex-grow: 1;
		min-width: 0;
		padding: 0.25rem 1rem 0.25rem 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
	}

	.item.pending {
		padding-left: 3.25rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.text {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.done .item {
		color: var(--md-sys-color-on-surface-variant);
	}

	.meta {
		font-size: 0.75rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.amount {
		font-size: 0.875rem;
		white-space: nowrap;
		color: var(--md-sys-color-on-surface-variant);
	}

	.notice {
		padding: 1rem;
		border-radius: 1.25rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.625rem;
	}

	.notice p {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.notice.changed {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
	}

	.done .amount,
	.done .text {
		text-decoration: line-through;
	}
</style>
