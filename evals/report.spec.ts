import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { report } from './report';

let root: string;
let latest: URL;
const read = (file: URL) => JSON.parse(readFileSync(file, 'utf8'));
const costs = () =>
	readFileSync(join(root, 'costs.jsonl'), 'utf8')
		.trim()
		.split('\n')
		.map((line) => JSON.parse(line));
const result = (id: string, costUsd = 0.02) => ({ id, score: 1, failed: [], costUsd });
const of = (spentUsd: number) => ({ cases: 2, spentUsd });
const run = (results: ReturnType<typeof result>[]) => ({ model: 'm', prompt: 'p', results });

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'eval-'));
	latest = new URL('meny/results/latest.json', pathToFileURL(root + '/'));
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'table').mockImplementation(() => {});
});

afterEach(() => {
	rmSync(root, { recursive: true });
	vi.restoreAllMocks();
});

describe('report', () => {
	it('saves a run of every case as the one to compare with', () => {
		report(latest, of(0.04), run([result('a'), result('b')]));
		expect(read(latest).results.map((r: { id: string }) => r.id)).toEqual(['a', 'b']);
		expect(existsSync(new URL('partial.json', latest))).toBe(false);
	});

	it('saves a run of only some cases beside it, leaving the full run as it was', () => {
		report(latest, of(0.04), run([result('a'), result('b')]));
		const saved = readFileSync(latest, 'utf8');
		report(latest, of(0.5), run([result('a', 0.5)]));
		expect(readFileSync(latest, 'utf8')).toBe(saved);
		expect(read(new URL('partial.json', latest)).results).toHaveLength(1);
	});

	it('counts a case that did not finish as left out', () => {
		report(latest, of(0.04), { ...run([]), results: [result('a'), undefined] });
		expect(existsSync(latest)).toBe(false);
	});

	it('writes one line of cost for each run', () => {
		report(latest, of(0.04), run([result('a'), result('b')]));
		report(latest, of(0.5), run([result('a', 0.5)]));
		expect(costs()).toEqual([
			expect.objectContaining({ eval: 'meny', model: 'm', cases: 2, full: true, costUsd: 0.04 }),
			expect.objectContaining({ eval: 'meny', cases: 1, full: false, costUsd: 0.5 })
		]);
	});

	it('writes down what was spent even when no case finished', () => {
		report(latest, of(0.07), run([]));
		expect(costs()).toEqual([expect.objectContaining({ cases: 0, full: false, costUsd: 0.07 })]);
		expect(existsSync(latest)).toBe(false);
	});
});
