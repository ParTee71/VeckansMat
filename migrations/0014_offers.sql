-- This week's offers from the chains the household shops at, fetched from the chains' own pages
-- every Monday and when a store is chosen (#107). See docs/beslut/0023-erbjudanden.md.

-- One row per chain, there from the start, so a chain is switched on by changing its row. Which
-- store is chosen lives only here, never in the repo.
CREATE TABLE offer_chain (
	chain TEXT PRIMARY KEY CHECK (chain IN ('ica', 'willys', 'coop', 'lidl')),
	enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
	-- The chain's own id for the store. Null for Lidl, whose offers are the same in every store.
	store_id TEXT,
	store_name TEXT,
	-- The last fetch that worked, and when the chain was last asked anything, so asks can be spaced.
	fetched_at TEXT,
	requested_at TEXT,
	-- Why the last fetch failed, in Swedish for the household; null when it worked.
	error TEXT
) WITHOUT ROWID;

INSERT INTO offer_chain (chain) VALUES ('ica'), ('willys'), ('coop'), ('lidl');

-- What a chain had on offer when it was last fetched. A new fetch replaces the chain's rows.
CREATE TABLE offer (
	id INTEGER PRIMARY KEY,
	chain TEXT NOT NULL REFERENCES offer_chain (chain),
	name TEXT NOT NULL,
	brand TEXT NOT NULL DEFAULT '',
	-- The package, such as "500 g" or "ca 1,2 kg".
	size TEXT NOT NULL DEFAULT '',
	-- As the chain puts it: "89 kr/kg", "2 för 40 kr".
	price TEXT NOT NULL,
	compare_price TEXT NOT NULL DEFAULT '',
	-- The chain's own word for the section, when it gives one.
	category TEXT NOT NULL DEFAULT '',
	-- Only for members, such as Stammis, Willys Plus or Lidl Plus.
	member INTEGER NOT NULL DEFAULT 0 CHECK (member IN (0, 1)),
	-- Dates in Sweden, both days included. valid_from is null when the chain does not say.
	valid_from TEXT,
	valid_to TEXT NOT NULL
);

CREATE INDEX offer_by_chain ON offer (chain, valid_to);
