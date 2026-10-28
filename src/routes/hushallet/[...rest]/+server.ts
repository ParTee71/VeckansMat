import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Hushållet is part of Inställningar now (#127); old links and bookmarks still lead there. */
export const GET: RequestHandler = ({ params, url }) => {
	redirect(308, `/installningar${params.rest ? `/${params.rest}` : ''}${url.search}`);
};
