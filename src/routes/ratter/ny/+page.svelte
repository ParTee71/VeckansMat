<script lang="ts">
	import { enhance } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import FormHeader from '#lib/FormHeader.svelte';
	import Icon from '#lib/Icon.svelte';
	import RecipeFields from '#lib/RecipeFields.svelte';
	import SubmitButton from '#lib/SubmitButton.svelte';
	import { recipeUrl, siteName } from '#lib/links.ts';
	import { MAX_PHOTOS, shrinkPhoto } from '#lib/photos.ts';
	import { timesText } from '#lib/recipes.ts';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	// What is written in the field, starting over when the page does.
	let text = $derived(form?.text ?? data.link);
	let link = $derived(recipeUrl(text, true));

	// Photos stay on the phone, made smaller, until the form is sent.
	let photos: { file: File; url: string }[] = $state([]);
	let camera: HTMLInputElement | undefined = $state();
	let gallery: HTMLInputElement | undefined = $state();
	let tooMany = $state(false);
	// Photos being made smaller, which the form waits for.
	let shrinking = $state(0);

	async function addPhotos(event: Event & { currentTarget: HTMLInputElement }) {
		const files = [...(event.currentTarget.files ?? [])];
		event.currentTarget.value = '';
		tooMany = photos.length + files.length > MAX_PHOTOS;
		shrinking++;
		try {
			const small = await Promise.all(files.slice(0, MAX_PHOTOS - photos.length).map(shrinkPhoto));
			// Room is counted again, in case more were picked while these were made smaller.
			for (const file of small.slice(0, MAX_PHOTOS - photos.length)) {
				photos.push({ file, url: URL.createObjectURL(file) });
			}
		} finally {
			shrinking--;
		}
	}

	// The previews are let go when the page is left.
	$effect(() => () => {
		for (const photo of photos) URL.revokeObjectURL(photo.url);
	});

	function removePhoto(index: number) {
		URL.revokeObjectURL(photos[index].url);
		photos.splice(index, 1);
		tooMany = false;
	}

	let review = $derived(form && 'review' in form ? form.review : null);
	// The dish being filled in stays in the URL, also in the forms' actions, since the page
	// lands where a form is sent.
	let till = $derived(data.target ? `&till=${data.target.id}` : '');
	let restart = $derived(data.target ? `/ratter/ny?till=${data.target.id}` : '/ratter/ny');

	let reading = $state(false);
	const read: SubmitFunction = ({ formData, cancel }) => {
		// A photo still being made smaller would be left out.
		if (shrinking) return cancel();
		for (const photo of photos) formData.append('photo', photo.file);
		reading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			reading = false;
			if (result.type === 'success') {
				for (const photo of photos) URL.revokeObjectURL(photo.url);
				photos = [];
			}
		};
	};

	// A link from the search field on Rätter is read straight away.
	let readForm: HTMLFormElement | undefined = $state();
	// Coming back to the page shows the form, without reading the link again.
	afterNavigate(({ type }) => {
		if (data.link && type !== 'popstate') readForm?.requestSubmit();
	});

	function existingText(timesEaten: number) {
		const eaten = timesEaten ? ` och har ätits ${timesText(timesEaten)}` : '';
		return `Den har bara ett namn${eaten}. Spara fyller i den, så ligger veckorna kvar.`;
	}
</script>

<svelte:head>
	<title>Ny rätt – Veckans mat</title>
</svelte:head>

{#if review}
	<form method="POST" action="?/save{till}" class="form-page warm-view" use:enhance>
		<FormHeader title="Ny rätt" back={restart} backLabel="Börja om" />

		{#if review.existing}
			<section class="card notice">
				<strong>{review.existing.name} finns redan</strong>
				{#if review.existing.onlyName}
					<span>{existingText(review.existing.timesEaten)}</span>
				{:else}
					<span>
						Den har redan ingredienser eller steg. Byt namn för att spara den här som en ny rätt.
					</span>
					<a href={resolve('/ratter/[id]', { id: String(review.existing.id) })}
						>Öppna {review.existing.name}</a
					>
				{/if}
			</section>
		{:else if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{:else if review.target}
			<p class="banner done">
				<Icon name="check" />Fyller i {review.target.name}. Kolla att det stämmer och spara.
			</p>
		{:else if review.source}
			<p class="banner done">
				<Icon name="check" />{review.source}. Kolla att det stämmer och spara.
			</p>
		{/if}

		<RecipeFields values={review.values} lunchbox={review.lunchbox} />
	</form>
{:else}
	<form
		method="POST"
		action="?/read{till}"
		enctype="multipart/form-data"
		class="form-page warm-view"
		use:enhance={read}
		bind:this={readForm}
	>
		<FormHeader
			title="Ny rätt"
			back={data.target ? `/ratter/${data.target.id}` : '/ratter'}
			save={false}
		/>

		{#if reading}
			<div class="card reading">
				<m3e-loading-indicator></m3e-loading-indicator>
				<p role="status">Läser receptet …</p>
				<p class="muted">Det brukar ta några sekunder.</p>
			</div>
		{:else}
			{#if form?.readError}
				<p class="error" role="alert">{form.readError}</p>
			{/if}

			<section class="card">
				<p class="muted">
					{#if data.target}
						Klistra in en länk eller texten till receptet på {data.target.name}, eller fotografera
						det.
					{:else}
						Klistra in en länk eller texten till ett recept, eller fotografera det.
					{/if}
				</p>

				{#if photos.length}
					<div class="photos">
						{#each photos as photo, i (photo.url)}
							<div class="photo">
								<img src={photo.url} alt="Sida {i + 1}" />
								<button
									type="button"
									aria-label="Ta bort sida {i + 1}"
									onclick={() => removePhoto(i)}
								>
									<Icon name="close" />
								</button>
							</div>
						{/each}
						{#if photos.length < MAX_PHOTOS}
							<button type="button" class="another" onclick={() => camera?.click()}>
								<Icon name="add" />Ett till
							</button>
						{/if}
					</div>
					<p class="muted small">
						{tooMany
							? `Högst ${MAX_PHOTOS} bilder per recept.`
							: 'Flera foton läses som ett recept, till exempel två sidor ur en kokbok.'}
					</p>
				{/if}

				<m3e-form-field variant="filled" hide-subscript="always">
					<label slot="label" for="text">
						Länk eller recepttext{photos.length ? ' (frivilligt)' : ''}
					</label>
					<textarea id="text" name="text" rows={photos.length ? 2 : 5} bind:value={text}></textarea>
					<m3e-textarea-autosize for="text"></m3e-textarea-autosize>
				</m3e-form-field>

				{#if link && !photos.length}
					<p class="muted small with-icon"><Icon name="link" />En länk till {siteName(link)}</p>
				{/if}
			</section>

			{#if !photos.length}
				<div class="pick">
					<button type="button" class="card" onclick={() => camera?.click()}>
						<span class="pick-icon"><Icon name="camera" /></span>Ta foto
					</button>
					<button type="button" class="card" onclick={() => gallery?.click()}>
						<span class="pick-icon round"><Icon name="image" /></span>Välj bilder
					</button>
				</div>
			{/if}
			<input
				bind:this={camera}
				type="file"
				accept="image/*"
				capture="environment"
				hidden
				onchange={addPhotos}
			/>
			<input
				bind:this={gallery}
				type="file"
				accept="image/*"
				multiple
				hidden
				onchange={addPhotos}
			/>

			{#if shrinking}
				<p class="muted small" role="status">Gör bilderna mindre …</p>
			{/if}
			<SubmitButton variant="filled" size="medium">Läs in receptet</SubmitButton>
		{/if}
	</form>

	<!-- After a read that failed, rather than one that was sent wrong. -->
	{#if !reading && form?.kind}
		<form method="POST" action="?/fillIn{till}" use:enhance class="form-page fill-in">
			<input type="hidden" name="text" value={form.text} />
			<SubmitButton variant="text">
				{form.kind === 'link' ? 'Fyll i själv, med länken sparad' : 'Fyll i själv'}
			</SubmitButton>
		</form>
	{/if}
{/if}

<style>
	.muted {
		margin: 0 0.125rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.small {
		font-size: 0.875rem;
	}

	.with-icon {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.with-icon :global(svg) {
		width: 1.125rem;
		color: var(--md-sys-color-primary);
	}

	.pick,
	.photos {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.625rem;
	}

	.photos {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.pick button {
		min-height: 4.75rem;
		padding: 0.5rem;
		border: 0;
		border-radius: 1.25rem;
		color: var(--md-sys-color-on-surface);
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		cursor: pointer;
	}

	.pick button:focus-visible {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: 2px;
	}

	.pick-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.625rem;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		display: grid;
		place-items: center;
	}

	.pick-icon.round {
		border-radius: 50%;
	}

	.pick-icon :global(svg) {
		width: 1.125rem;
		height: 1.125rem;
	}

	.photo,
	.another {
		aspect-ratio: 3 / 4;
		border-radius: 0.75rem;
	}

	.photo {
		position: relative;
		overflow: hidden;
		background: var(--md-sys-color-surface-container-highest);
	}

	.photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.photo button {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		width: 2rem;
		height: 2rem;
		padding: 0.25rem;
		border: 0;
		border-radius: 1rem;
		background: rgb(0 0 0 / 0.6);
		color: #fff;
	}

	.photo button :global(svg) {
		width: 1.5rem;
		height: 1.5rem;
	}

	.another {
		border: 2px dashed var(--md-sys-color-outline-variant);
		background: transparent;
		color: var(--md-sys-color-primary);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
	}

	.fill-in {
		padding-top: 0;
		align-items: center;
	}

	.reading {
		padding: 4rem 1.5rem;
		align-items: center;
		gap: 0.625rem;
		text-align: center;
	}

	.reading p[role='status'] {
		margin: 0.625rem 0 0;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.done {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
	}

	.done :global(svg) {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.notice {
		gap: 0.375rem;
	}

	.notice span {
		color: var(--md-sys-color-on-surface-variant);
	}

	.notice a {
		color: var(--md-sys-color-primary);
	}
</style>
