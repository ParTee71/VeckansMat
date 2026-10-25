import { env } from 'cloudflare:workers';
import { listMenus } from '#lib/server/db/menus.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ menus: await listMenus(env.DB) });
