import { env } from 'cloudflare:workers';
import { getWeek } from '#lib/server/db/menus.ts';
import { shownWeek, WEEKDAY_NAMES } from '#lib/weeks.ts';
import type { PageServerLoad } from './$types';

// The dish comes from the layout. From Veckan the link names the week and the day; from the
// dish's page it is the week Veckan shows, whose eaters the portions start from.
export const load: PageServerLoad = async ({ url }) => {
	const { weekStart } = shownWeek(url.searchParams.get('vecka'));
	const day = Number(url.searchParams.get('dag'));
	const week = await getWeek(env.DB, weekStart);
	const fromWeek = url.searchParams.has('vecka');
	return {
		eaters: week.eaters.length,
		dayName: (fromWeek && WEEKDAY_NAMES[day - 1]) || null,
		// Back to the week the dish was opened from, or else to the dish.
		back: fromWeek ? `/?vecka=${weekStart}` : null
	};
};
