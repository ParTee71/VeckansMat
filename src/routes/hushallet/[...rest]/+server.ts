import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Hushållet is part of Inställningar now (#127); old links and bookmarks still lead there. A 308
 * keeps the method, so a form sent from a page opened before the move is still saved. */
export const fallback: RequestHandler = ({ params, url }) => {
	redirect(308, `/installningar${params.rest ? `/${params.rest}` : ''}${url.search}`);
};
