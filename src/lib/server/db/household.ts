import { DEFAULT_SETTINGS, favouriteWeeks, isValidSetting, type Settings } from '../../household';

interface Person {
	id: number;
	name: string;
	/** Allergies, diets and what the person does not eat, as written. */
	requirements: string;
}

type PersonInput = Omit<Person, 'id'>;

/** Everyone in the household, in the order they were added. */
export async function listPeople(db: D1Database): Promise<Person[]> {
	const { results } = await db
		.prepare('SELECT id, name, requirements FROM person ORDER BY id')
		.all<Person>();
	return results;
}

export function getPerson(db: D1Database, id: number): Promise<Person | null> {
	return db.prepare('SELECT id, name, requirements FROM person WHERE id = ?').bind(id).first();
}

export async function createPerson(db: D1Database, person: PersonInput): Promise<number> {
	const row = await db
		.prepare('INSERT INTO person (name, requirements) VALUES (?, ?) RETURNING id')
		.bind(person.name.trim(), person.requirements.trim())
		.first<{ id: number }>();
	return row!.id;
}

/** Saves the person, or returns false when there is none with the id. */
export async function updatePerson(
	db: D1Database,
	id: number,
	person: PersonInput
): Promise<boolean> {
	const { meta } = await db
		.prepare('UPDATE person SET name = ?, requirements = ? WHERE id = ?')
		.bind(person.name.trim(), person.requirements.trim(), id)
		.run();
	return meta.changes > 0;
}

export async function deletePerson(db: D1Database, id: number): Promise<void> {
	await db.prepare('DELETE FROM person WHERE id = ?').bind(id).run();
}

// The columns are named in English in the code and stored by these keys.
const KEYS: Record<keyof Settings, string> = {
	menuRules: 'menu_rules',
	newDishesPerWeek: 'new_dishes_per_week',
	lunchboxExtraPortions: 'lunchbox_extra_portions',
	repeatWeeks: 'repeat_weeks',
	favouriteRepeatWeeks: 'favourite_repeat_weeks',
	memberPrices: 'offer_member_prices'
};

/** The household's settings, with the defaults for those never saved. */
export async function getSettings(db: D1Database): Promise<Settings> {
	const { results } = await db
		.prepare('SELECT key, value FROM setting')
		.all<{ key: string; value: string }>();
	const stored = new Map(results.map((row) => [row.key, row.value]));
	const settings = { ...DEFAULT_SETTINGS };
	for (const [name, key] of Object.entries(KEYS) as [keyof Settings, string][]) {
		const value = stored.get(key);
		if (value === undefined) continue;
		const kind = typeof DEFAULT_SETTINGS[name];
		const parsed =
			kind === 'number' ? Number(value) : kind === 'boolean' ? value === 'true' : value;
		// A value the form would not offer is read as never saved.
		if (isValidSetting(name, parsed)) Object.assign(settings, { [name]: parsed });
	}
	return { ...settings, favouriteRepeatWeeks: favouriteWeeks(settings) };
}

/** Saves the given settings and leaves the others as they are. Throws on a value out of range. */
export async function saveSettings(db: D1Database, settings: Partial<Settings>): Promise<void> {
	const entries = Object.entries(settings) as [keyof Settings, Settings[keyof Settings]][];
	for (const [name, value] of entries) {
		if (!isValidSetting(name, value)) throw new RangeError(`Invalid ${name}: ${value}`);
	}
	if (entries.length === 0) return;
	await db.batch(
		entries.map(([name, value]) =>
			db
				.prepare(
					'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
				)
				.bind(KEYS[name], typeof value === 'string' ? value.trim() : String(value))
		)
	);
}
