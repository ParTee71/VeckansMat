import { readChoice, THEME_KEY, type ThemeChoice } from './themes';

// The phone's choice of theme, shared by the layout and the picker.
export const theme = $state({ choice: readChoice(null) });

/** Reads the stored choice. Storage can be missing or blocked, and then the default stays. */
export function loadTheme() {
	try {
		theme.choice = readChoice(localStorage.getItem(THEME_KEY));
	} catch {
		// Keep the default.
	}
}

export function chooseTheme(choice: ThemeChoice) {
	theme.choice = choice;
	try {
		localStorage.setItem(THEME_KEY, choice);
	} catch {
		// The choice still holds until the page is closed.
	}
}
