<script lang="ts" module>
	// Inline outline icons, so the app loads no icon font from elsewhere.
	const paths = {
		week: [
			'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
			'M3 10h18M8 3v4M16 3v4'
		],
		dishes: [
			'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z',
			'M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5'
		],
		history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5M12 7v5l3 2'],
		search: ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z', 'm20 20-3.5-3.5'],
		add: ['M12 5v14M5 12h14'],
		remove: ['M5 12h14'],
		back: ['M19 12H5M12 19l-7-7 7-7'],
		close: ['M18 6 6 18M6 6l12 12'],
		edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
		next: ['m9 6 6 6-6 6'],
		previous: ['m15 18-6-6 6-6'],
		palette: [
			'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2.5a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z',
			'M7.5 11h.01M11 7h.01M16 8h.01'
		],
		check: ['M20 6 9 17l-5-5'],
		swap: [
			'M17 2l4 4-4 4',
			'M3 11V9a3 3 0 0 1 3-3h15',
			'M7 22l-4-4 4-4',
			'M21 13v2a3 3 0 0 1-3 3H3'
		],
		suggest: [
			'M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z',
			'M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'
		],
		link: [
			'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7',
			'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'
		],
		camera: [
			'M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
			'M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z'
		],
		image: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
			'm21 15-5-5L5 21'
		]
	};

	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name }: { name: IconName } = $props();
</script>

<svg
	width="24"
	height="24"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#each paths[name] as d (d)}
		<path {d} />
	{/each}
</svg>
