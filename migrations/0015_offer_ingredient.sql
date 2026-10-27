-- Claude chooses the week's dishes after the offers (#109). See docs/beslut/0023-erbjudanden.md.

-- The raw ingredient a dinner is cooked from that Claude made of the offer, such as
-- "kycklingfilé", or '' for what no dinner is made of. Null until Claude has been asked.
ALTER TABLE offer ADD COLUMN ingredient TEXT;

-- The offer a suggested dish was chosen for, as JSON {"chain", "name", "price", "member",
-- "validTo"}. Kept as it was, since a chain's offers are replaced every week.
ALTER TABLE menu_item ADD COLUMN offer TEXT;
