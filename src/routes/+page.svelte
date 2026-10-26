<script lang="ts">
	import type { ActionResult } from '$app/forms';
	import type { M3eDialogElement } from '@m3e/web/dialog';
	import type { M3eSnackbarElement } from '@m3e/web/snackbar';
	import { postAction, type Fields } from '#lib/actions.ts';
	import DayEditor from '#lib/DayEditor.svelte';
	import Icon from '#lib/Icon.svelte';
	import MenuCard from '#lib/MenuCard.svelte';
	import MenuLine from '#lib/MenuLine.svelte';
	import WeekHeader from '#lib/WeekHeader.svelte';
	import WhoEats from '#lib/WhoEats.svelte';
	import { plural } from '#lib/names.ts';
	import { MEAL_LABELS } from '#lib/recipes.ts';
	import type { Meal, RowInput, Week } from '#lib/server/db/menus.ts';
	import type { RecipeSummary } from '#lib/server/db/recipes.ts';
	import {
		WEEK_DAYS,
		WEEKDAY_NAMES,
		WEEKDAYS,
		dayList,
		hasLunch,
		isoWeek,
		weekDates
	} from '#lib/weeks.ts';
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
	// Days written by hand, which a new suggestion keeps unless the whole week is asked for.
	let byHand = $derived(dayList(week.rows.filter((r) => r.reason === null)));
	// The question before a week that has a menu is suggested again.
	let asking = $state(false);

	const keyOf = (weekday: number, meal: Meal) => `${week.weekStart}-${meal}-${weekday}`;
	const stored = (weekday: number, meal: Meal) =>
		week.rows.find((r) => r.weekday === weekday && r.meal === meal);
	const textOf = (weekday: number, meal: Meal) =>
		pending[keyOf(weekday, meal)] ?? stored(weekday, meal)?.text ?? '';

	let lunchDays = $derived(
		WEEK_DAYS.filter((d) =>
			hasLunch(
				d,
				!!(stored(d, 'lunch') || textOf(d, 'lunch') || addedLunches[week.weekStart]?.includes(d))
			)
		)
	);
	let freeLunchDays = $derived(WEEK_DAYS.filter((d) => !lunchDays.includes(d)));

	let extra = $derived(data.settings.lunchboxExtraPortions);

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

	async function suggest(wholeWeek = false) {
		editing = null;
		const weekStart = week.weekStart;
		suggestingWeeks[weekStart] = true;
		await postSuggest('suggest', { wish, eaters: eaterIds, wholeWeek: String(wholeWeek) });
		delete suggestingWeeks[weekStart];
	}

	// A week with nothing in it is suggested at once; otherwise the dialog asks first.
	function askSuggest() {
		if (week.rows.length) asking = true;
		else suggest();
	}

	function onAnswer(event: Event & { currentTarget: M3eDialogElement }) {
		const dialog = event.currentTarget;
		const answer = dialog.returnValue;
		dialog.returnValue = '';
		asking = false;
		if (answer) suggest(answer === 'week');
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
		const days = meal === 'dinner' ? WEEK_DAYS : lunchDays;
		const next = days[days.indexOf(weekday) + 1];
		if (next) edit(next, meal);
	}

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
</script>

<svelte:head>
	<title>Veckan – Veckans mat</title>
</svelte:head>

{#snippet line(weekday: number, meal: Meal)}
	{@const name = `${MEAL_LABELS[meal]} ${WEEKDAY_NAMES[weekday - 1]}`}
	{@const label = meal === 'lunch' ? MEAL_LABELS.lunch : ''}
	{#if editing === keyOf(weekday, meal)}
		<DayEditor
			{label}
			{name}
			bind:draft
			{recipes}
			onwrite={(text) => write(weekday, meal, text)}
			onleave={() => editing === keyOf(weekday, meal) && write(weekday, meal, draft)}
			onkeydown={(e) => keydown(e, weekday, meal)}
		/>
	{:else}
		{@const text = textOf(weekday, meal)}
		{@const current = stored(weekday, meal)}
		{@const saved = current && text === current.text ? current : null}
		<MenuLine
			{name}
			{label}
			{text}
			meta={saved ? metaText(saved) : ''}
			swapped={swapped?.key === keyOf(weekday, meal)}
			swap={!saved?.reason
				? undefined
				: swapping === keyOf(weekday, meal)
					? 'swapping'
					: busy
						? 'busy'
						: 'ready'}
			onedit={() => edit(weekday, meal)}
			onswap={() => swap(weekday, meal)}
		/>
	{/if}
{/snippet}

<main class="page warm-view">
	<WeekHeader weekStart={week.weekStart} thisWeek={data.thisWeek} nextWeek={data.nextWeek}>
		{#snippet actions()}
			{#if hasSuggestion}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					aria-label="Nytt förslag på hela veckan"
					disabled={busy || undefined}
					onclick={askSuggest}
				>
					<Icon name="suggest" />
				</m3e-icon-button>
			{/if}
		{/snippet}
	</WeekHeader>

	{#if !hasSuggestion && !suggesting}
		<section class="card">
			<m3e-form-field variant="filled">
				<label slot="label" for="wish">Något särskilt den här veckan? (frivilligt)</label>
				<input
					id="wish"
					autocomplete="off"
					bind:value={() => wish, (value) => (wishes[week.weekStart] = value)}
				/>
			</m3e-form-field>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
			<m3e-button
				class="suggest"
				variant="filled"
				disabled={busy || undefined}
				onclick={askSuggest}
			>
				<span slot="icon" class="slot-icon"><Icon name="suggest" /></span>Föreslå veckan
			</m3e-button>
		</section>
	{/if}

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

	<MenuCard dates={weekDates(week.weekStart)}>
		{#snippet eaters()}
			<WhoEats
				people={data.people}
				{eaterIds}
				rules={data.settings.menuRules}
				ontoggle={toggleEater}
			/>
		{/snippet}
		{#if suggesting}
			<div class="suggesting">
				<m3e-loading-indicator></m3e-loading-indicator>
				<p role="status">Claude sätter ihop veckan …</p>
				<p class="hint">Utgår från era gamla veckor och rätter. Brukar ta 10–20 sekunder.</p>
			</div>
		{:else}
			<ol class="days">
				{#each WEEK_DAYS as weekday (weekday)}
					<li>
						<span class="day ink" aria-hidden="true">{WEEKDAYS[weekday - 1]}</span>
						<div class="meals">
							{@render line(weekday, 'dinner')}
							{#if lunchDays.includes(weekday)}
								{@render line(weekday, 'lunch')}
							{/if}
						</div>
					</li>
				{/each}
			</ol>
			{#if freeLunchDays.length}
				<div class="add-lunch">
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
					<m3e-button variant="text" onclick={() => (choosingLunch = !choosingLunch)}>
						<span slot="icon" class="slot-icon"><Icon name="add" /></span>Lunch en vardag
					</m3e-button>
					{#if choosingLunch}
						<div class="choices" role="group" aria-label="Välj dag för lunch">
							{#each freeLunchDays as weekday (weekday)}
								<button type="button" class="chip" onclick={() => addLunch(weekday)}
									>{WEEKDAYS[weekday - 1]}</button
								>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</MenuCard>
</main>

<m3e-dialog open={asking || undefined} onclosed={onAnswer}>
	<span slot="header" class="dialog-header">
		{hasSuggestion ? 'Föreslå veckan igen?' : 'Föreslå veckan?'}<Icon name="suggest" />
	</span>
	{#if byHand}
		Du har skrivit in {byHand} själv. Ska Claude {hasSuggestion
			? 'byta bara sina rätter, eller hela veckan'
			: 'fylla i resten, eller föreslå hela veckan'}?
	{:else}
		Claudes rätter för vecka {isoWeek(week.weekStart).week} byts mot nya förslag.
	{/if}
	<div slot="actions" class="dialog-actions">
		{#if byHand}
			<m3e-button>
				<m3e-dialog-action return-value="rest">
					{hasSuggestion ? 'Bara Claudes rätter' : 'Fyll i resten'}
				</m3e-dialog-action>
			</m3e-button>
		{/if}
		<m3e-button>
			<m3e-dialog-action return-value="week"
				>{byHand ? 'Hela veckan' : 'Föreslå igen'}</m3e-dialog-action
			>
		</m3e-button>
		<m3e-button><m3e-dialog-action>Avbryt</m3e-dialog-action></m3e-button>
	</div>
</m3e-dialog>

{#key swapped}
	{#if swapped}
		<m3e-snackbar action="Ångra" duration="6000" open ontoggle={undoSwap}>
			{swapped.before.text} byttes mot {swapped.text}
		</m3e-snackbar>
	{/if}
{/key}

<style>
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		color: var(--md-sys-color-on-surface);
	}

	.dialog-header :global(svg) {
		flex-shrink: 0;
		color: var(--md-sys-color-primary);
	}

	.dialog-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.suggest {
		align-self: flex-start;
	}

	.suggesting {
		padding: 2rem 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.suggesting p {
		margin: 0;
	}

	.days {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.days li {
		padding: 0.25rem 0;
		border-bottom: 1px dotted var(--menu-rule);
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.day {
		width: 2.5rem;
		flex-shrink: 0;
		padding-top: 0.75rem;
		font-family: var(--menu-hand);
		font-size: 1.375rem;
		font-weight: 700;
		line-height: 1;
		color: var(--md-sys-color-primary);
	}

	.meals {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.add-lunch {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
</style>
