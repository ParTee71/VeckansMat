-- Claude's shopping list. See docs/beslut/0015-inkopslista.md.

-- The ingredients were guessed by Claude for a dish that had only a name, until the dish is saved
-- by hand.
ALTER TABLE recipe ADD COLUMN ingredients_guessed INTEGER NOT NULL DEFAULT 0
	CHECK (ingredients_guessed IN (0, 1));

-- The dishes, portions and lines the week's shopping list was made from, so the list can tell when the
-- week has changed since.
ALTER TABLE menu ADD COLUMN shopping_basis TEXT;
