-- Who is logged in, for the account button (#127). Filled from Cloudflare Access and Google at
-- run time, so it is never in the repo.

-- The name and the Google profile picture of each account Access has let in, kept so that the
-- picture is not fetched from Google on every visit. fetched_at says when, to fetch it anew.
CREATE TABLE account (
	email TEXT PRIMARY KEY,
	name TEXT,
	picture BLOB,
	picture_type TEXT,
	fetched_at TEXT NOT NULL
);
