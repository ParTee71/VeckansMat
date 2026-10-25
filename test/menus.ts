import { nameKey } from '../src/lib/names';
import type { Meal } from '../src/lib/server/db/menus';
import { upsertRecipeStatement } from '../src/lib/server/db/recipes';

// Old weeks, as the import of the household's notes wrote them, for the tests that read them.

interface NewMenuItem {
	/** The line as written. */
	text: string;
	/** The dish the line is, or null for lines like "Leftovers". */
	recipeName: string | null;
	meal: Meal;
	/** ISO weekday, 1 = Monday. */
	weekday?: number | null;
}

interface NewMenu {
	/** The Monday of the week, YYYY-MM-DD, or null when unknown. */
	weekStart: string | null;
	source: 'photo' | 'app';
	note?: string | null;
	items: NewMenuItem[];
}

/** Saves a week and creates name-only recipes for dishes not seen before, all or nothing. */
export async function saveMenu(db: D1Database, menu: NewMenu): Promise<number> {
	// The first spelling of a new dish names it; blank names count as no dish.
	const dishes = new Map<string, string>();
	for (const item of menu.items) {
		const key = item.recipeName ? nameKey(item.recipeName) : '';
		if (key && !dishes.has(key)) dishes.set(key, item.recipeName!);
	}
	// A batch is one transaction, and a new row gets an id above all others,
	// so max(id) is the menu inserted first in this batch.
	const [inserted] = await db.batch([
		db
			.prepare('INSERT INTO menu (week_start, source, note) VALUES (?, ?, ?) RETURNING id')
			.bind(menu.weekStart, menu.source, menu.note ?? null),
		...[...dishes.values()].map((name) => upsertRecipeStatement(db, name)),
		...menu.items.map((item, position) =>
			db
				.prepare(
					`INSERT INTO menu_item (menu_id, position, weekday, meal, text, recipe_id)
					 VALUES ((SELECT max(id) FROM menu), ?, ?, ?, ?, (SELECT id FROM recipe WHERE name_key = ?))`
				)
				.bind(
					position,
					item.weekday ?? null,
					item.meal,
					item.text,
					item.recipeName ? nameKey(item.recipeName) || null : null
				)
		)
	]);
	return (inserted.results[0] as { id: number }).id;
}
