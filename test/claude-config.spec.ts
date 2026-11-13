import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const claudeDir = path.resolve(import.meta.dirname, '../.claude');
const readme = readFileSync(path.join(claudeDir, 'README.md'), 'utf8');

const skills = readdirSync(path.join(claudeDir, 'skills'));
const agents = readdirSync(path.join(claudeDir, 'agents')).map((file) => file.replace(/\.md$/, ''));
const hooks = readdirSync(path.join(claudeDir, 'hooks'));

const frontmatterName = (file: string) =>
	readFileSync(file, 'utf8').match(/^---\n[\s\S]*?^name: (.+)$/m)?.[1];

describe('.claude/README.md', () => {
	it.each([...skills, ...agents, ...hooks])('lists %s', (name) => {
		expect(readme).toContain(`\`${name}\``);
	});

	it('lists nothing that does not exist', () => {
		const listed = [...readme.matchAll(/^\| `([^`]+)`\s+\|/gm)].map((match) => match[1]);
		expect(listed.sort()).toEqual([...skills, ...agents, ...hooks].sort());
	});
});

describe('skills and agents', () => {
	it.each(skills)('skill %s is named after its directory', (skill) => {
		expect(frontmatterName(path.join(claudeDir, 'skills', skill, 'SKILL.md'))).toBe(skill);
	});

	it.each(agents)('agent %s is named after its file', (agent) => {
		expect(frontmatterName(path.join(claudeDir, 'agents', `${agent}.md`))).toBe(agent);
	});

	it.each(skills.filter((skill) => readme.match(new RegExp(`\`${skill}\`.*oförändrad`))))(
		'copied skill %s keeps its source and licence',
		(skill) => {
			expect(existsSync(path.join(claudeDir, 'skills', skill, 'SOURCE.md'))).toBe(true);
			expect(existsSync(path.join(claudeDir, 'skills', skill, 'LICENSE.txt'))).toBe(true);
		}
	);
});

describe('.claude/settings.json', () => {
	const settings = JSON.parse(readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
	const preToolUse: { command: string; onFailure?: string }[] = settings.hooks.PreToolUse.flatMap(
		(group: { hooks: unknown[] }) => group.hooks
	);

	// A guard that crashes or times out must deny the action, not let it through (claude-android #72).
	it.each(['verify-before-push.mjs', 'plan-approved.mjs'])('guard %s fails closed', (hook) => {
		expect(preToolUse.find((h) => h.command.includes(hook))?.onFailure).toBe('block');
	});
});
