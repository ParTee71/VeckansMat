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

// npm ci is the heavy part (about 20 s) and runs only when something needs it: the
// push check installs dependencies itself (verify-before-push.mjs). In a project
// thread this hook runs even when the thread never touches the repo (claude-android #46).
if (!existsSync(path.join(root, 'node_modules'))) {
	console.log(
		'VeckansMat: node_modules saknas. Kör npm ci innan du testar; push-kontrollen gör det själv.'
	);
	process.exit(0);
}

// The image's preinstalled Chromium may be older than the Playwright version in
// package.json, so fetch the matching one, as CI does. When they already match it
// takes about a second (measured 2026-11-10).
if (!run('npx', ['playwright', 'install', 'chromium'])) {
	console.log('playwright install chromium failed; e2e tests will not start.');
}
