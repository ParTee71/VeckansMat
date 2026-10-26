<script lang="ts">
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';

	// A field for a new item that lies just above the keyboard. Enter adds the item and the field
	// stays for the next one; the cross, Escape or a tap elsewhere closes it.
	let { open = $bindable(false), onadd }: { open?: boolean; onadd: (text: string) => void } =
		$props();

	let draft = $state('');
	let input: HTMLInputElement | undefined = $state();
	let form: HTMLFormElement | undefined = $state();
	// How far up the keyboard reaches, which the page does not move for on every phone.
	let keyboard = $state(0);

	$effect(() => {
		if (!open) return;
		tick().then(() => input?.focus());
		const viewport = window.visualViewport;
		if (!viewport) return;
		const measure = () =>
			(keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
		measure();
		viewport.addEventListener('resize', measure);
		viewport.addEventListener('scroll', measure);
		return () => {
			viewport.removeEventListener('resize', measure);
			viewport.removeEventListener('scroll', measure);
			keyboard = 0;
		};
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const text = draft.trim();
		if (text) onadd(text);
		draft = '';
		input?.focus();
	}

	function leave(event: FocusEvent) {
		if (!form?.contains(event.relatedTarget as Node | null)) open = false;
	}
</script>

{#if open}
	<form
		bind:this={form}
		class="sheet"
		style:bottom="{keyboard}px"
		onsubmit={submit}
		onfocusout={leave}
	>
		<input
			bind:this={input}
			bind:value={draft}
			aria-label="Lägg till en vara"
			placeholder="Lägg till en vara"
			autocomplete="off"
			enterkeyhint="done"
			maxlength="200"
			onkeydown={(e) => e.key === 'Escape' && (open = false)}
		/>
		<button type="submit" aria-label="Lägg till"><Icon name="add" /></button>
		<button type="button" aria-label="Stäng" onclick={() => (open = false)}>
			<Icon name="close" />
		</button>
	</form>
{/if}

<style>
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		/* Over the floating menu and the plus button, which it stands in for while open. */
		z-index: 4;
		padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom)) 1rem;
		border-radius: 1.5rem 1.5rem 0 0;
		background: var(--app-card);
		box-shadow: 0 -4px 18px rgb(40 20 10 / 0.16);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	input {
		flex: 1;
		min-width: 0;
		height: 3rem;
		padding: 0 1rem;
		border: 0;
		border-radius: 1.5rem;
		background: var(--app-fill);
		color: inherit;
		font: inherit;
		font-size: 1rem;
		outline: none;
	}

	input:focus-visible {
		box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
	}

	button {
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--md-sys-color-on-surface-variant);
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	button[type='submit'] {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
	}

	button :global(svg) {
		width: 1.375rem;
	}
</style>
