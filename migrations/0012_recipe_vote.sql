-- What the household thinks of a dish: a favourite, ok, or never again. Null when nobody has
-- voted, which counts as ok. Favourites may come back sooner (#98); never again is not suggested
-- (#99).
ALTER TABLE recipe ADD COLUMN vote TEXT CHECK (vote IN ('favorit', 'ok', 'aldrig'));
