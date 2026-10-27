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
		shop: [
			'M10.5 20a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
			'M19.5 20a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
			'M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H6'
		],
		refresh: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
		history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5M12 7v5l3 2'],
		search: ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z', 'm20 20-3.5-3.5'],
		add: ['M12 5v14M5 12h14'],
		remove: ['M5 12h14'],
		back: ['M19 12H5M12 19l-7-7 7-7'],
		close: ['M18 6 6 18M6 6l12 12'],
		edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
		next: ['m9 6 6 6-6 6'],
		expand: ['m6 9 6 6 6-6'],
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
		// The sorts of dish, named by their keys in recipes.ts.
		soppa: ['M3 11h18a9 9 0 0 1-18 0z', 'M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4'],
		kott: ['M15 4a5 5 0 0 1 3 9l-6 6a3 3 0 1 1-4-4l6-6a5 5 0 0 1 1-5z'],
		kottfars: ['M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0z', 'M4 19h16'],
		kyckling: ['M16 3a5 5 0 0 1 2 9.5L11 19a3 3 0 1 1-4-4l6.5-7A5 5 0 0 1 16 3z', 'M7 15l-3 3'],
		fisk: ['M2 12c3-4 7-6 12-6 3 0 6 3 8 6-2 3-5 6-8 6-5 0-9-2-12-6z', 'M16 11v.5'],
		korv: ['M5 17c-2-2-2-5 0-7l5-5c2-2 5-2 7 0s2 5 0 7l-5 5c-2 2-5 2-7 0z'],
		vego: ['M5 19c0-8 6-14 14-14 0 8-6 14-14 14z', 'M5 19l8-8'],
		ovrigt: ['M6 12h.01M12 12h.01M18 12h.01'],
		// The store's sections on the shopping list, named by their keys in shopping.ts.
		produce: [
			'M12 21c-5 0-8-4-8-9 0-4 3-6 6-5 1 .4 1.6.4 2 0 3-1 6 1 6 5 0 5-3 9-6 9z',
			'M12 7c0-2 1-4 3-4'
		],
		dairy: ['M8 3h8v3l2 3v12H6V9l2-3z', 'M6 13h12'],
		bread: ['M5 11a4 4 0 0 1 2-7h10a4 4 0 0 1 2 7v9H5z'],
		pantry: ['M7 3h10v3H7z', 'M6 6h12v15H6z', 'M6 11h12'],
		frozen: ['M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17', 'm9 4 3 2 3-2M9 20l3-2 3 2'],
		home: ['M3 11l9-7 9 7', 'M5 10v10h14V10'],
		people: [
			'M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
			'M3 20a6 6 0 0 1 12 0',
			'M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6'
		],
		info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 11v6M12 7.5v.5'],
		delete: ['M4 7h16M10 11v6M14 11v6', 'M6 7l1 13h10l1-13M9 7V4h6v3'],
		image: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
			'm21 15-5-5L5 21'
		],
		tag: ['M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z', 'M7.5 7.5h.01'],
		thumbUp: [
			'M7 10v12',
			'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z'
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
