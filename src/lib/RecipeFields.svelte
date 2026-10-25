<script lang="ts">
	// The fields of a recipe, shared by the form that edits one and the one that adds one.
	let { values, lunchbox }: { values: Record<string, string>; lunchbox: boolean } = $props();
</script>

<m3e-form-field variant="filled">
	<label slot="label" for="name">Namn</label>
	<input id="name" name="name" required value={values.name} />
</m3e-form-field>
<div class="pair">
	<m3e-form-field variant="filled">
		<label slot="label" for="servings">Portioner</label>
		<input id="servings" name="servings" inputmode="numeric" value={values.servings} />
	</m3e-form-field>
	<m3e-form-field variant="filled">
		<label slot="label" for="timeMinutes">Tid i minuter</label>
		<input id="timeMinutes" name="timeMinutes" inputmode="numeric" value={values.timeMinutes} />
	</m3e-form-field>
</div>
<m3e-form-field variant="filled">
	<label slot="label" for="ingredients">Ingredienser, en per rad</label>
	<textarea id="ingredients" name="ingredients" rows="4" value={values.ingredients}></textarea>
	<m3e-textarea-autosize for="ingredients"></m3e-textarea-autosize>
</m3e-form-field>
<m3e-form-field variant="filled">
	<label slot="label" for="instructions">Gör så här</label>
	<textarea id="instructions" name="instructions" rows="3" value={values.instructions}></textarea>
	<m3e-textarea-autosize for="instructions"></m3e-textarea-autosize>
</m3e-form-field>
<div class="switch">
	<label for="lunchbox">Passar till matlådor</label>
	<m3e-switch id="lunchbox" name="lunchbox" checked={lunchbox || undefined}></m3e-switch>
</div>
<m3e-form-field variant="filled">
	<label slot="label" for="tags">Taggar, med komma emellan</label>
	<input id="tags" name="tags" value={values.tags} />
</m3e-form-field>
<m3e-form-field variant="filled">
	<label slot="label" for="sourceUrl">Länk till receptet</label>
	<input id="sourceUrl" name="sourceUrl" type="url" value={values.sourceUrl} />
</m3e-form-field>

<style>
	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.switch {
		min-height: 3.5rem;
		padding: 0 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-surface-container-highest);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
