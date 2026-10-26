import { getContext, onDestroy, setContext, type Snippet } from 'svelte';

// The plus button at the bottom right, beside the floating menu. The layout shows it, so it sits in
// the same place in every view, and a view fills it with its main action (#86).

const key = Symbol('fab');

type Slot = { current?: Snippet };

/** Called by the layout, which renders `current` where the plus button goes. */
export function provideFab(): Slot {
	const slot = $state<Slot>({});
	setContext(key, slot);
	return slot;
}

/** Called by a view with a snippet holding its `m3e-fab`, which shows while the view is open. */
export function useFab(snippet: Snippet) {
	const slot = getContext<Slot>(key);
	slot.current = snippet;
	// The next view may already have put its own button there.
	onDestroy(() => {
		if (slot.current === snippet) slot.current = undefined;
	});
}
