-- The people who may eat a week, and the household's settings for every week. Names and
-- requirements are written in the app and live only here. See docs/beslut/0012-datamodell.md.
CREATE TABLE person (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL CHECK (trim(name) <> ''),
	-- Free text that Claude reads: allergies, diets and what the person does not eat.
	requirements TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- One row per setting. A missing row means the setting's default, which the code holds.
CREATE TABLE setting (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
) WITHOUT ROWID;
