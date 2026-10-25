// What every eval does with its results: scores each case by its rules, shows the run next to
// the last saved one, and saves it, so that a change to a prompt is compared with the run before.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/** A case's result: the share of rules that held, and the names of those that did not. */
export interface Scored {
	id: string;
	score: number;
	failed: string[];
}

/** Each rule passed or failed, by its name, as a score. */
export function score(checks: Record<string, boolean>): Omit<Scored, 'id'> {
	const failed = Object.keys(checks).filter((k) => !checks[k]);
	const total = Object.keys(checks).length;
	return { score: (total - failed.length) / total, failed };
}

const percent = (n: number | undefined) => (n === undefined ? '–' : `${Math.round(n * 100)} %`);

/** Prints the run beside the last saved one, and saves it in place of that one. */
export function report<R extends Scored>(
	file: URL,
	run: { model: string; prompt: string; costUsd: number; results: R[] } & Record<string, unknown>,
	columns: (result: R) => Record<string, unknown> = () => ({})
) {
	const { results } = run;
	if (!results.length) return;
	const previous = existsSync(file)
		? (JSON.parse(readFileSync(file, 'utf8')) as { results: Scored[]; score: number })
		: null;
	const total = results.reduce((sum, r) => sum + r.score, 0) / results.length;
	console.table(
		results.map((r) => ({
			fall: r.id,
			förut: percent(previous?.results.find((p) => p.id === r.id)?.score),
			nu: percent(r.score),
			...columns(r),
			fel: r.failed.join('; ')
		}))
	);
	console.log(
		`Totalt ${percent(total)} (förut ${percent(previous?.score)}), ${run.model}, $${run.costUsd.toFixed(4)}`
	);
	mkdirSync(new URL('.', file), { recursive: true });
	writeFileSync(
		file,
		JSON.stringify(
			{
				date: new Date().toISOString(),
				...run,
				prompt: createHash('sha256').update(run.prompt).digest('hex').slice(0, 12),
				score: total,
				results
			},
			null,
			'\t'
		) + '\n'
	);
}
