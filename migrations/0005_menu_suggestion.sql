-- Claude's suggestions for a week. See docs/beslut/0014-veckoforslag.md.

-- Why Claude chose the dish, shown under it. Null when the line was written by hand, which is
-- how a new suggestion for the whole week knows to leave it.
ALTER TABLE menu_item ADD COLUMN reason TEXT;

-- The dishes a tap on swap goes through, in order, as a JSON array of {"text", "reason"}.
ALTER TABLE menu_item ADD COLUMN alternatives TEXT;

-- The dishes swapped away from the day, as a JSON array of names, so Claude never brings them
-- back.
ALTER TABLE menu_item ADD COLUMN passed_on TEXT;

-- What the household wished for the week when Claude suggested it. Kept apart from note, which
-- holds what was written on an old note.
ALTER TABLE menu ADD COLUMN wish TEXT;
