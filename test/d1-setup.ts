import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		migratedD1: string;
	}
}

// Migrates a local D1 once with wrangler's own runner, the same one CI and release
// use. Each test file then starts from a copy of it (test/d1.ts).
export default function setup(project: TestProject) {
	const dir = mkdtempSync(join(tmpdir(), 'veckansmat-d1-'));
	execFileSync(
		'npx',
		['wrangler', 'd1', 'migrations', 'apply', 'DB', '--local', '--persist-to', dir],
		{
			// Piped, so a failing migration's error ends up in the thrown message.
			stdio: 'pipe'
		}
	);
	project.provide('migratedD1', dir);
	return () => rmSync(dir, { recursive: true, force: true });
}
