<script lang="ts">
	import Icon from './Icon.svelte';
	import { byOften, isDish, matching, NOT_DISHES, timesText } from './recipes.ts';
	import { nameKey } from './names.ts';
	import type { RecipeSummary } from './server/db/recipes.ts';

	// A day on Veckan being written, as on the note: the dishes that match what is written, a new
	// dish, and the quick choices that are not dishes.
	let {
		label,
		name,
		draft = $bindable(),
		recipes,
		onwrite,
		onleave,
		onkeydown
	}: {
		/** The day, as at the start of the row. */
		label: string;
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
<li
	class="segment editing"
	onfocusout={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && onleave()}
>
	<div class="line">
		<span class="weekday">{label}</span>
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
</li>

<style>
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
</style>
