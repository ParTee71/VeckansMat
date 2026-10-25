import { describe, expect, it } from 'vitest';
import { readChoice, themeOf, THEMES } from './themes';

describe('the theme', () => {
	it('is terrakotta when nothing or something unknown is stored', () => {
		expect(readChoice(null)).toBe('terrakotta');
		expect(readChoice('lila')).toBe('terrakotta');
		expect(readChoice('#12345')).toBe('terrakotta');
		expect(readChoice('red')).toBe('terrakotta');
	});

	it('keeps a stored theme or colour of its own', () => {
		expect(readChoice('skiffer')).toBe('skiffer');
		expect(readChoice('#3366CC')).toBe('#3366CC');
	});

	it('gives m3e the colour and variant', () => {
		expect(themeOf('salvia')).toMatchObject({ color: '#7d9a78', variant: 'neutral' });
		expect(themeOf('#3366cc')).toEqual({ color: '#3366cc', variant: 'tonal-spot' });
		expect(themeOf('okänd')).toBe(THEMES[0]);
	});
});
