#!/usr/bin/env node
// PreToolUse hook: runs `npm run verify` before any `git push` and blocks the
// push when it fails, so nothing reaches CI that has not passed locally.
// Exit code 2 blocks the tool call and hands stderr back to Claude. The `if`
// rule in settings.json skips most commands; the regex catches forms it misses,
// such as `cd x && git push`.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

if (!/\bgit\s+push\b/.test(command)) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// The session start no longer installs dependencies (claude-android #46), so do it here.
if (!existsSync(path.join(cwd, 'node_modules'))) {
	const install = spawnSync('npm', ['ci'], { cwd, encoding: 'utf8' });
	if (install.status !== 0) {
		process.stderr.write(`npm ci failed, push blocked:\n${install.stderr}`.slice(0, 4000));
		process.exit(2);
	}
}

const result = spawnSync('npm', ['run', 'verify'], { cwd, encoding: 'utf8' });

if (result.status === 0) process.exit(0);

const output = `${result.stdout}\n${result.stderr}`.trimEnd().split('\n').slice(-40).join('\n');
process.stderr.write(`npm run verify failed, push blocked. Fix this first:\n${output}\n`);
process.exit(2);
