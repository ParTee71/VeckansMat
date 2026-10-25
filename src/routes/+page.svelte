<script lang="ts">
	import type { ActionResult } from '$app/forms';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import { postAction, type Fields } from '#lib/actions.ts';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import WeekHeader from '#lib/WeekHeader.svelte';
	import { nameKey, plural } from '#lib/names.ts';
	import { isDish, MEAL_LABELS, NOT_DISHES, timesText } from '#lib/recipes.ts';
	import type { Meal, RowInput, Week } from '#lib/server/db/menus.ts';
	import type { RecipeSummary } from '#lib/server/db/recipes.ts';
	import { WEEKDAY_NAMES, WEEKDAYS, isoWeek, weekDates } from '#lib/weeks.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// What the latest change answered with, per week, which the page shows until it loads again.
	// An answer to an older change than one already shown is left out.
	let answered = $state<Record<string, { week: Week; recipes: RecipeSummary[]; change: number }>>(
		{}
	);
	let changes = 0;
	$effect.pre(() => {
		void data;
		answered = {};
	});
	let week = $derived(answered[data.week.weekStart]?.week ?? data.week);
	let recipes = $derived(answered[data.week.weekStart]?.recipes ?? data.recipes);
	let isNext = $derived(week.weekStart === data.nextWeek);

	// Text just written shows at once, before the server has answered.
	let pending = $state<Record<string, string>>({});
	// Weekday lunches added but not written in yet, per week.
	let addedLunches = $state<Record<string, number[]>>({});
	let choosingLunch = $state(false);
	let editing = $state<string | null>(null);
	let draft = $state('');
	let failed = $state(false);
	// Who eats, as just tapped, before the server has answered.
	let pendingEaters = $state<Record<string, number[]>>({});
	let eaterIds = $derived(pendingEaters[week.weekStart] ?? week.eaters);

	// Claude's suggestion: the week being suggested, a day being swapped, and what went wrong.
	// The wish as written, per week, so that the page loading again does not wipe it.
	let wishes = $state<Record<string, string>>({});
	let wish = $derived(wishes[week.weekStart] ?? week.wish ?? '');
	// Per week, so that one week waiting on Claude leaves the other free.
	let suggestingWeeks = $state<Record<string, boolean>>({});
	let suggesting = $derived(!!suggestingWeeks[week.weekStart]);
	let swapping = $state<string | null>(null);
	let busy = $derived(suggesting || !!swapping?.startsWith(`${week.weekStart}-`));
	let suggestError = $state<{ weekStart: string; reason: 'failed' | 'limit' } | null>(null);
	// The latest swap, which the snackbar can undo.
	let swapped = $state<{ key: string; weekStart: string; before: RowInput; text: string } | null>(
		null
	);
	let hasSuggestion = $derived(week.rows.some((r) => r.reason !== null));

	const keyOf = (weekday: number, meal: Meal) => `${week.weekStart}-${meal}-${weekday}`;
	const stored = (weekday: number, meal: Meal) =>
		week.rows.find((r) => r.weekday === weekday && r.meal === meal);
	const textOf = (weekday: number, meal: Meal) =>
		pending[keyOf(weekday, meal)] ?? stored(weekday, meal)?.text ?? '';

	const DAYS = [1, 2, 3, 4, 5, 6, 7];
	// Lunch on Saturday and Sunday, and on any weekday that has one.
	let lunchDays = $derived(
		DAYS.filter(
			(d) =>
				d >= 6 ||
				stored(d, 'lunch') ||
				textOf(d, 'lunch') ||
				addedLunches[week.weekStart]?.includes(d)
		)
	);
	let freeLunchDays = $derived(DAYS.filter((d) => !lunchDays.includes(d)));

	let eaters = $derived(data.people.filter((p) => eaterIds.includes(p.id)));
	let extra = $derived(data.settings.lunchboxExtraPortions);

	// Dishes matching what is written, the most eaten first.
	let key = $derived(nameKey(draft));
	let matches = $derived(
		key
			? recipes
					.filter((r) => nameKey(r.name).includes(key))
					.toSorted((a, b) => b.timesEaten - a.timesEaten || a.name.localeCompare(b.name, 'sv'))
					.slice(0, 5)
			: []
	);
	let isNew = $derived(key && isDish(draft) && !recipes.some((r) => nameKey(r.name) === key));

	async function post(action: string, fields: Fields): Promise<ActionResult | null> {
		const change = ++changes;
		const result = await postAction(action, fields);
		if (result?.type === 'success' && result.data?.week) {
			const fresh = result.data as { week: Week; recipes: RecipeSummary[] };
			const weekStart = fresh.week.weekStart;
			if (change > (answered[weekStart]?.change ?? 0)) answered[weekStart] = { ...fresh, change };
		}
		// A failure stays on screen until the page is loaded again. What an action itself turns
		// down is for its caller to show.
		if (!result || result.type === 'error') failed = true;
		return result;
	}

	/** Posts to Claude's actions, and shows when Claude could not help. */
	async function postSuggest(action: string, fields: Fields) {
		const weekStart = week.weekStart;
		suggestError = null;
		const result = await post(action, { weekStart, ...fields });
		if (result?.type === 'failure')
			suggestError = { weekStart, reason: result.data?.suggestError as 'failed' | 'limit' };
		return result;
	}

	async function suggest() {
		editing = null;
		const weekStart = week.weekStart;
		suggestingWeeks[weekStart] = true;
		await postSuggest('suggest', { wish, eaters: eaterIds });
		delete suggestingWeeks[weekStart];
	}

	async function swap(weekday: number, meal: Meal) {
		const weekStart = week.weekStart;
		const key = keyOf(weekday, meal);
		swapping = key;
		const result = await postSuggest('swap', { weekday, meal });
		if (result?.type === 'success' && result.data?.before) {
			const { before, text } = result.data as { before: RowInput; text: string };
			swapped = { key, weekStart, before, text };
		}
		if (swapping === key) swapping = null;
	}

	async function undoSwap(event: ToggleEvent & { currentTarget: M3eSnackbarElement }) {
		if (event.newState !== 'closed' || !swapped) return;
		const { before, weekStart } = swapped;
		swapped = null;
		if (!event.currentTarget.isActionTaken) return;
		await post('restore', {
			weekStart,
			weekday: before.weekday,
			meal: before.meal,
			text: before.text,
			reason: before.reason ?? '',
			alternatives: JSON.stringify(before.alternatives ?? []),
			passedOn: JSON.stringify(before.passedOn ?? [])
		});
	}

	function edit(weekday: number, meal: Meal) {
		editing = keyOf(weekday, meal);
		draft = textOf(weekday, meal);
		choosingLunch = false;
	}

	async function write(weekday: number, meal: Meal, text: string) {
		editing = null;
		const k = keyOf(weekday, meal);
		if (text.trim() === textOf(weekday, meal)) return;
		if (swapped?.key === k) swapped = null;
		pending[k] = text.trim();
		await post('row', {
			weekStart: week.weekStart,
			weekday,
			meal,
			text,
			eaters: eaterIds
		});
		// A newer text for the same day stays until its own answer comes.
		if (pending[k] === text.trim()) delete pending[k];
	}

	// Enter writes the day and goes on to the next one, as on the note.
	function keydown(event: KeyboardEvent, weekday: number, meal: Meal) {
		if (event.key === 'Escape') editing = null;
		if (event.key !== 'Enter') return;
		event.preventDefault();
		write(weekday, meal, draft);
		const days = meal === 'dinner' ? DAYS : lunchDays;
		const next = days[days.indexOf(weekday) + 1];
		if (next) edit(next, meal);
	}

	// The text field loses focus when a suggestion is tapped, so suggestions keep it.
	const keepFocus = (event: Event) => event.preventDefault();

	// The latest tap per week, whose answer clears what is shown.
	const eaterRequests: Record<string, number> = {};

	async function toggleEater(id: number, selected: boolean) {
		const weekStart = week.weekStart;
		const request = (eaterRequests[weekStart] = (eaterRequests[weekStart] ?? 0) + 1);
		const ids = selected ? [...eaterIds, id] : eaterIds.filter((e) => e !== id);
		pendingEaters[weekStart] = ids;
		await post('eaters', { weekStart, eaters: ids });
		if (request === eaterRequests[weekStart]) delete pendingEaters[weekStart];
	}

	function addLunch(weekday: number) {
		addedLunches[week.weekStart] = [...(addedLunches[week.weekStart] ?? []), weekday];
		edit(weekday, 'lunch');
	}

	const extraText = (n: number) => `Matlåda · ${plural(n, 'portion', 'portioner')} extra`;
	// Why Claude chose the dish, and how much extra to cook of a lunch-box dish.
	const metaText = (row: { reason: string | null; lunchbox: boolean }) =>
		[row.reason, row.lunchbox && extraText(extra)].filter(Boolean).join(' · ');
	const focus = (input: HTMLInputElement) => input.focus();
</script>

<svelte:head>
	<title>Veckan – Veckans mat</title>
</svelte:head>

{#snippet row(weekday: number, meal: Meal)}
	{@const text = textOf(weekday, meal)}
	{@const label = WEEKDAYS[weekday - 1]}
	{@const name = `${MEAL_LABELS[meal]} ${WEEKDAY_NAMES[weekday - 1]}`}
	{#if editing === keyOf(weekday, meal)}
		<!-- Leaving the row writes the day; moving within it, as to a suggestion with Tab, does not. -->
		<li
			class="row editing"
			onfocusout={(e) =>
				!e.currentTarget.contains(e.relatedTarget as Node | null) &&
				editing === keyOf(weekday, meal) &&
				write(weekday, meal, draft)}
		>
			<div class="line">
				<span class="day">{label}</span>
				<input
					aria-label={name}
					autocomplete="off"
					enterkeyhint="next"
					bind:value={draft}
					onkeydown={(e) => keydown(e, weekday, meal)}
					{@attach focus}
				/>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					aria-label="Töm raden"
					onpointerdown={keepFocus}
					onclick={() => write(weekday, meal, '')}
				>
					<Icon name="close" />
				</m3e-icon-button>
			</div>
			{#if matches.length || isNew}
				<ul class="suggestions">
					{#each matches as recipe (recipe.id)}
						<li>
							<button
								type="button"
								onpointerdown={keepFocus}
								onclick={() => write(weekday, meal, recipe.name)}
							>
								<span>{recipe.name}</span>
								<span class="meta">{recipe.timesEaten ? timesText(recipe.timesEaten) : ''}</span>
							</button>
						</li>
					{/each}
					{#if isNew}
						<li>
							<button
								type="button"
								class="new"
								onpointerdown={keepFocus}
								onclick={() => write(weekday, meal, draft)}
							>
								<Icon name="add" />Ny rätt: ”{draft.trim()}”
							</button>
						</li>
					{/if}
				</ul>
			{/if}
			<div class="quick">
				{#each NOT_DISHES as other (other)}
					<button
						type="button"
						class="chip"
						onpointerdown={keepFocus}
						onclick={() => write(weekday, meal, other)}>{other}</button
					>
				{/each}
			</div>
		</li>
	{:else}
		{@const current = stored(weekday, meal)}
		{@const saved = current && text === current.text ? current : null}
		{@const meta = saved ? metaText(saved) : ''}
		<li class={['row', swapped?.key === keyOf(weekday, meal) && 'swapped']}>
			<button
				type="button"
				class="show"
				aria-label="{name}: {text || 'tom'}"
				onclick={() => edit(weekday, meal)}
			>
				<span class="day">{label}</span>
				<span class="text">
					<span class={text ? '' : 'empty'}>{text || 'Skriv en rätt'}</span>
					{#if meta}
						<span class="meta">{meta}</span>
					{/if}
				</span>
			</button>
			{#if saved?.reason}
				{#if swapping === keyOf(weekday, meal)}
					<m3e-loading-indicator class="swap" aria-label="Byter {name}"></m3e-loading-indicator>
				{:else}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
					<m3e-icon-button
						class="swap"
						aria-label="Byt {name}"
						disabled={busy || undefined}
						onclick={() => swap(weekday, meal)}
					>
						<Icon name="swap" />
					</m3e-icon-button>
				{/if}
			{/if}
		</li>
	{/if}
{/snippet}

<main>
	<WeekHeader
		title="Vecka {isoWeek(week.weekStart).week}"
		subtitle="{weekDates(week.weekStart)} · {isNext ? 'nästa vecka' : 'den här veckan'}"
		weekStart={week.weekStart}
		thisWeek={data.thisWeek}
		nextWeek={data.nextWeek}
	>
		{#snippet actions()}
			{#if hasSuggestion}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					aria-label="Nytt förslag på hela veckan"
					disabled={busy || undefined}
					onclick={suggest}
				>
					<Icon name="suggest" />
				</m3e-icon-button>
			{/if}
		{/snippet}
	</WeekHeader>

	<section class="eaters">
		<h2>Vilka äter?</h2>
		{#if data.people.length === 0}
			<p class="hint">Lägg till de som brukar äta, med det de inte äter.</p>
		{:else}
			<div class="chips">
				{#each data.people as person (person.id)}
					<m3e-filter-chip
						selected={eaterIds.includes(person.id) || undefined}
						onchange={(e: Event & { currentTarget: HTMLElement & { selected: boolean } }) =>
							toggleEater(person.id, e.currentTarget.selected)}>{person.name}</m3e-filter-chip
					>
				{/each}
			</div>
			{#each eaters.filter((p) => p.requirements) as person (person.id)}
				<p class="hint">{person.name}: {person.requirements.replace(/\n+/g, ', ')}</p>
			{/each}
		{/if}
		{#if data.settings.menuRules}
			<p class="hint">{data.settings.menuRules.replace(/\n+/g, ' ')}</p>
		{/if}
		<a href={resolve('/hushallet')}>Ändra personer och regler</a>
		{#if !hasSuggestion && !suggesting}
			<m3e-form-field variant="filled">
				<label slot="label" for="wish">Något särskilt den här veckan? (frivilligt)</label>
				<input
					id="wish"
					autocomplete="off"
					bind:value={() => wish, (value) => (wishes[week.weekStart] = value)}
				/>
			</m3e-form-field>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
			<m3e-button variant="filled" disabled={busy || undefined} onclick={suggest}>
				<span slot="icon" class="slot-icon"><Icon name="suggest" /></span>Föreslå veckan
			</m3e-button>
		{/if}
	</section>

	{#if failed}
		<p class="error" role="alert">Det gick inte att spara. Kontrollera nätet och försök igen.</p>
	{/if}
	{#if suggestError?.weekStart === week.weekStart}
		<p class="error" role="alert">
			{#if suggestError.reason === 'limit'}
				Appen har föreslagit så mycket som månadens tak tillåter. Skriv in rätterna själv, eller
				vänta till nästa månad.
			{:else}
				Claude kunde inte föreslå något just nu. Skriv in rätterna själv, eller försök igen.
			{/if}
		</p>
	{/if}

	{#if suggesting}
		<div class="suggesting">
			<m3e-loading-indicator></m3e-loading-indicator>
			<p role="status">Claude sätter ihop veckan …</p>
			<p class="hint">Utgår från era gamla veckor och rätter. Brukar ta 10–20 sekunder.</p>
		</div>
	{:else}
		<h2 class="meal">Middag</h2>
		<ul class="days">
			{#each DAYS as weekday (weekday)}
				{@render row(weekday, 'dinner')}
			{/each}
		</ul>

		<div class="meal">
			<h2>Lunch</h2>
			{#if freeLunchDays.length}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button variant="text" onclick={() => (choosingLunch = !choosingLunch)}>
					<span slot="icon" class="slot-icon"><Icon name="add" /></span>Lunch en vardag
				</m3e-button>
			{/if}
		</div>
		{#if choosingLunch}
			<div class="quick" role="group" aria-label="Välj dag för lunch">
				{#each freeLunchDays as weekday (weekday)}
					<button type="button" class="chip" onclick={() => addLunch(weekday)}
						>{WEEKDAYS[weekday - 1]}</button
					>
				{/each}
			</div>
		{/if}
		<ul class="days">
			{#each lunchDays as weekday (weekday)}
				{@render row(weekday, 'lunch')}
			{/each}
		</ul>
	{/if}
</main>

{#key swapped}
	{#if swapped}
		<m3e-snackbar action="Ångra" duration="6000" open ontoggle={undoSwap}>
			{swapped.before.text} byttes mot {swapped.text}
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

	.eaters {
		padding: 1rem;
		border-radius: 1.75rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.eaters a {
		align-self: flex-start;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--md-sys-color-primary);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.hint {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.error {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.meal {
		margin: 0.5rem 0 0 0.25rem;
		min-height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.meal h2 {
		font-size: inherit;
	}

	.days {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row {
		border-radius: 0.25rem;
		background: var(--md-sys-color-surface-container);
		display: flex;
		align-items: center;
	}

	.row.swapped {
		background: var(--md-sys-color-primary-container);
	}

	.swap {
		flex-shrink: 0;
		margin-right: 0.25rem;
	}

	m3e-loading-indicator.swap {
		width: 3rem;
		height: 3rem;
	}

	.suggesting {
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.suggesting p {
		margin: 0;
	}

	.eaters m3e-button {
		align-self: flex-start;
	}

	m3e-form-field {
		width: 100%;
	}

	.row:first-child {
		border-top-left-radius: 1.25rem;
		border-top-right-radius: 1.25rem;
	}

	.row:last-child {
		border-bottom-left-radius: 1.25rem;
		border-bottom-right-radius: 1.25rem;
	}

	.show {
		flex-grow: 1;
		min-width: 0;
		min-height: 3.5rem;
		padding: 0.375rem 1rem 0.375rem 0.75rem;
		border: 0;
		border-radius: inherit;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.day {
		width: 2.25rem;
		flex-shrink: 0;
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--md-sys-color-primary);
	}

	.text {
		display: flex;
		flex-direction: column;
		font-size: 1rem;
	}

	.empty {
		color: var(--md-sys-color-on-surface-variant);
	}

	.meta {
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.editing {
		padding: 0.5rem 0.5rem 0.75rem 0.75rem;
		background: var(--md-sys-color-surface-container-high);
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: -2px;
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.line input {
		flex-grow: 1;
		min-width: 0;
		padding: 0.625rem 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 1rem;
		outline: none;
	}

	.suggestions {
		margin: 0;
		padding: 0;
		list-style: none;
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--md-sys-color-surface);
	}

	.suggestions li + li {
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.suggestions button {
		width: 100%;
		min-height: 3rem;
		padding: 0 1rem;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		cursor: pointer;
	}

	.suggestions .new {
		justify-content: flex-start;
		color: var(--md-sys-color-primary);
	}

	.quick {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		min-height: 2.25rem;
		padding: 0 0.875rem;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: 0.5rem;
		background: transparent;
		color: var(--md-sys-color-on-surface-variant);
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}
</style>
