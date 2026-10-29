<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DEFAULT_EATERS,
		DEFAULT_SERVINGS,
		portionsFor,
		scaleLine,
		stepMinutes
	} from '#lib/cooking.ts';
	import FoldCard from '#lib/FoldCard.svelte';
	import Icon from '#lib/Icon.svelte';
	import RecipeInvite from '#lib/RecipeInvite.svelte';
	import { plural } from '#lib/names.ts';
	import { hasOnlyName, LUNCHBOX_TAG, splitSteps } from '#lib/recipes.ts';
	import type { PageProps } from './$types';

	// Cooking the dish at the stove (#137): big text to read at arm's length, ingredients to tick
	// off, steps to mark done, timers, and the screen kept on.
	let { data }: PageProps = $props();
	let recipe = $derived(data.recipe);
	let onlyName = $derived(hasOnlyName(recipe));
	let steps = $derived(onlyName ? [] : splitSteps(recipe.instructions));
	let stepCount = $derived(steps.filter((s) => s.number).length);
	let minutes = $derived(steps.map((s) => (s.number ? stepMinutes(s.text) : null)));

	// The portions start as for the shopping list and change only for this time.
	let lunchbox = $derived(recipe.tags.includes(LUNCHBOX_TAG));
	let extra = $derived(lunchbox ? data.lunchboxExtra : 0);
	let chosen = $state<number | null>(null);
	let start = $derived(portionsFor({ eaters: data.eaters, lunchbox, extra }));
	let portions = $derived(chosen ?? start);
	let servings = $derived(recipe.servings ?? DEFAULT_SERVINGS);
	let lines = $derived(recipe.ingredients.map((line) => scaleLine(line, portions / servings)));
	let why = $derived(
		portions !== start
			? `Ändrat från ${start}.`
			: (data.eaters
					? `${data.eaters} äter`
					: `Ingen vald för veckan, så ${DEFAULT_EATERS} som på inköpslistan`) +
					(extra ? `, ${extra} till matlådor.` : '.')
	);
	let facts = $derived(
		[recipe.timeMinutes && `${recipe.timeMinutes} min`, `receptet är för ${servings}`]
			.filter(Boolean)
			.join(' · ')
	);

	// What is ticked off stays a few hours while the tab does, so a while in another app loses
	// nothing, but the next time the dish is cooked starts afresh. The ticks are by line, so they
	// go when the recipe is changed.
	type Ticks = { have: number[]; done: number[] };
	const KEEP = 6 * 60 * 60 * 1000;
	let ticks = $state<Ticks>({ have: [], done: [] });
	let storeKey = $derived(`laga-${recipe.id}`);
	let recipeText = $derived(JSON.stringify([recipe.ingredients, recipe.instructions]));
	$effect(() => {
		let stored: (Partial<Ticks> & { at?: number; of?: string }) | null = null;
		try {
			stored = JSON.parse(sessionStorage.getItem(storeKey) ?? 'null');
		} catch {
			// Nothing stored that can be read, so nothing is ticked.
		}
		const fresh = stored?.of === recipeText && Date.now() - (stored.at ?? 0) < KEEP;
		ticks = {
			have: fresh && Array.isArray(stored?.have) ? stored.have : [],
			done: fresh && Array.isArray(stored?.done) ? stored.done : []
		};
	});

	function tick(list: keyof Ticks, i: number, on: boolean) {
		ticks[list] = on ? [...ticks[list], i] : ticks[list].filter((t) => t !== i);
		try {
			sessionStorage.setItem(
				storeKey,
				JSON.stringify({ ...ticks, at: Date.now(), of: recipeText })
			);
		} catch {
			// Without storage the ticks last while the page is open.
		}
	}

	// The step to do now: the first one not done.
	let current = $derived(steps.findIndex((s, i) => s.number && !ticks.done.includes(i)));
	let stepNote = $derived(
		current >= 0 ? `Steg ${steps[current].number} av ${stepCount}` : 'Alla klara'
	);

	// Timers count down while the view is open, which the screen being kept on sees to.
	type Timer = { id: number; step: number; number: number; ends: number; rung: boolean };
	let timers = $state<Timer[]>([]);
	let now = $state(Date.now());
	let nextTimer = 0;
	let audio: AudioContext | null = null;

	function startTimer(step: number, minutes: number) {
		// Sound may only start after a tap, so it is made ready by the one that starts the timer.
		audio ??= typeof AudioContext === 'function' ? new AudioContext() : null;
		now = Date.now();
		const { number = 0 } = steps[step];
		timers.push({ id: nextTimer++, step, number, ends: now + minutes * 60_000, rung: false });
	}

	function ring(timer: Timer) {
		timer.rung = true;
		navigator.vibrate?.([400, 200, 400, 200, 400]);
		if (!audio) return;
		for (let i = 0; i < 3; i++) {
			const at = audio.currentTime + i * 0.4;
			const beep = audio.createOscillator();
			const gain = audio.createGain();
			beep.frequency.value = 880;
			gain.gain.setValueAtTime(0.3, at);
			gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
			beep.connect(gain).connect(audio.destination);
			beep.start(at);
			beep.stop(at + 0.25);
		}
	}

	// The clock only ticks while a timer still counts down.
	let counting = $derived(timers.some((t) => !t.rung));
	$effect(() => {
		if (!counting) return;
		const ticking = setInterval(() => {
			now = Date.now();
			for (const timer of timers) if (!timer.rung && timer.ends <= now) ring(timer);
		}, 500);
		return () => clearInterval(ticking);
	});

	const stopTimer = (id: number) => (timers = timers.filter((t) => t.id !== id));

	function left(timer: Timer) {
		const seconds = Math.max(0, Math.ceil((timer.ends - now) / 1000));
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	}

	// The screen is kept on from the start, where the browser can, and again on coming back to
	// the app, since the phone lets go of it when the app is left.
	let canWake = $state(false);
	let awake = $state(true);
	onMount(() => {
		canWake = 'wakeLock' in navigator;
		return () => audio?.close();
	});
	$effect(() => {
		if (!canWake || !awake) return;
		let lock: WakeLockSentinel | null = null;
		let gone = false;
		const take = () => {
			if (document.visibilityState !== 'visible') return;
			navigator.wakeLock.request('screen').then(
				(taken) => {
					if (gone) taken.release();
					else lock = taken;
				},
				() => {}
			);
		};
		take();
		document.addEventListener('visibilitychange', take);
		return () => {
			gone = true;
			document.removeEventListener('visibilitychange', take);
			lock?.release();
		};
	});
</script>

<svelte:head>
	<title>Laga {recipe.name} – Veckans mat</title>
</svelte:head>

<header class="warm-view">
	<m3e-icon-button href={data.back ?? `/ratter/${recipe.id}`} aria-label="Tillbaka">
		<Icon name="back" />
	</m3e-icon-button>
	{#if canWake}
		<m3e-button
			variant="tonal"
			size="small"
			toggle
			selected={awake || undefined}
			onchange={(e: Event & { currentTarget: HTMLElement & { selected: boolean } }) =>
				(awake = e.currentTarget.selected)}
		>
			<span slot="icon" class="slot-icon"><Icon name="awake" /></span>
			{awake ? 'Skärmen hålls tänd' : 'Håll skärmen tänd'}
		</m3e-button>
	{/if}
</header>

<main class:timing={timers.length > 0}>
	<div class="title">
		<p class="view-label">Laga{data.dayName ? ` · ${data.dayName}` : ''}</p>
		<h1>{recipe.name}</h1>
		{#if !onlyName}<p class="facts">{facts}</p>{/if}
	</div>

	{#if onlyName}
		<RecipeInvite
			recipeId={recipe.id}
			text={recipe.ingredients.length
				? 'Det finns inget recept till rätten än, bara ingredienserna Claude gissade till inköpslistan.'
				: 'Det finns inget recept till rätten än.'}
		/>
	{/if}

	{#if lines.length}
		<section class="card portions">
			<p>
				<strong>{plural(portions, 'portion', 'portioner')}</strong>
				<span>{why} Mängderna räknas om. Ändras bara den här gången.</span>
			</p>
			<div class="stepper">
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					variant="tonal"
					aria-label="Färre portioner"
					disabled={portions <= 1 || undefined}
					onclick={() => (chosen = Math.max(1, portions - 1))}
				>
					<Icon name="remove" />
				</m3e-icon-button>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
				<m3e-icon-button
					variant="tonal"
					aria-label="Fler portioner"
					onclick={() => (chosen = portions + 1)}
				>
					<Icon name="add" />
				</m3e-icon-button>
			</div>
		</section>

		<FoldCard
			title="Ingredienser"
			note={(recipe.ingredientsGuessed ? 'Gissade · ' : '') +
				`${ticks.have.length} av ${lines.length} framme`}
		>
			<ul class="lines">
				{#each lines as line, i (i)}
					{@const have = ticks.have.includes(i)}
					<li class:have>
						<!-- svelte-ignore a11y_label_has_associated_control (m3e-checkbox is the control; a tap anywhere on the row ticks it) -->
						<label>
							<m3e-checkbox
								aria-label={[line.amount, line.text].filter(Boolean).join(' ')}
								checked={have || undefined}
								onchange={(e: Event & { currentTarget: HTMLElement & { checked: boolean } }) =>
									tick('have', i, e.currentTarget.checked)}
							></m3e-checkbox>
							<span class="amount">{line.amount}</span>
							<span>{line.text}</span>
						</label>
					</li>
				{/each}
			</ul>
		</FoldCard>
	{/if}

	{#if steps.length}
		<FoldCard title="Gör så här" note={stepNote}>
			<ol class="steps">
				{#each steps as step, i (i)}
					{#if step.number}
						{@const done = ticks.done.includes(i)}
						{@const time = done ? null : minutes[i]}
						<li class:done class:current={i === current}>
							<button type="button" aria-pressed={done} onclick={() => tick('done', i, !done)}>
								<span class="number">
									{#if done}<Icon name="check" />{:else}{step.number}{/if}
								</span>
								<span class="text">{step.text}</span>
							</button>
							{#if time && !timers.some((t) => t.step === i)}
								<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
								<m3e-button
									class="start"
									variant={i === current ? 'filled' : 'tonal'}
									size="small"
									onclick={() => startTimer(i, time)}
								>
									<span slot="icon" class="slot-icon"><Icon name="timer" /></span>Starta {time}
									min
								</m3e-button>
							{/if}
						</li>
					{:else}
						<li class="part">{step.text}</li>
					{/if}
				{/each}
			</ol>
		</FoldCard>
		<p class="note">
			Tryck på ett steg när det är klart. Bockarna och stegen finns kvar om du byter app en stund.
		</p>
	{/if}
</main>

{#if timers.length}
	<div class="timers">
		{#each timers as timer (timer.id)}
			<div class={['timer', timer.rung && 'rung']} role="timer">
				<Icon name="timer" />
				<p>
					<strong>{timer.rung ? 'Klart!' : left(timer)}</strong>
					<span>Steg {timer.number}</span>
				</p>
				{#if timer.rung}<span class="visually-hidden" role="alert"
						>Timern för steg {timer.number} är klar</span
					>{/if}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-button is a button with its own keyboard handling) -->
				<m3e-button
					variant="tonal"
					aria-label="{timer.rung ? 'Stäng' : 'Stoppa'} timern för steg {timer.number}"
					onclick={() => stopTimer(timer.id)}>{timer.rung ? 'Stäng' : 'Stoppa'}</m3e-button
				>
			</div>
		{/each}
	</div>
{/if}

<style>
	header {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.5rem 0.75rem 0 0.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0.25rem 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Room for the timers, which float over the end of the page. */
	main.timing {
		padding-bottom: 8rem;
	}

	.title {
		margin: 0 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title p {
		margin: 0;
	}

	h1 {
		margin: 0;
		font-size: 1.875rem;
		line-height: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}

	.facts {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.portions {
		padding: 0.75rem 0.875rem 0.75rem 1.125rem;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.portions p {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.portions strong {
		font-size: 1rem;
	}

	.portions span {
		font-size: 0.8125rem;
		line-height: 1.125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.stepper {
		flex-shrink: 0;
		display: flex;
		gap: 0.25rem;
	}

	.lines {
		margin: 0;
		padding: 0 0 0.375rem;
		list-style: none;
		font-size: 1.0625rem;
	}

	.lines label {
		min-height: 3.25rem;
		padding: 0 0.75rem 0 0.375rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.have label {
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: line-through;
	}

	.amount {
		width: 4.75rem;
		flex-shrink: 0;
		font-weight: 600;
	}

	.steps {
		margin: 0;
		padding: 0 0.5rem 0.5rem;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.steps li {
		border-radius: 1.125rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.steps button {
		width: 100%;
		padding: 0.75rem 0.625rem;
		border: 0;
		border-radius: 1.125rem;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 1.0625rem;
		line-height: 1.5rem;
		text-align: left;
		display: flex;
		gap: 0.875rem;
		cursor: pointer;
	}

	.steps button:focus-visible {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: -2px;
	}

	.text {
		white-space: pre-line;
	}

	.number {
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		border-radius: 1rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		font-size: 0.9375rem;
		font-weight: 700;
		display: grid;
		place-items: center;
	}

	.number :global(svg) {
		width: 1.125rem;
		height: 1.125rem;
	}

	.current {
		padding-bottom: 0.75rem;
		background: var(--md-sys-color-primary-container);
	}

	.current button {
		font-size: 1.1875rem;
		font-weight: 500;
		line-height: 1.75rem;
	}

	.current .number {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
	}

	.done button {
		color: var(--md-sys-color-on-surface-variant);
	}

	.done .number {
		background: var(--app-fill);
		color: var(--md-sys-color-on-surface-variant);
	}

	.start {
		margin: 0 0 0.5rem 3.5rem;
	}

	.current .start {
		margin-bottom: 0;
	}

	.part {
		margin-top: 0.25rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.timers {
		position: fixed;
		left: 1rem;
		right: 1rem;
		bottom: calc(1.25rem + env(safe-area-inset-bottom));
		z-index: 3;
		max-width: 38rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.timer {
		min-height: 4rem;
		padding: 0 0.5rem 0 1.25rem;
		box-sizing: border-box;
		border-radius: 2rem;
		background: var(--md-sys-color-inverse-surface);
		color: var(--md-sys-color-inverse-on-surface);
		box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.timer :global(svg) {
		flex-shrink: 0;
		color: var(--md-sys-color-inverse-primary);
	}

	.timer p {
		flex: 1;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.timer strong {
		font-size: 1.375rem;
		font-variant-numeric: tabular-nums;
	}

	.timer p span {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.rung {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
	}

	.rung :global(svg) {
		color: inherit;
	}
</style>
