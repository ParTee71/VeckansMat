<script lang="ts">
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { postAction, type Fields } from '#lib/actions.ts';
	import AddItemSheet from '#lib/AddItemSheet.svelte';
	import { useFab } from '#lib/fab.svelte.ts';
	import FoldCard from '#lib/FoldCard.svelte';
	import Icon from '#lib/Icon.svelte';
	import ShoppingRow from '#lib/ShoppingRow.svelte';
	import WeekArrows from '#lib/WeekArrows.svelte';
	import type { RemovedItem, ShoppingItem } from '#lib/server/db/shopping.ts';
	import { plural } from '#lib/names.ts';
	import { BASKET_LOOK, HAND_LOOK, lookOf, sectionRank, type Look } from '#lib/shopping.ts';
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

	// A tap shows at once, before the server has answered.
	let pendingChecked = $state<Record<number, boolean>>({});
	// Items written in but not yet saved, per week.
	let adding = $state<Record<string, string[]>>({});
	let addOpen = $state(false);
	useFab(plus);
	// Per week, so that the other week shows its own list meanwhile.
	let makingWeeks = $state<Record<string, boolean>>({});
	let making = $derived(!!makingWeeks[data.weekStart]);
	let failed = $state(false);
	// The latest item put in the basket, or removed, which the snackbar can undo.
	let basketed = $state<ShoppingItem | null>(null);
	let removed = $state<RemovedItem | null>(null);
	// Items swiped away, hidden until the server has answered.
	let removing = $state<Record<number, boolean>>({});
	// Why Claude made no list, per week; then the list is the recipes' lines.
	let listErrors = $state<Record<string, 'failed' | 'limit'>>({});
	// Per week, the week as it was when the household chose not to update the list; a later
	// change to the week asks again.
	let notNow = $state<Record<string, string>>({});
	let listError = $derived(listErrors[data.weekStart]);

	const isChecked = (item: ShoppingItem) => pendingChecked[item.id] ?? item.checked;
	let shown = $derived(items.filter((item) => !removing[item.id]));
	let toBuy = $derived(shown.filter((item) => !isChecked(item)));
	let basket = $derived(shown.filter(isChecked));
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
	const looks: Record<string, Look> = { [BY_HAND]: HAND_LOOK };
	const dishesOf = (item: ShoppingItem) =>
		item.dishes.map((dish) => dish.name).join(', ') +
		(item.dishes.some((dish) => dish.guessed) ? ' · gissat' : '');

	// The cards folded away, which each phone remembers. The basket starts folded.
	const BASKET = 'I korgen';
	const FOLDED_KEY = 'handla-stangda';
	let folded = $state<Record<string, boolean>>({ [BASKET]: true });
	$effect(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? 'null');
			if (stored && typeof stored === 'object') folded = stored;
		} catch {
			// Nothing remembered, or no storage.
		}
	});
	function fold(title: string, open: boolean) {
		folded[title] = !open;
		try {
			localStorage.setItem(FOLDED_KEY, JSON.stringify(folded));
		} catch {
			// Remembered for this visit only.
		}
	}

	// How far the shopping has come, as a wavy line that grows over a straight one.
	let progress = $derived(
		toBuy.length + basket.length ? basket.length / (toBuy.length + basket.length) : 0
	);
	const WAVE_WIDTH = 154;
	let wave = $derived.by(() => {
		const end = 3 + Math.round((WAVE_WIDTH * progress) / 6) * 6;
		let d = 'M3 4';
		for (let x = 3; x < end; x += 6) d += ' q1.5 -3 3 0 t3 0';
		return { d: end > 3 ? d : '', track: `M${end > 3 ? end + 4 : 3} 4 H157` };
	});

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

	async function add(text: string) {
		const weekStart = data.weekStart;
		adding[weekStart] = [...(adding[weekStart] ?? []), text];
		await post('add', { text });
		adding[weekStart] = adding[weekStart].toSpliced(adding[weekStart].indexOf(text), 1);
	}

	async function check(item: ShoppingItem, checked: boolean) {
		pendingChecked[item.id] = checked;
		removed = null;
		if (checked) basketed = item;
		else if (basketed?.id === item.id) basketed = null;
		await post('check', { id: item.id, checked: String(checked) });
		// A newer tap on the same item stays until its own answer comes.
		if (pendingChecked[item.id] === checked) delete pendingChecked[item.id];
	}

	async function remove(item: ShoppingItem) {
		removing[item.id] = true;
		basketed = null;
		const result = await post('remove', { id: item.id });
		delete removing[item.id];
		if (result?.type === 'success' && result.data?.removed) {
			removed = result.data.removed as RemovedItem;
		}
	}

	function undoRemove(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState !== 'closed' || !removed) return;
		const item = removed;
		removed = null;
		if (event.currentTarget.isActionTaken) post('restore', { item: JSON.stringify(item) });
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

{#snippet row(item: ShoppingItem)}
	<ShoppingRow
		text={item.text}
		amount={item.amount}
		dishes={item.dishes.length ? dishesOf(item) : ''}
		checked={isChecked(item)}
		oncheck={(checked) => check(item, checked)}
		onremove={() => remove(item)}
	/>
{/snippet}

<main class="page warm-view">
	<header>
		<p class="label">
			Vecka {isoWeek(data.weekStart).week} · {data.weekStart === data.nextWeek
				? 'nästa vecka'
				: 'den här veckan'}
		</p>
		<div class="arrows">
			<WeekArrows weekStart={data.weekStart} thisWeek={data.thisWeek} nextWeek={data.nextWeek} />
		</div>
	</header>
	<div class="title">
		<h1 class="view-title">Handla</h1>
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
	</div>
	{#if toBuy.length || basket.length}
		<div class="progress">
			<svg
				role="img"
				aria-label="{basket.length} av {toBuy.length + basket.length} i korgen"
				width="160"
				height="8"
				viewBox="0 0 160 8"
			>
				{#if wave.d}<path class="wave" d={wave.d} />{/if}
				<path class="track" d={wave.track} />
			</svg>
			<span>{toBuy.length} kvar · {basket.length} i korgen</span>
		</div>
	{/if}

	{#if failed}
		<p class="error" role="alert">Det gick inte att spara. Kontrollera nätet och försök igen.</p>
	{/if}

	{#if making}
		<!-- No notice while the list is being made. -->
	{:else if listError}
		<section class="card notice">
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
		<section class="card notice changed">
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
		<div class="card making">
			<m3e-loading-indicator></m3e-loading-indicator>
			<p role="status">Claude gör listan …</p>
			<p class="hint">Räknar om till veckans portioner och slår ihop det som behövs.</p>
		</div>
	{:else if isEmpty}
		<section class="card empty">
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
		{#if added.length && !groups.has(BY_HAND)}
			<FoldCard title={BY_HAND} look={HAND_LOOK}>
				<ul aria-label="Sparas">
					{#each added as text, i (i)}<li class="pending">{text}</li>{/each}
				</ul>
			</FoldCard>
		{/if}
		{#each groups as [title, items] (title)}
			<FoldCard
				{title}
				look={looks[title] ?? lookOf(title)}
				count={items.length}
				bind:open={() => !folded[title], (open) => fold(title, open)}
			>
				<ul>
					{#if title === BY_HAND}
						{#each added as text, i (i)}<li class="pending">{text}</li>{/each}
					{/if}
					{#each items as item (item.id)}
						{@render row(item)}
					{/each}
				</ul>
			</FoldCard>
		{/each}

		{#if basket.length}
			<FoldCard
				title={BASKET}
				look={BASKET_LOOK}
				count={basket.length}
				bind:open={() => !folded[BASKET], (open) => fold(BASKET, open)}
			>
				<ul>
					{#each basket as item (item.id)}
						{@render row(item)}
					{/each}
				</ul>
			</FoldCard>
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

{#snippet plus()}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-fab is a button with its own keyboard handling) -->
	<m3e-fab variant="primary" aria-label="Lägg till en vara" onclick={() => (addOpen = true)}>
		<Icon name="add" />
	</m3e-fab>
{/snippet}

<AddItemSheet bind:open={addOpen} onadd={add} />

{#key basketed}
	{#if basketed}
		<m3e-snackbar action="Ångra" duration="6000" open ontoggle={undoCheck}>
			{basketed.text} i korgen
		</m3e-snackbar>
	{/if}
{/key}
{#key removed}
	{#if removed}
		<m3e-snackbar action="Ångra" duration="6000" open ontoggle={undoRemove}>
			{removed.text} togs bort
		</m3e-snackbar>
	{/if}
{/key}

<style>
	header {
		margin: 0 -0.5rem -0.75rem 0.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--md-sys-color-primary);
	}

	.arrows {
		display: flex;
	}

	.title {
		margin: 0 -0.5rem 0 0.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.progress {
		margin: -0.5rem 0 0.25rem 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.progress svg {
		flex-shrink: 0;
	}

	.progress path {
		fill: none;
		stroke-width: 3;
		stroke-linecap: round;
	}

	.wave {
		stroke: var(--md-sys-color-primary);
	}

	.track {
		stroke: var(--md-sys-color-primary-container);
	}

	ul {
		margin: 0;
		padding: 0 0 0.25rem;
		list-style: none;
	}

	.pending {
		min-height: 2.875rem;
		padding-left: 3.25rem;
		display: flex;
		align-items: center;
		color: var(--md-sys-color-on-surface-variant);
	}

	.card h2 {
		margin: 0;
		font-size: 1rem;
	}

	.empty m3e-button,
	.empty a {
		align-self: flex-start;
	}

	a {
		color: var(--md-sys-color-primary);
		font-weight: 500;
	}

	.only-name {
		margin: 0.25rem 0.25rem 0;
	}

	.making {
		align-items: center;
		text-align: center;
	}

	.making p {
		margin: 0;
	}

	.notice {
		align-items: flex-start;
	}

	.notice p {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.notice.changed {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		box-shadow: none;
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
	}
</style>
