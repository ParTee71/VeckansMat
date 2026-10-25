<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// After a failed save the form shows what was written, not what is stored.
	let values = $derived(form?.values ?? data.person ?? { name: '', requirements: '' });
</script>

<svelte:head>
	<title>{data.person?.name ?? 'Ny person'} – Veckans mat</title>
</svelte:head>

<form method="POST" action="?/save" use:enhance>
	<header>
		<m3e-icon-button variant="tonal" href="/hushallet" aria-label="Avbryt">
			<Icon name="close" />
		</m3e-icon-button>
		<h1>{data.person?.name ?? 'Ny person'}</h1>
		<SubmitButton variant="filled">Spara</SubmitButton>
	</header>

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
	<p class="hint">
		Gäller de veckor personen äter med. Allergier och det hen inte äter följer Claude alltid, det
		andra när det går.
	</p>
</form>

{#if data.person}
	<form method="POST" action="?/delete" use:enhance class="delete">
		<SubmitButton variant="text">Ta bort {data.person.name}</SubmitButton>
	</form>
{/if}

<style>
	form {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	header {
		margin: 0 -0.5rem;
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		font-size: 1.375rem;
		font-weight: 700;
	}

	m3e-form-field {
		width: 100%;
	}

	.hint {
		margin: 0 0.25rem;
		font-size: 0.8125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.error {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.delete {
		align-items: center;
		--m3e-text-button-label-text-color: var(--md-sys-color-error);
		--m3e-text-button-hover-label-text-color: var(--md-sys-color-error);
	}
</style>
