#!/usr/bin/env node
// PostToolUse hook: formats a file with Prettier right after Claude writes it,
// so formatting never has to be fixed by hand or flagged in CI.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;

if (file) {
	// --ignore-unknown skips files Prettier has no parser for; .prettierignore still applies.
	spawnSync('npx', ['prettier', '--write', '--ignore-unknown', file], {
		cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
		stdio: 'ignore'
	});
}
