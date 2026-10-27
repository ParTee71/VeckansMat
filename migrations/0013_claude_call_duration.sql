-- How long each call to Claude took, in milliseconds, so slow calls can be measured (#96).
-- Null for the calls made before it was logged.
ALTER TABLE claude_call ADD COLUMN duration_ms INTEGER;
