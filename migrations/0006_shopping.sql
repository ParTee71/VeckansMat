-- The week's shopping list, shared by everyone in the household. See docs/beslut/0012-datamodell.md.
CREATE TABLE shopping_item (
	id INTEGER PRIMARY KEY,
	menu_id INTEGER NOT NULL REFERENCES menu (id) ON DELETE CASCADE,
	-- Not unique: two phones adding at once may get the same, and the id breaks the tie.
	position INTEGER NOT NULL,
	text TEXT NOT NULL CHECK (trim(text) <> ''),
	-- How much, such as "400 g", when Claude has worked it out.
	amount TEXT,
	-- The heading the item is listed under: the store section, or the dish for a line taken
	-- straight from a recipe. Null for items written by hand.
	section TEXT,
	-- The dishes that need the item, shown under it.
	dishes TEXT,
	-- Where the item came from: a recipe's line, Claude, or written by hand.
	origin TEXT NOT NULL CHECK (origin IN ('recipe', 'claude', 'hand')),
	checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1))
);

CREATE INDEX shopping_item_menu ON shopping_item (menu_id, position);
