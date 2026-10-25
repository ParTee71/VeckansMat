-- Every call to Claude, with what it cost. The monthly cap is counted from here.
-- See docs/beslut/0006-claude-i-appen.md.
CREATE TABLE claude_call (
	id INTEGER PRIMARY KEY,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	-- What the call was for, such as 'recipe'.
	purpose TEXT NOT NULL,
	model TEXT NOT NULL,
	input_tokens INTEGER NOT NULL,
	output_tokens INTEGER NOT NULL,
	cost_usd REAL NOT NULL
);

CREATE INDEX claude_call_created_at ON claude_call (created_at);
