import type { Attachment } from 'svelte/attachments';

// Swiping sideways on a main view moves to the one next to it in the menu (#105). The page
// follows the finger, and the next view slides in from the side the finger moved towards.

export type Direction = 'next' | 'previous';

/** How far a finger moves before it counts as a swipe or a scroll, in pixels. */
const SLOP = 12;
/** Near the sides of the screen the phone has its own back gesture, in pixels. */
const EDGE = 24;
/** How long the page takes to slide out and in, in milliseconds. */
const SLIDE = 140;

/** Whether a finger that has moved by dx, dy swipes sideways, scrolls, or is not clear yet. */
export function heading(dx: number, dy: number): 'sideways' | 'scroll' | null {
	if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy) * 1.5) return 'sideways';
	if (Math.abs(dy) > SLOP) return 'scroll';
	return null;
}

/** Where a swipe that let go after dx pixels in ms milliseconds goes, on a screen width wide. */
export function outcome(dx: number, ms: number, width: number): Direction | null {
	const far = Math.abs(dx) > width / 3;
	const fast = Math.abs(dx) > 30 && Math.abs(dx) / Math.max(ms, 1) > 0.5;
	if (!far && !fast) return null;
	return dx < 0 ? 'next' : 'previous';
}

/** The path next to `current` in `paths` in that direction, or null at the ends. */
export function neighbour<P extends string>(
	paths: readonly P[],
	current: string,
	direction: Direction
): P | null {
	const at = (paths as readonly string[]).indexOf(current);
	if (at < 0) return null;
	return paths[at + (direction === 'next' ? 1 : -1)] ?? null;
}

/** Whether a finger that comes down on `path` (from event.composedPath()) is for something else. */
function taken(path: EventTarget[], x: number): boolean {
	if (x < EDGE || x > window.innerWidth - EDGE) return true;
	// Zoomed in, a finger moves the zoomed page.
	if ((window.visualViewport?.scale ?? 1) > 1) return true;
	// Writing or selecting text, also in a field inside a component.
	let active = document.activeElement;
	while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
	if (active?.matches('input, textarea, [contenteditable]')) return true;
	if (document.getSelection()?.isCollapsed === false) return true;
	return path.some(
		(target) =>
			target instanceof HTMLElement &&
			(target.matches('m3e-bottom-sheet, dialog, [popover], input, textarea') ||
				(target.scrollWidth > target.clientWidth &&
					/auto|scroll/.test(getComputedStyle(target).overflowX)))
	);
}

/**
 * Lets a sideways swipe on the element move to `to(direction)`, a path or null at the ends.
 * Something with a swipe of its own to the left, like an item on the shopping list, is marked
 * `data-own-swipe="left"`, and only a swipe to the right starts on it.
 *
 * Touch events rather than pointer events: the browser cancels a pointer as soon as it starts to
 * scroll anything under the finger, such as a list that scrolls on its own, but a touch it keeps.
 * A sideways move stops the scroll instead, so the page needs no touch-action.
 */
export function swipeNav<P extends string>(
	to: (direction: Direction) => P | null,
	go: (path: P) => Promise<unknown>,
	preload: (path: P) => void
): Attachment<HTMLElement> {
	return (node) => {
		const still = matchMedia('(prefers-reduced-motion: reduce)');
		// The finger on the page, from where it came down and how far it has moved since; null
		// while it scrolls, or when it is lifted.
		let touch: {
			x: number;
			y: number;
			t: number;
			ownLeft: boolean;
			swiping: boolean;
			dx: number;
			next: P | null;
			previous: P | null;
		} | null = null;
		// Until the next view has slid in, a new swipe would start from the old one.
		let sliding = false;

		/** How the page looks moved x pixels to the side: a little faded the further it goes. */
		const at = (x: number) => ({
			transform: x ? `translateX(${x}px)` : '',
			opacity: x ? String(1 - Math.min(Math.abs(x) / window.innerWidth, 1) * 0.35) : ''
		});

		function place(x: number) {
			if (!still.matches) Object.assign(node.style, at(x));
		}

		/** Slides the page from `from` to `until`, where it stays. */
		async function slide(from: number, until: number) {
			place(until);
			if (still.matches) return;
			const frames = [at(from), at(until)].map((f) => ({
				transform: f.transform || 'none',
				opacity: f.opacity || '1'
			}));
			// Cancelled when the page goes, which is fine.
			await node.animate(frames, { duration: SLIDE, easing: 'ease-out' }).finished.catch(() => {});
		}

		function start(event: TouchEvent) {
			if (touch || event.touches.length > 1) return cancel();
			const [finger] = event.touches;
			const path = event.composedPath();
			if (sliding || taken(path, finger.clientX)) return;
			touch = {
				x: finger.clientX,
				y: finger.clientY,
				t: event.timeStamp,
				ownLeft: path.some((t) => t instanceof HTMLElement && t.dataset.ownSwipe === 'left'),
				swiping: false,
				dx: 0,
				next: to('next'),
				previous: to('previous')
			};
		}

		function move(event: TouchEvent) {
			if (!touch) return;
			const [finger] = event.touches;
			const moved = finger.clientX - touch.x;
			if (!touch.swiping) {
				const way = heading(moved, finger.clientY - touch.y);
				if (way === 'scroll' || (way === 'sideways' && moved < 0 && touch.ownLeft)) {
					touch = null;
					return;
				}
				if (!way) return;
				touch.swiping = true;
				const path = moved < 0 ? touch.next : touch.previous;
				if (path) preload(path);
				node.style.willChange = 'transform, opacity';
			}
			if (event.cancelable) event.preventDefault();
			// At the first and the last view the page only gives a little.
			touch.dx = (moved < 0 ? touch.next : touch.previous) ? moved : moved / 4;
			place(touch.dx);
		}

		async function end(event: TouchEvent) {
			const swipe = touch;
			touch = null;
			if (!swipe?.swiping) return;
			node.style.willChange = '';
			const width = window.innerWidth;
			const direction = outcome(swipe.dx, event.timeStamp - swipe.t, width);
			const path = direction && swipe[direction];
			if (!path) return slide(swipe.dx, 0);
			// Out to the side, then the next view in from the other side.
			const side = direction === 'next' ? -width : width;
			sliding = true;
			node.toggleAttribute('data-sliding', true);
			await slide(swipe.dx, side);
			const went = await go(path).then(
				() => true,
				() => false
			);
			await slide(went ? -side : side, 0);
			sliding = false;
			node.toggleAttribute('data-sliding', false);
		}

		/** A second finger, or the phone taking the touch over, leaves the page where it was. */
		function cancel() {
			if (touch?.swiping) slide(touch.dx, 0);
			node.style.willChange = '';
			touch = null;
		}

		node.addEventListener('touchstart', start);
		node.addEventListener('touchmove', move, { passive: false });
		node.addEventListener('touchend', end);
		node.addEventListener('touchcancel', cancel);
		return () => {
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchmove', move);
			node.removeEventListener('touchend', end);
			node.removeEventListener('touchcancel', cancel);
			place(0);
		};
	};
}
