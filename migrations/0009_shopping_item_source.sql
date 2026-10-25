-- The recipe lines each item on the shopping list covers, which is what the item is. See
-- docs/beslut/0017-varans-identitet.md. A line is a dish's line by its position; the dishes an
-- item is for follow from its lines, so they are no longer kept as text.
CREATE TABLE shopping_item_source (
	item_id INTEGER NOT NULL REFERENCES shopping_item (id) ON DELETE CASCADE,
	recipe_id INTEGER NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
	-- Not tied to recipe_ingredient, whose lines are written anew each time a dish is saved.
	position INTEGER NOT NULL,
	PRIMARY KEY (item_id, recipe_id, position)
);

CREATE INDEX shopping_item_source_line ON shopping_item_source (recipe_id, position);
-- shopping_item.dishes is no longer written, but stays so that the code before still runs on a
-- rollback. A later migration drops it.
