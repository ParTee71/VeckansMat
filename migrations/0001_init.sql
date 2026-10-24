-- Recipes and weekly menus. See docs/beslut/0012-datamodell.md.

-- Only the name is required: a recipe can be just a dish written on a note.
CREATE TABLE recipe (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL CHECK (trim(name) <> ''),
	-- The name trimmed, with single spaces and in lower case, so that the same
	-- dish written differently becomes one recipe.
	name_key TEXT NOT NULL UNIQUE,
	servings INTEGER CHECK (servings > 0),
	time_minutes INTEGER CHECK (time_minutes > 0),
	instructions TEXT,
	source_url TEXT,
	image_key TEXT,
	note TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The original line is always kept, so nothing is lost when parsing is unsure.
CREATE TABLE recipe_ingredient (
	id INTEGER PRIMARY KEY,
	recipe_id INTEGER NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	raw TEXT NOT NULL,
	quantity REAL,
	unit TEXT,
	name TEXT,
	UNIQUE (recipe_id, position)
);

CREATE TABLE recipe_tag (
	recipe_id INTEGER NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
	tag TEXT NOT NULL,
	PRIMARY KEY (recipe_id, tag)
) WITHOUT ROWID;

-- One week. Old notes do not always say which week, so week_start may be null.
CREATE TABLE menu (
	id INTEGER PRIMARY KEY,
	-- The Monday of the week, YYYY-MM-DD.
	week_start TEXT CHECK (week_start IS NULL OR date(week_start, 'weekday 1') IS week_start),
	source TEXT NOT NULL CHECK (source IN ('photo', 'app')),
	note TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX menu_week_start ON menu (week_start) WHERE week_start IS NOT NULL;

-- A line on the week, kept as written. Lines like "Leftovers" have no recipe.
CREATE TABLE menu_item (
	id INTEGER PRIMARY KEY,
	menu_id INTEGER NOT NULL REFERENCES menu (id) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	-- ISO weekday, 1 = Monday. Null when the note does not say.
	weekday INTEGER CHECK (weekday BETWEEN 1 AND 7),
	meal TEXT NOT NULL CHECK (meal IN ('dinner', 'lunch')),
	text TEXT NOT NULL,
	recipe_id INTEGER REFERENCES recipe (id) ON DELETE SET NULL,
	UNIQUE (menu_id, position)
);

CREATE INDEX menu_item_recipe ON menu_item (recipe_id);
