/** What is kept about an account Access has let in. */
export interface StoredAccount {
	name: string | null;
	/** When the name and picture were fetched, as an ISO time. */
	fetchedAt: string;
	hasPicture: boolean;
}

export interface Picture {
	bytes: ArrayBuffer;
	type: string;
}

export async function getAccount(db: D1Database, email: string): Promise<StoredAccount | null> {
	const row = await db
		.prepare(
			'SELECT name, fetched_at, picture IS NOT NULL AS has_picture FROM account WHERE email = ?'
		)
		.bind(email)
		.first<{ name: string | null; fetched_at: string; has_picture: number }>();
	return row && { name: row.name, fetchedAt: row.fetched_at, hasPicture: row.has_picture === 1 };
}

/** Saves what was fetched for the account. A picture left undefined keeps the one saved. */
export async function saveAccount(
	db: D1Database,
	email: string,
	name: string | null,
	picture: Picture | null | undefined,
	fetchedAt: Date
): Promise<void> {
	if (picture === undefined) {
		await db
			.prepare(
				`INSERT INTO account (email, name, fetched_at) VALUES (?, ?, ?)
				 ON CONFLICT (email) DO UPDATE SET name = excluded.name, fetched_at = excluded.fetched_at`
			)
			.bind(email, name, fetchedAt.toISOString())
			.run();
		return;
	}
	await db
		.prepare(
			`INSERT INTO account (email, name, picture, picture_type, fetched_at) VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT (email) DO UPDATE SET name = excluded.name, picture = excluded.picture,
			 picture_type = excluded.picture_type, fetched_at = excluded.fetched_at`
		)
		.bind(email, name, picture?.bytes ?? null, picture?.type ?? null, fetchedAt.toISOString())
		.run();
}

export async function getPicture(db: D1Database, email: string): Promise<Picture | null> {
	const row = await db
		.prepare('SELECT picture, picture_type FROM account WHERE email = ? AND picture IS NOT NULL')
		.bind(email)
		.first<{ picture: number[] | ArrayBuffer; picture_type: string }>();
	if (!row) return null;
	const bytes =
		row.picture instanceof ArrayBuffer ? row.picture : new Uint8Array(row.picture).buffer;
	return { bytes, type: row.picture_type };
}
