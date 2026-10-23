#!/usr/bin/env node
// PostToolUse hook: formats a file with Prettier right after Claude writes it,
// so formatting never has to be fixed by hand or flagged in CI.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;

if (file) {
	// --ignore-unknown skips files Prettier has no parser for; .prettierignore still applies.
	// The local binary starts in a fraction of the time `npx` needs.
	const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
	spawnSync(
		path.join(root, 'node_modules', '.bin', 'prettier'),
		['--write', '--ignore-unknown', file],
		{
			cwd: root,
			stdio: 'ignore'
		}
	);
}
