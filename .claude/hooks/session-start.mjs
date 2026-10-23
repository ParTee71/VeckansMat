#!/usr/bin/env node
// SessionStart hook: makes a fresh cloud session ready to run checks and tests.
// Locally it does nothing, since a developer machine is already set up.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const run = (command, args) =>
	spawnSync(command, args, { cwd: root, stdio: 'ignore' }).status === 0;

if (!existsSync(path.join(root, 'node_modules')) && !run('npm', ['ci'])) {
	console.log('npm ci failed; run it by hand before testing.');
}

// The image's preinstalled Chromium may be older than the Playwright version in
// package.json, so fetch the matching one, as CI does.
if (!run('npx', ['playwright', 'install', 'chromium'])) {
	console.log('playwright install chromium failed; e2e tests will not start.');
}
