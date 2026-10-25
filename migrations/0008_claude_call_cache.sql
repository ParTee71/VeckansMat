-- How much of each call's input was written to Claude's cache and read from it, so that the
-- cached menu prompt can be weighed against what it costs (#44). input_tokens keeps counting all
-- input, these included. Older calls count as none.
ALTER TABLE claude_call ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE claude_call ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0;
