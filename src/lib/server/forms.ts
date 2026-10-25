import { error } from '@sveltejs/kit';
import { isWeekStart } from '../weeks';

/** The week a form is about, given by its Monday. */
export function weekOf(form: FormData): string {
	const weekStart = String(form.get('weekStart') ?? '');
	if (!isWeekStart(weekStart)) error(400, 'Okänd vecka');
	return weekStart;
}
