-- Made-up dishes and weeks for the Playwright tests. Never the household's data.
DELETE FROM menu;
DELETE FROM recipe;
DELETE FROM claude_call;

INSERT INTO recipe (id, name, name_key, servings, time_minutes) VALUES
	(1, 'Fiskgratäng', 'fiskgratäng', 4, 45),
	(2, 'Linssoppa', 'linssoppa', NULL, NULL),
	(3, 'Ostfrallor', 'ostfrallor', NULL, NULL);
INSERT INTO recipe_ingredient (recipe_id, position, raw) VALUES
	(1, 0, '600 g torskfilé'),
	(1, 1, '2 dl grädde');

INSERT INTO menu (id, week_start, source) VALUES
	(1, '2030-01-14', 'photo'),
	(2, '2030-01-07', 'photo'),
	(3, NULL, 'photo');
INSERT INTO menu_item (menu_id, position, weekday, meal, text, recipe_id) VALUES
	(1, 0, 1, 'dinner', 'Fiskgratäng', 1),
	(1, 1, 2, 'dinner', 'Rester', NULL),
	(1, 2, 6, 'lunch', 'Ostfrallor', 3),
	(2, 0, NULL, 'dinner', 'Linssoppa', 2),
	(2, 1, NULL, 'dinner', 'Fiskgratäng', 1),
	(3, 0, NULL, 'dinner', 'Linssoppa', 2);
