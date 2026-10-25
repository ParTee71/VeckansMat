-- What sort of dish a recipe is, and what it is served with, for the cards in Rätter. Null until
-- Claude has guessed. category_guessed is 1 while both are Claude's guess, and 0 once the
-- household has chosen, so a guess never replaces a choice. See docs/beslut/0020-sorter-pa-ratter.md.
ALTER TABLE recipe ADD COLUMN category TEXT
	CHECK (category IN ('soppa', 'kott', 'kottfars', 'kyckling', 'fisk', 'korv', 'vego', 'ovrigt'));
ALTER TABLE recipe ADD COLUMN base TEXT
	CHECK (base IN ('potatis', 'pasta', 'ris', 'sallad', 'annat'));
ALTER TABLE recipe ADD COLUMN category_guessed INTEGER NOT NULL DEFAULT 0
	CHECK (category_guessed IN (0, 1));
