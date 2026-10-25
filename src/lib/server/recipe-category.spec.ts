import { afterEach, describe, expect, it, vi } from 'vitest';
import { answering, failing, reason } from '../../../test/claude';
import { useTestDb } from '../../../test/d1';
import { giveIngredients } from '../../../test/fixtures';
import { ClaudeLimitError } from './claude/claude';
import { CATEGORY_PROMPT, CATEGORY_SCHEMA, categoryContent } from './claude/category-prompt';
import { addRecipe, createRecipe, getRecipe, listRecipes } from './db/recipes';
import { askCategories, sortRecipes } from './recipe-category';

let db: D1Database;
useTestDb((test) => (db = test));
afterEach(() => vi.useRealTimers());

const sorts = async () =>
	Object.fromEntries(
		(await listRecipes(db)).map((r) => [r.name, r.category && `${r.category} ${r.base}`])
	);

describe('asking Claude for sorts', () => {
	const dishes = [
		{ name: 'Köttsoppa', ingredients: ['500 g högrev', '4 morötter'] },
		{ name: 'Linssoppa', ingredients: [] },
		{ name: 'Tacos', ingredients: [] }
	];

	it('sends the dishes with their lines, and asks for the schema', async () => {
		const ask = answering({ dishes: [] });
		await askCategories(dishes, ask);
		expect(ask).toHaveBeenCalledWith(
			expect.objectContaining({
				system: CATEGORY_PROMPT,
				output_config: { effort: 'low', format: { type: 'json_schema', schema: CATEGORY_SCHEMA } }
			})
		);
		expect(categoryContent(dishes)).toBe(
			'<dishes>\n1. Köttsoppa: 500 g högrev; 4 morötter\n2. Linssoppa\n3. Tacos\n</dishes>'
		);
	});

	it('keeps only sorts on the list, for dishes it asked about', async () => {
		const answer = await askCategories(
			dishes,
			answering({
				dishes: [
					{ dish: 1, category: 'soppa', base: 'annat' },
					{ dish: 2, category: 'soppa', base: 'bröd' },
					{ dish: 3, category: 'gryta', base: 'annat' },
					{ dish: 9, category: 'fisk', base: 'ris' },
					{ dish: 1, category: 'kott', base: 'potatis' }
				]
			})
		);
		expect([...answer]).toEqual([
			[0, { category: 'soppa', base: 'annat' }],
			[1, { category: 'soppa', base: null }]
		]);
	});

	it('gives the reason when Claude cannot answer', async () => {
		expect(await reason(askCategories(dishes, answering('inget svar')))).toBe('failed');
		expect(await reason(askCategories(dishes, failing(new ClaudeLimitError())))).toBe('limit');
	});
});

describe('sorting the dishes', () => {
	it('sorts every dish without a sort, and puts one Claude left out under Övrigt', async () => {
		await addRecipe(db, 'Köttsoppa');
		await addRecipe(db, 'Mormors special');
		await addRecipe(db, 'Tacos');
		await giveIngredients(db, 'Tacos', ['500 g nötfärs', '8 tortillas']);
		const ask = answering({
			dishes: [
				{ dish: 1, category: 'soppa', base: 'annat' },
				{ dish: 3, category: 'kottfars', base: 'annat' }
			]
		});
		await sortRecipes(db, ask);
		expect(await sorts()).toEqual({
			Köttsoppa: 'soppa annat',
			'Mormors special': 'ovrigt null',
			Tacos: 'kottfars annat'
		});
		expect(JSON.stringify(ask.mock.calls[0][0].messages)).toContain('Tacos: 500 g nötfärs');

		// Nothing is left to ask about.
		await sortRecipes(db, ask);
		expect(ask).toHaveBeenCalledOnce();
	});

	it('never asks about a dish the household has sorted', async () => {
		await createRecipe(db, {
			name: 'Fiskgratäng',
			servings: null,
			timeMinutes: null,
			instructions: null,
			sourceUrl: null,
			ingredients: [],
			tags: [],
			category: 'fisk',
			base: 'potatis'
		});
		const ask = answering({ dishes: [] });
		await sortRecipes(db, ask);
		expect(ask).not.toHaveBeenCalled();
		expect(await sorts()).toEqual({ Fiskgratäng: 'fisk potatis' });
	});

	it('marks the sorts as guessed', async () => {
		const id = await addRecipe(db, 'Linssoppa');
		await sortRecipes(db, answering({ dishes: [{ dish: 1, category: 'soppa', base: 'annat' }] }));
		expect((await getRecipe(db, id))!.categoryGuessed).toBe(true);
	});

	it('leaves the dishes unsorted when the cap is spent, and waits before it asks again', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		await addRecipe(db, 'Linssoppa');
		const spent = failing(new ClaudeLimitError());
		await sortRecipes(db, spent);
		expect(await sorts()).toEqual({ Linssoppa: null });

		const ask = answering({ dishes: [{ dish: 1, category: 'soppa', base: 'annat' }] });
		await sortRecipes(db, ask);
		expect(ask).not.toHaveBeenCalled();
		vi.setSystemTime(Date.now() + 11 * 60_000);
		await sortRecipes(db, ask);
		expect(await sorts()).toEqual({ Linssoppa: 'soppa annat' });
	});
});
