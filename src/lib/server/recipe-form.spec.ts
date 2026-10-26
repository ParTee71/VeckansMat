import { describe, expect, it } from 'vitest';
import { parseRecipeForm } from './recipe-form';

const formOf = (fields: Record<string, string>) => {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);
	return form;
};

const error = (fields: Record<string, string>) => {
	const parsed = parseRecipeForm(formOf({ name: 'Fiskgratäng', ...fields }));
	return 'error' in parsed ? parsed.error : null;
};

describe('the recipe form', () => {
	it('gives the recipe with tidied fields', () => {
		const parsed = parseRecipeForm(
			formOf({
				name: 'Fiskgratäng',
				servings: '4',
				timeMinutes: '',
				ingredients: ' 400 g torsk \n\n2 dl grädde',
				instructions: '  ',
				tags: 'Fisk, ugn,fisk, ',
				sourceUrl: 'https://recept.exempel.se/fisk',
				lunchbox: 'on'
			})
		);
		expect(parsed).toMatchObject({
			input: {
				name: 'Fiskgratäng',
				servings: 4,
				timeMinutes: null,
				ingredients: ['400 g torsk', '2 dl grädde'],
				instructions: null,
				tags: ['fisk', 'ugn', 'matlåda'],
				sourceUrl: 'https://recept.exempel.se/fisk'
			}
		});
	});

	it('lets the switch alone decide the lunch box tag', () => {
		const parsed = parseRecipeForm(formOf({ name: 'Linssoppa', tags: 'matlåda, soppa' }));
		expect('input' in parsed && parsed.input.tags).toEqual(['soppa']);
	});

	it('gives the sort and base when chosen, and leaves them out when not', () => {
		const chosen = parseRecipeForm(formOf({ name: 'Ärtsoppa', category: 'soppa', base: 'annat' }));
		expect('input' in chosen && chosen.input).toMatchObject({ category: 'soppa', base: 'annat' });
		const none = parseRecipeForm(formOf({ name: 'Ärtsoppa', category: 'gryta' }));
		expect('input' in none && [none.input.category, none.input.base]).toEqual([
			undefined,
			undefined
		]);
	});

	it('says what is wrong, and keeps what was written', () => {
		expect(error({ name: '  ' })).toBe('Rätten behöver ett namn.');
		expect(error({ servings: '2,5' })).toBe('Portioner ska vara ett heltal.');
		expect(error({ timeMinutes: '-10' })).toBe('Tiden ska vara ett antal minuter.');
		const parsed = parseRecipeForm(formOf({ name: '', servings: '4', lunchbox: 'on' }));
		expect(parsed).toMatchObject({ values: { servings: '4' }, lunchbox: true });
	});

	it('only takes links to web pages', () => {
		expect(error({ sourceUrl: 'javascript:alert(1)' })).toBe('Länken ska börja med https://');
		expect(error({ sourceUrl: 'recept.exempel.se/fisk' })).toBe('Länken ska börja med https://');
		expect(error({ sourceUrl: 'http://recept.exempel.se/fisk' })).toBeNull();
	});
});
