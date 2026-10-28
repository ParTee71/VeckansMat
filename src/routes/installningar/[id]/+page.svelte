<script lang="ts">
	import { enhance } from '$app/forms';
	import FormHeader from '#lib/FormHeader.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// After a failed save the form shows what was written, not what is stored.
	let values = $derived(form?.values ?? data.person ?? { name: '', requirements: '' });
</script>

<svelte:head>
	<title>{data.person?.name ?? 'Ny person'} – Veckans mat</title>
</svelte:head>

<form method="POST" action="?/save" class="form-page" use:enhance>
	<FormHeader title={data.person?.name ?? 'Ny person'} back="/installningar" />

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	<m3e-form-field variant="filled">
		<label slot="label" for="name">Namn</label>
		<input id="name" name="name" required autocomplete="off" value={values.name} />
	</m3e-form-field>
	<m3e-form-field variant="filled">
		<label slot="label" for="requirements">Krav: allergier, kost, sådant hen inte äter</label>
		<textarea id="requirements" name="requirements" rows="4" value={values.requirements}></textarea>
		<m3e-textarea-autosize for="requirements"></m3e-textarea-autosize>
	</m3e-form-field>
	<p class="note">
		Gäller de veckor personen äter med. Allergier och det hen inte äter följer Claude alltid, det
		andra när det går.
	</p>
</form>

{#if data.person}
	<form method="POST" action="?/delete" class="form-page delete" use:enhance>
		<SubmitButton variant="text">Ta bort {data.person.name}</SubmitButton>
	</form>
{/if}

<style>
	.delete {
		align-items: center;
		--m3e-text-button-label-text-color: var(--md-sys-color-error);
		--m3e-text-button-hover-label-text-color: var(--md-sys-color-error);
	}
</style>
