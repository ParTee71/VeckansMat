// The colour themes a phone can choose. Every theme has the same white surfaces (see the
// layout); the theme colour gives the accents.

export interface Theme {
	id: string;
	label: string;
	/** The colour m3e builds the scheme from. */
	color: string;
	variant: 'tonal-spot' | 'neutral';
	/** The theme's primary colour, shown in the picker. */
	swatch: string;
}

export const THEMES: Theme[] = [
	{
		id: 'terrakotta',
		label: 'Terrakotta',
		color: '#c26b4e',
		variant: 'tonal-spot',
		swatch: '#8f4c35'
	},
	{ id: 'skiffer', label: 'Skiffer', color: '#5f7a99', variant: 'tonal-spot', swatch: '#34618d' },
	{ id: 'salvia', label: 'Salvia', color: '#7d9a78', variant: 'neutral', swatch: '#566253' },
	{
		id: 'eukalyptus',
		label: 'Eukalyptus',
		color: '#6e9a8e',
		variant: 'tonal-spot',
		swatch: '#086b5a'
	},
	{ id: 'oliv', label: 'Oliv', color: '#8a8f5c', variant: 'tonal-spot', swatch: '#5c631d' }
];

export const THEME_KEY = 'tema';

/** A theme id, or a colour of one's own written #rrggbb. */
export type ThemeChoice = string;

const isColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export const isThemeId = (choice: ThemeChoice) => THEMES.some((t) => t.id === choice);

/** The stored choice when it is one, otherwise the first theme. */
export function readChoice(stored: string | null): ThemeChoice {
	return stored && (isColor(stored) || isThemeId(stored)) ? stored : THEMES[0].id;
}

/** What m3e-theme gets for a choice. A colour of one's own is toned down like the themes. */
export function themeOf(choice: ThemeChoice): Pick<Theme, 'color' | 'variant'> {
	const theme = THEMES.find((t) => t.id === choice);
	if (theme) return theme;
	return isColor(choice) ? { color: choice, variant: 'tonal-spot' } : THEMES[0];
}
