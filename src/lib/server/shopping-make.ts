// Claude makes the week's shopping list, and guesses the ingredients of dishes that have only a
// name. See docs/beslut/0015-inkopslista.md.
import { answerStrings, answerText, nameKey } from '../names';
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
	makeShoppingList,
	saveShoppingList,
	weekDishes,
	type Guess,
	type NewShoppingItem,
	type WeekDish
} from './db/shopping';

/** Who eats when nobody is chosen for the week. */
const DEFAULT_EATERS = 2;

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
	const eaters = week.eaters.length || DEFAULT_EATERS;
	const planned = dishes.map((dish) => ({
		...dish,
		// A dish good for lunch boxes is cooked with extra portions each time.
		portions: dish.times * (eaters + (dish.lunchbox ? settings.lunchboxExtraPortions : 0))
	}));
	return { dishes: planned, basis: basisOf(planned) };
}

/** What the list is made from: changes when a dish, its portions or its lines do. */
const basisOf = (dishes: PlannedDish[]) =>
	JSON.stringify(dishes.map((d) => [d.id, d.portions, d.ingredients]));

/** Why Claude made no list: it failed, or the month's cap is spent. */
export class ShoppingListError extends Error {
	constructor(readonly reason: 'failed' | 'limit') {
		super(`No shopping list: ${reason}`);
	}
}

/**
 * Asks Claude for the list and the guesses. The items come in the order of the store's sections,
 * each with the dishes it is for.
 */
export async function askShoppingList(
	dishes: ShoppingDish[],
	ask: Ask
): Promise<{ items: NewShoppingItem[]; guesses: Map<string, string[]> }> {
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

	// Guesses only for the dishes asked about, by the name they were given.
	const byKey = new Map(dishes.map((dish) => [nameKey(dish.name), dish]));
	const guesses = new Map<string, string[]>();
	for (const guess of Array.isArray(parsed.guesses) ? parsed.guesses : []) {
		const dish = byKey.get(nameKey(answerText(guess?.dish, 100)));
		const lines = answerStrings(guess?.ingredients, 100);
		if (dish && !dish.ingredients.length && lines.length) guesses.set(dish.name, lines);
	}

	const items: NewShoppingItem[] = [];
	for (const item of parsed.items) {
		const name = answerText(item?.text, 100);
		if (!name) continue;
		const section = SECTIONS.find((s) => s === item?.section) ?? 'Övrigt';
		const named = answerStrings(item?.dishes, 100)
			.map((d) => byKey.get(nameKey(d))?.name)
			.filter((d): d is string => !!d);
		items.push({
			text: name,
			amount: answerText(item?.amount, 30) || null,
			section,
			dishes: [...new Set(named)].join(', ') || null
		});
	}
	if (!items.length) throw new ShoppingListError('failed');
	items.sort((a, b) => sectionRank(a.section) - sectionRank(b.section));
	return { items, guesses };
}

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
	if (!dishes.length) return makeShoppingList(db, weekStart, basis);
	let answer;
	try {
		answer = await askShoppingList(dishes, ask);
	} catch (e) {
		if (e instanceof ShoppingListError) await makeShoppingList(db, weekStart, basis);
		throw e;
	}
	const guesses: Guess[] = dishes
		.filter((d) => answer.guesses.has(d.name))
		.map((d) => ({
			recipeId: d.id,
			ingredients: answer.guesses.get(d.name)!
		}));
	// The list is made from the dishes with the guesses in them. A change to the week while Claude
	// was making it is not, so the page offers to update the list.
	const made = basisOf(
		dishes.map((d) => ({ ...d, ingredients: answer.guesses.get(d.name) ?? d.ingredients }))
	);
	await saveShoppingList(db, weekStart, answer.items, guesses, made);
}
