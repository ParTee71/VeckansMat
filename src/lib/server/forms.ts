import { error } from '@sveltejs/kit';
import { voteOf, type Vote } from '../recipes';
import { isWeekStart } from '../weeks';

/** The week a form is about, given by its Monday. */
export function weekOf(form: FormData): string {
	const weekStart = String(form.get('weekStart') ?? '');
	if (!isWeekStart(weekStart)) error(400, 'Okänd vecka');
	return weekStart;
}

/** The dish and the vote a form gives it. */
export function recipeVoteOf(form: FormData): { recipeId: number; vote: Vote } {
	const recipeId = Number(form.get('recipeId'));
	const vote = voteOf(form.get('vote'));
	if (!(Number.isInteger(recipeId) && recipeId > 0)) error(400, 'Okänd rätt');
	if (!vote) error(400, 'Okänd röst');
	return { recipeId, vote };
}
