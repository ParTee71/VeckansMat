// Claude makes the week's shopping list, and guesses the ingredients of dishes that have only a
// name. See docs/beslut/0015-inkopslista.md and 0017-varans-identitet.md.
import { portionsFor } from '../cooking';
import { answerStrings, answerText } from '../names';
import { SECTIONS, sectionRank } from '../shopping';
import { askJson, type Ask } from './claude/claude';
import {
	SHOPPING_PROMPT,
	SHOPPING_SCHEMA,
	shoppingContent,
	type ShoppingDish
} from './claude/shopping-prompt';
import { getSettings } from './db/household';
import { getWeek } from './db/menus';
import {
	saveShoppingList,
	weekDishes,
	type NewShoppingItem,
	type ShoppingItem,
	type WeekDish
} from './db/shopping';

/** A dish on the week with the portions to cook. */
type PlannedDish = WeekDish & { portions: number };

/** The week's dishes with their portions, and a fingerprint that changes when they do. */
export async function shoppingPlan(
	db: D1Database,
	weekStart: string
): Promise<{ dishes: PlannedDish[]; basis: string }> {
	const [week, settings, dishes] = await Promise.all([
		getWeek(db, weekStart),
		getSettings(db),
		weekDishes(db, weekStart)
	]);
	const eaters = week.eaters.length;
	const extra = settings.lunchboxExtraPortions;
	const planned = dishes.map((dish) => ({
		...dish,
		portions: dish.times * portionsFor({ eaters, lunchbox: dish.lunchbox, extra })
	}));
	return { dishes: planned, basis: basisOf(planned) };
}

/** What the list is made from: changes when a dish, its portions or its lines do. */
const basisOf = (dishes: PlannedDish[]) =>
	JSON.stringify(dishes.map((d) => [d.id, d.portions, d.ingredients]));

/** Whether the week has changed since its list was made from it, so the list can be updated. */
export const listChanged = (made: string | null, now: string, items: ShoppingItem[]) =>
	made !== null && made !== now && items.some((item) => item.origin !== 'hand');

/** Why Claude made no list: it failed, or the month's cap is spent. */
export class ShoppingListError extends Error {
	constructor(readonly reason: 'failed' | 'limit') {
		super(`No shopping list: ${reason}`);
	}
}

/** An item on Claude's list, with the lines it covers as [dish, line], counted from 0. */
export interface ClaudeItem {
	text: string;
	amount: string | null;
	section: string;
	lines: [number, number][];
}

/**
 * Asks Claude for the list and the guesses. The items come in the order of the store's sections,
 * each with the lines it covers; the guesses are by the dish's place in `dishes`.
 */
export async function askShoppingList(
	dishes: ShoppingDish[],
	ask: Ask
): Promise<{ items: ClaudeItem[]; guesses: Map<number, string[]> }> {
	const parsed = await askJson(
		ask,
		{
			max_tokens: 16000,
			system: SHOPPING_PROMPT,
			output_config: { effort: 'low', format: { type: 'json_schema', schema: SHOPPING_SCHEMA } },
			messages: [{ role: 'user', content: [{ type: 'text', text: shoppingContent(dishes) }] }]
		},
		(reason) => new ShoppingListError(reason),
		'shopping list',
		'items'
	);

	// Guesses only for the dishes that have no lines.
	const guesses = new Map<number, string[]>();
	for (const guess of Array.isArray(parsed.guesses) ? parsed.guesses : []) {
		const i = Number(guess?.dish) - 1;
		// Claude sometimes writes a line's number, such as "3.1", into the line itself.
		const lines = answerStrings(guess?.ingredients, 100).map((line, j) => {
			const number = `${i + 1}.${j + 1} `;
			return line.startsWith(number) ? line.slice(number.length).trim() : line;
		});
		if (dishes[i] && !dishes[i].ingredients.length && lines.length) guesses.set(i, lines);
	}
	const lineCount = (i: number) => (guesses.get(i) ?? dishes[i]?.ingredients ?? []).length;

	const items: ClaudeItem[] = [];
	for (const item of parsed.items) {
		const name = answerText(item?.text, 100);
		if (!name) continue;
		const lines = new Map<string, [number, number]>();
		for (const ref of answerStrings(item?.lines, 20)) {
			const [dish, line] = ref.split('.').map((n) => Number(n) - 1);
			if (line >= 0 && line < lineCount(dish)) lines.set(`${dish}.${line}`, [dish, line]);
		}
		items.push({
			text: name,
			amount: answerText(item?.amount, 30) || null,
			section: SECTIONS.find((s) => s === item?.section) ?? 'Övrigt',
			lines: [...lines.values()]
		});
	}
	if (!items.length) throw new ShoppingListError('failed');
	items.sort((a, b) => sectionRank(a.section) - sectionRank(b.section));
	return { items, guesses };
}

/** The recipes' lines dish by dish, each under its dish: the list when Claude cannot make it. */
export const recipeLines = (dishes: WeekDish[]): NewShoppingItem[] =>
	dishes.flatMap((dish) =>
		dish.ingredients.flatMap((raw, position) =>
			raw.trim()
				? [
						{
							text: raw,
							amount: null,
							section: dish.name,
							lines: [{ recipeId: dish.id, position }]
						}
					]
				: []
		)
	);

/**
 * Makes the week's list with Claude, and keeps its guesses in their dishes. When Claude cannot,
 * the list is made of the recipes' lines dish by dish, and the reason is thrown.
 */
export async function makeShoppingListWithClaude(
	db: D1Database,
	weekStart: string,
	ask: Ask
): Promise<void> {
	const { dishes, basis } = await shoppingPlan(db, weekStart);
	const fromRecipes = () =>
		saveShoppingList(db, weekStart, { origin: 'recipe', items: recipeLines(dishes), basis });
	if (!dishes.length) return fromRecipes();
	let answer;
	try {
		answer = await askShoppingList(dishes, ask);
	} catch (e) {
		if (e instanceof ShoppingListError) await fromRecipes();
		throw e;
	}
	const { items, guesses } = answer;
	await saveShoppingList(db, weekStart, {
		origin: 'claude',
		items: items.map(({ lines, ...item }) => ({
			...item,
			lines: lines.map(([dish, position]) => ({ recipeId: dishes[dish].id, position }))
		})),
		guesses: [...guesses].map(([i, ingredients]) => ({ recipeId: dishes[i].id, ingredients })),
		// The list is made from the dishes with the guesses in them. A change to the week while Claude
		// was making it is not, so the page offers to update the list.
		basis: basisOf(dishes.map((d, i) => ({ ...d, ingredients: guesses.get(i) ?? d.ingredients })))
	});
}
