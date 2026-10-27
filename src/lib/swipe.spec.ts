import { describe, expect, it } from 'vitest';
import { heading, neighbour, outcome } from './swipe';

describe('heading', () => {
	it('waits until the finger has moved a little', () => {
		expect(heading(8, 3)).toBeNull();
	});

	it('takes a clearly sideways move as a swipe', () => {
		expect(heading(-30, 10)).toBe('sideways');
		expect(heading(30, -5)).toBe('sideways');
	});

	it('leaves a move that is mostly up or down to the scroll', () => {
		expect(heading(20, 18)).toBe('scroll');
		expect(heading(2, -40)).toBe('scroll');
	});
});

describe('outcome', () => {
	const width = 412;

	it('goes nowhere on a short slow drag', () => {
		expect(outcome(-100, 600, width)).toBeNull();
	});

	it('goes to the next view past a third of the width to the left', () => {
		expect(outcome(-150, 800, width)).toBe('next');
	});

	it('goes to the previous view past a third of the width to the right', () => {
		expect(outcome(150, 800, width)).toBe('previous');
	});

	it('takes a short fast flick', () => {
		expect(outcome(-60, 80, width)).toBe('next');
	});

	it('does not take a twitch as a flick', () => {
		expect(outcome(-20, 10, width)).toBeNull();
	});
});

describe('neighbour', () => {
	const paths = ['/', '/handla', '/ratter', '/veckor'];

	it('is the view next to this one in the menu', () => {
		expect(neighbour(paths, '/handla', 'next')).toBe('/ratter');
		expect(neighbour(paths, '/handla', 'previous')).toBe('/');
	});

	it('stops at the ends instead of going round', () => {
		expect(neighbour(paths, '/', 'previous')).toBeNull();
		expect(neighbour(paths, '/veckor', 'next')).toBeNull();
	});

	it('is nothing on a page outside the menu', () => {
		expect(neighbour(paths, '/ratter/12', 'next')).toBeNull();
	});
});
