<script lang="ts">
	import Icon from './Icon.svelte';
	import { BASES, CATEGORIES } from './recipes';

	// The fields of a recipe, shared by the form that edits one and the one that adds one. Only the
	// form that edits one has the sort and base, with a word on whether Claude guessed them.
	let {
		values,
		lunchbox,
		sort
	}: { values: Record<string, string>; lunchbox: boolean; sort?: { guessed: boolean } } = $props();
</script>

<section class="card">
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" for="name">Namn</label>
		<input id="name" name="name" required value={values.name} />
	</m3e-form-field>
	{#if sort}
		{#each [{ name: 'category', legend: 'Sort', choices: CATEGORIES }, { name: 'base', legend: 'Bas', choices: BASES }] as group (group.name)}
			<fieldset aria-describedby="sort-hint">
				<legend>{group.legend}</legend>
				<div class="choices">
					{#each group.choices as choice (choice.key)}
						<label class="chip">
							<input
								type="radio"
								name={group.name}
								value={choice.key}
								checked={values[group.name] === choice.key}
							/>
							<span class="check"><Icon name="check" /></span>{choice.label}
						</label>
					{/each}
				</div>
			</fieldset>
		{/each}
		<p class="hint" id="sort-hint">
			{sort.guessed
				? 'Claude gissade sort och bas. Välj något annat om det blev fel.'
				: 'Det du väljer här ändrar Claude aldrig.'}
		</p>
	{/if}
</section>
<section class="card pair">
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" for="servings">Portioner</label>
		<input id="servings" name="servings" inputmode="numeric" value={values.servings} />
	</m3e-form-field>
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" for="timeMinutes">Tid i minuter</label>
		<input id="timeMinutes" name="timeMinutes" inputmode="numeric" value={values.timeMinutes} />
	</m3e-form-field>
</section>
<!-- The heading is part of the field's name, so a screen reader says what the field is for. -->
<section class="card">
	<h2 id="ingredients-heading">Ingredienser</h2>
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" id="ingredients-label" for="ingredients">En per rad</label>
		<textarea
			id="ingredients"
			name="ingredients"
			rows="4"
			aria-labelledby="ingredients-heading ingredients-label"
			value={values.ingredients}></textarea>
		<m3e-textarea-autosize for="ingredients"></m3e-textarea-autosize>
	</m3e-form-field>
</section>
<section class="card">
	<h2 id="instructions-heading">Gör så här</h2>
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" id="instructions-label" for="instructions"
			>Ett steg per rad eller stycke</label
		>
		<textarea
			id="instructions"
			name="instructions"
			rows="3"
			aria-labelledby="instructions-heading instructions-label"
			value={values.instructions}></textarea>
		<m3e-textarea-autosize for="instructions"></m3e-textarea-autosize>
	</m3e-form-field>
</section>
<section class="card">
	<h2>Mer</h2>
	<div class="switch">
		<label for="lunchbox">Passar till matlådor</label>
		<m3e-switch id="lunchbox" name="lunchbox" checked={lunchbox || undefined}></m3e-switch>
	</div>
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" for="tags">Taggar, med komma emellan</label>
		<input id="tags" name="tags" value={values.tags} />
	</m3e-form-field>
	<m3e-form-field variant="filled" hide-subscript="always">
		<label slot="label" for="sourceUrl">Länk till receptet</label>
		<input id="sourceUrl" name="sourceUrl" type="url" value={values.sourceUrl} />
	</m3e-form-field>
</section>

<style>
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	h2 {
		font-size: 0.875rem;
	}

	legend {
		margin-bottom: 0.5rem;
		padding: 0;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant);
	}

	.choices {
		gap: 0.375rem;
	}

	.chip {
		min-height: 2.125rem;
		padding: 0 0.8125rem;
		border-color: var(--md-sys-color-outline-variant);
		border-radius: 0.625rem;
		color: var(--md-sys-color-on-surface-variant);
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.chip input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}

	.chip:has(:checked) {
		border-color: var(--md-sys-color-primary-container);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.chip:has(:focus-visible) {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: 2px;
	}

	.check {
		display: none;
	}

	.chip:has(:checked) .check {
		display: inline-flex;
	}

	.check :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.hint {
		font-size: 0.75rem;
		line-height: 1rem;
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.switch {
		min-height: 3rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
