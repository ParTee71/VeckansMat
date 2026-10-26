<script lang="ts">
	import Icon from './Icon.svelte';
	import { byOften, isDish, matching, MEAL_LABELS, NOT_DISHES, timesText } from './recipes.ts';
	import { nameKey } from './names.ts';
	import type { RecipeSummary } from './server/db/recipes.ts';

	// A dinner or a lunch on the menu being written, as on the note: the dishes that match what is
	// written, a new dish, and the quick choices that are not dishes. The text stands where the
	// shown dish stood, in the same hand, so the line does not jump.
	let {
		lunch = false,
		name,
		draft = $bindable(),
		recipes,
		onwrite,
		onleave,
		onkeydown
	}: {
		lunch?: boolean;
		/** The day and the meal, for the field. */
		name: string;
		draft: string;
		recipes: RecipeSummary[];
		/** Writes the day with the text. */
		onwrite: (text: string) => void;
		/** Focus left the day. */
		onleave: () => void;
		onkeydown: (event: KeyboardEvent) => void;
	} = $props();

	// The most eaten first.
	let matches = $derived(
		nameKey(draft) ? matching(recipes, draft).toSorted(byOften).slice(0, 5) : []
	);
	let isNew = $derived(
		nameKey(draft) && isDish(draft) && !recipes.some((r) => nameKey(r.name) === nameKey(draft))
	);

	// The text field loses focus when a suggestion is tapped, so suggestions keep it.
	const keepFocus = (event: Event) => event.preventDefault();
	const focus = (input: HTMLInputElement) => input.focus();
</script>

<!-- Leaving the day writes it; moving within it, as to a suggestion with Tab, does not. -->
<div
	class={['editing', lunch && 'lunch']}
	onfocusout={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && onleave()}
>
	<div class="line">
		{#if lunch}<span class="label">{MEAL_LABELS.lunch}</span>{/if}
		<input
			aria-label={name}
			autocomplete="off"
			enterkeyhint="next"
			bind:value={draft}
			{onkeydown}
			{@attach focus}
		/>
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (m3e-icon-button is a button with its own keyboard handling) -->
		<m3e-icon-button aria-label="Töm raden" onpointerdown={keepFocus} onclick={() => onwrite('')}>
			<Icon name="close" />
		</m3e-icon-button>
	</div>
	{#if matches.length || isNew}
		<ul class="suggestions">
			{#each matches as recipe (recipe.id)}
				<li>
					<button type="button" onpointerdown={keepFocus} onclick={() => onwrite(recipe.name)}>
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
						onclick={() => onwrite(draft)}
					>
						<Icon name="add" />Ny rätt: ”{draft.trim()}”
					</button>
				</li>
			{/if}
		</ul>
	{/if}
	<div class="choices">
		{#each NOT_DISHES as other (other)}
			<button type="button" class="chip" onpointerdown={keepFocus} onclick={() => onwrite(other)}
				>{other}</button
			>
		{/each}
	</div>
</div>

<style>
	.editing {
		padding-bottom: 0.5rem;
		border-radius: 0.5rem;
		background: var(--menu-chip);
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: -2px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.lunch {
		--menu-dish-size: 1rem;
	}

	.line {
		display: flex;
		align-items: flex-start;
	}

	.label {
		padding: var(--menu-line-padding);
		padding-right: 0.125rem;
		font-size: 0.75rem;
		line-height: calc(var(--menu-dish-size) * 1.3);
		color: var(--md-sys-color-on-surface-variant);
	}

	.line input {
		flex-grow: 1;
		min-width: 0;
		padding: var(--menu-line-padding);
		border: 0;
		background: transparent;
		color: inherit;
		font-family: var(--menu-script);
		font-size: var(--menu-dish-size);
		line-height: 1.3;
		outline: none;
	}

	.line m3e-icon-button {
		margin-top: 0.125rem;
	}

	.choices {
		padding: 0 0.5rem;
	}

	.suggestions {
		margin: 0 0.5rem;
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
</style>
