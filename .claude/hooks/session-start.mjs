#!/usr/bin/env node
// SessionStart hook: makes a fresh cloud session ready to run checks and tests.
// Locally it does nothing, since a developer machine is already set up.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

if (!existsSync(path.join(root, 'node_modules'))) {
	const install = spawnSync('npm', ['ci'], { cwd: root, stdio: 'ignore' });
	if (install.status !== 0) {
		console.log('npm ci failed; run it by hand before testing.');
	}
}

// Cloud images ship a Chromium that may be older than the Playwright version in
// package.json. playwright.config.ts uses it when CHROMIUM_PATH is set.
const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
const envFile = process.env.CLAUDE_ENV_FILE;
if (browsers && envFile && existsSync(browsers)) {
	const chromium = readdirSync(browsers)
		.filter((name) => /^chromium-\d+$/.test(name))
		.sort()
		.at(-1);
	const executable = chromium && path.join(browsers, chromium, 'chrome-linux', 'chrome');
	if (executable && existsSync(executable)) {
		appendFileSync(envFile, `export CHROMIUM_PATH=${executable}\n`);
	}
}
