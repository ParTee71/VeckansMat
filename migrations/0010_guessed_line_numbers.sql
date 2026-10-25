-- Claude sometimes wrote a guessed line's number into the line, such as "3.1 1 gul lök" for the
-- first line of the third dish. Takes the number away where it fits the line's place. See #71.
UPDATE recipe_ingredient
SET raw = trim(substr(raw, instr(raw, ' ') + 1))
WHERE recipe_id IN (SELECT id FROM recipe WHERE ingredients_guessed = 1)
	AND instr(raw, ' ') > 0
	AND substr(raw, 1, instr(raw, ' ') - 1) GLOB '[0-9]*.[0-9]*'
	AND substr(raw, 1, instr(raw, ' ') - 1) NOT GLOB '*[^0-9.]*'
	AND substr(raw, 1, instr(raw, ' ') - 1) LIKE '%.' || (position + 1);
