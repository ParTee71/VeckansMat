#!/usr/bin/env node
// Marks open pull requests that have a merge conflict with their base branch, see
// .github/workflows/konflikter.yml. A conflicted PR gets no new CI run, so without this
// a session watching it waits for a result that never comes. The comment wakes it.
// - push to main: checks every open PR, since any of them may now conflict.
// - pull_request: checks that PR, so the label goes away once the conflict is resolved.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CONFLICT_LABEL = 'konflikt';
const REPO = process.env.GITHUB_REPOSITORY ?? 'ParTee71/VeckansMat';

/** What to do with the label, given GitHub's mergeable flag and whether the PR has it. */
export function labelAction(mergeable, hasLabel) {
	// null: GitHub never finished computing it, so leave the PR as it is.
	if (mergeable === null) return null;
	if (mergeable === false) return hasLabel ? null : 'add';
	return hasLabel ? 'remove' : null;
}

/** GitHub computes mergeability lazily after a push; null means not yet. */
export async function settledPull(number, getPull, { attempts = 6, delayMs = 10_000 } = {}) {
	let pull = await getPull(number);
	for (let attempt = 1; pull.mergeable === null && attempt < attempts; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		pull = await getPull(number);
	}
	return pull;
}

export function conflictComment(base) {
	return (
		`Den här PR:en har fått en merge-konflikt mot \`${base}\` och kan inte mergas. ` +
		`Hämta \`${base}\`, merga in den i grenen, lös konflikten enligt avsnittet Konflikter i ` +
		'`implement-issue` och pusha. Etiketten tas bort av sig själv när konflikten är löst.'
	);
}

async function github(path, { method = 'GET', body } = {}) {
	const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
		method,
		headers: {
			accept: 'application/vnd.github+json',
			authorization: `Bearer ${process.env.GITHUB_TOKEN}`
		},
		body: body && JSON.stringify(body),
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) {
		const error = new Error(`GitHub svarade ${response.status} på ${method} ${path}`);
		error.status = response.status;
		throw error;
	}
	return response.status === 204 ? null : response.json();
}

async function ensureLabel() {
	try {
		await github('/labels', {
			method: 'POST',
			body: { name: CONFLICT_LABEL, color: 'b60205', description: 'Merge-konflikt mot main' }
		});
	} catch (error) {
		// 422: the label already exists.
		if (error.status !== 422) throw error;
	}
}

async function check(number) {
	const pull = await settledPull(number, (n) => github(`/pulls/${n}`));
	const hasLabel = pull.labels.some((label) => label.name === CONFLICT_LABEL);
	const action = labelAction(pull.mergeable, hasLabel);
	console.log(`#${number}: ${pull.mergeable_state}${action ? ` → ${action}` : ''}`);
	if (action === 'add') {
		await ensureLabel();
		await github(`/issues/${number}/labels`, {
			method: 'POST',
			body: { labels: [CONFLICT_LABEL] }
		});
		await github(`/issues/${number}/comments`, {
			method: 'POST',
			body: { body: conflictComment(pull.base.ref) }
		});
	} else if (action === 'remove') {
		await github(`/issues/${number}/labels/${encodeURIComponent(CONFLICT_LABEL)}`, {
			method: 'DELETE'
		});
	}
}

async function main() {
	const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
	const numbers = event.pull_request
		? [event.pull_request.number]
		: (await github('/pulls?state=open&per_page=100')).map((pull) => pull.number);
	for (const number of numbers) await check(number);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	await main();
}
