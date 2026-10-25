<script lang="ts">
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import { resolve } from '$app/paths';
	import { postAction, type Fields } from '#lib/actions.ts';
	import Icon from '#lib/Icon.svelte';
	import WeekHeader from '#lib/WeekHeader.svelte';
	import type { ShoppingItem } from '#lib/server/db/shopping.ts';
	import { isoWeek } from '#lib/weeks.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let isNext = $derived(data.weekStart === data.nextWeek);

	// A tap shows at once, before the server has answered.
	let pendingChecked = $state<Record<number, boolean>>({});
	// Items written in but not yet saved, per week.
	let adding = $state<Record<string, string[]>>({});
	let draft = $state('');
	let making = $state(false);
	let failed = $state(false);
	let showBasket = $state(true);
	// The latest item put in the basket, which the snackbar can undo.
	let basketed = $state<ShoppingItem | null>(null);

	const isChecked = (item: ShoppingItem) => pendingChecked[item.id] ?? item.checked;
	let toBuy = $derived(data.items.filter((item) => !isChecked(item)));
	let basket = $derived(data.items.filter(isChecked));
	let added = $derived(adding[data.weekStart] ?? []);

	// Written by hand first, under the field they are written in, then a heading per dish.
	const BY_HAND = 'Skrivet själv';
	let groups = $derived(
		Map.groupBy(
			toBuy.toSorted((a, b) => Number(b.origin === 'hand') - Number(a.origin === 'hand')),
			(item) => (item.origin === 'hand' ? BY_HAND : (item.section ?? ''))
		)
	);

	let onlyName = $derived(data.dishes.filter((dish) => !dish.hasIngredients));
	let isEmpty = $derived(data.items.length === 0 && added.length === 0);

	async function post(action: string, fields: Fields) {
		const result = await postAction(action, { weekStart: data.weekStart, ...fields });
		if (!result || result.type !== 'success') failed = true;
	}

	async function make() {
		making = true;
		await post('make', {});
		making = false;
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

	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
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
			<span class="text">{item.text}</span>
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
		<div class="making">
			<m3e-loading-indicator></m3e-loading-indicator>
			<p role="status">Gör listan …</p>
		</div>
	{:else if isEmpty}
		<section class="empty">
			{#if data.dishes.length === 0}
				<h2>Veckan har inga rätter än</h2>
				<p class="hint">Skriv in veckan först, så blir listan av rätternas ingredienser.</p>
				<a href="{resolve('/')}?vecka={data.weekStart}">Till veckan</a>
			{:else}
				<h2>Ingen inköpslista för veckan än</h2>
				<p class="hint">Ingredienserna ur veckans rätter, rätt för rätt.</p>
				<p class="hint">
					{plural(data.dishes.length - onlyName.length, 'rätt har', 'rätter har')} ingredienser, {plural(
						onlyName.length,
						'rätt har',
						'rätter har'
					)} bara namn.
				</p>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button variant="filled" onclick={make}>Gör inköpslistan</m3e-button>
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

	{#if onlyName.length && !making}
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

	.done .text {
		text-decoration: line-through;
	}
</style>
