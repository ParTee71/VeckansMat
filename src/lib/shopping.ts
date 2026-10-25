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

/** Where a heading goes: the store's sections in their order, any other heading after them. */
export function sectionRank(section: string | null): number {
	const rank = (SECTIONS as readonly (string | null)[]).indexOf(section);
	return rank < 0 ? SECTIONS.length : rank;
}
