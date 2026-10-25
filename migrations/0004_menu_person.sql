-- Who eats a week. Their requirements apply that week. See docs/beslut/0012-datamodell.md.
CREATE TABLE menu_person (
	menu_id INTEGER NOT NULL REFERENCES menu (id) ON DELETE CASCADE,
	person_id INTEGER NOT NULL REFERENCES person (id) ON DELETE CASCADE,
	PRIMARY KEY (menu_id, person_id)
) WITHOUT ROWID;
