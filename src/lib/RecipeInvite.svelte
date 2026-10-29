<script lang="ts">
	import Icon from './Icon.svelte';

	// For a dish with only a name: what there is of it, and the ways to get its recipe.
	let { recipeId, text }: { recipeId: number; text: string } = $props();
</script>

<section class="banner invite">
	<p>{text}</p>
	<div class="actions">
		<m3e-button variant="filled" href="/ratter/ny?till={recipeId}">
			<span slot="icon" class="slot-icon"><Icon name="camera" /></span>Hämta receptet
		</m3e-button>
		<m3e-button variant="text" href="/ratter/{recipeId}/redigera">Skriv in själv</m3e-button>
	</div>
</section>

<style>
	.invite {
		padding: 1rem 1rem 0.875rem;
		border-radius: 1.5rem;
		font-size: 0.9375rem;
		line-height: 1.3125rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	p {
		margin: 0;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	m3e-button[variant='text'] {
		--m3e-text-button-label-text-color: var(--md-sys-color-on-primary-container);
	}
</style>
