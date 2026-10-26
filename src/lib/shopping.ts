import type { IconName } from './Icon.svelte';

/** The parts of the store, in the order the shopping list shows them. */
export const SECTIONS = [
	'Frukt och grönt',
	'Kött och fisk',
	'Mejeri och ägg',
	'Bröd',
	'Skafferi',
	'Fryst',
	'Övrigt',
	'Finns kanske hemma'
] as const;

export type Section = (typeof SECTIONS)[number];

/** How a heading of the list looks: an icon on a small coloured shape. */
export interface Look {
	icon: IconName;
	tint: string;
	ink: string;
	/** The shape's border-radius, so that the headings differ by more than colour. */
	shape: string;
}

/** The look of each section, fixed rather than from the theme, like the sorts of dish. */
export const SECTION_LOOKS: Record<Section, Look> = {
	'Frukt och grönt': {
		icon: 'produce',
		tint: '#d8ecc9',
		ink: '#2c4a1a',
		shape: '50% 50% 50% 0.375rem'
	},
	'Kött och fisk': {
		icon: 'kott',
		tint: '#f1d9cc',
		ink: '#5a2c18',
		shape: '0.5rem 0.5rem 0.25rem 0.25rem'
	},
	'Mejeri och ägg': { icon: 'dairy', tint: '#d3e4f5', ink: '#1d3a57', shape: '0.625rem' },
	Bröd: { icon: 'bread', tint: '#f6e0c4', ink: '#5a3a12', shape: '50% 50% 0.375rem 0.375rem' },
	Skafferi: { icon: 'pantry', tint: '#f7e3b0', ink: '#56400a', shape: '0.375rem' },
	Fryst: { icon: 'frozen', tint: '#dde6f0', ink: '#24384d', shape: '50%' },
	Övrigt: { icon: 'ovrigt', tint: '#e6e0f0', ink: '#3b3150', shape: '50% 0.375rem 50% 0.375rem' },
	'Finns kanske hemma': {
		icon: 'home',
		tint: '#ece6df',
		ink: '#4a3f39',
		shape: '0.625rem 0.625rem 50% 50%'
	}
};

/** The look of what is written by hand, and of a heading that is a dish rather than a section. */
export const HAND_LOOK: Look = {
	icon: 'edit',
	tint: 'var(--md-sys-color-primary-container)',
	ink: 'var(--md-sys-color-on-primary-container)',
	shape: '0.625rem'
};
export const DISH_LOOK: Look = {
	icon: 'dishes',
	tint: '#ece6df',
	ink: '#4a3f39',
	shape: '0.625rem'
};

/** The look of a heading: its section's, or a dish's when it is not a section. */
export const lookOf = (heading: string): Look =>
	(SECTION_LOOKS as Record<string, Look>)[heading] ?? DISH_LOOK;

/** Where a heading goes: the store's sections in their order, any other heading after them. */
export function sectionRank(section: string | null): number {
	const rank = (SECTIONS as readonly (string | null)[]).indexOf(section);
	return rank < 0 ? SECTIONS.length : rank;
}
