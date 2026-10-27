<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import Initial from '#lib/Initial.svelte';
	import { LUNCHBOX_EXTRA_CHOICES, MAX_NEW_DISHES, MAX_REPEAT_WEEKS } from '#lib/household.ts';
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
</script>

<svelte:head>
	<title>Hushållet – Veckans mat</title>
</svelte:head>

<header>
	<m3e-icon-button variant="tonal" href="/" aria-label="Tillbaka">
		<Icon name="back" />
	</m3e-icon-button>
	<h1>Hushållet</h1>
</header>

<main>
	<h2>Personer</h2>
	{#if data.people.length === 0}
		<p class="note">Inga personer än. Lägg till de som brukar äta, med det de inte äter.</p>
	{:else}
		<m3e-list variant="segmented">
			{#each data.people as person, i (person.id)}
				<m3e-list-action href="/hushallet/{person.id}">
					<Initial name={person.name} index={i} />
					{person.name}
					<span slot="supporting-text">{person.requirements.split('\n')[0] || 'Inga krav'}</span>
				</m3e-list-action>
			{/each}
		</m3e-list>
	{/if}
	<m3e-button variant="tonal" href="/hushallet/ny" class="add">
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
</main>

<style>
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

	output {
		width: 1.75rem;
		text-align: center;
		font-size: 1.125rem;
		font-weight: 700;
	}
</style>
