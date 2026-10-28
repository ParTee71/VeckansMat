import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../../../test/d1';
import { identityUrl, isStale, pictureUrl, refreshAccount } from './account';
import { getAccount, getPicture } from './db/account';

let db: D1Database;
useTestDb((test) => (db = test));

afterEach(() => vi.unstubAllGlobals());

/** A token as Access sends it, from a made-up team; only its payload is read. */
const token = (payload: object) =>
	`e30.${btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}.sig`;

const GOOGLE_PICTURE = 'https://lh3.googleusercontent.com/a/exempel=s96-c';

describe('the identity endpoint', () => {
	it('is the issuing Access team', () => {
		expect(identityUrl(token({ iss: 'https://exempel.cloudflareaccess.com' }))).toBe(
			'https://exempel.cloudflareaccess.com/cdn-cgi/access/get-identity'
		);
	});

	it('is never anyone else', () => {
		expect(identityUrl(token({ iss: 'https://exempel.se' }))).toBeNull();
		expect(identityUrl(token({ iss: 'http://exempel.cloudflareaccess.com' }))).toBeNull();
		expect(identityUrl('inte en token')).toBeNull();
	});
});

describe('the picture', () => {
	it('comes only from Google, in the size the app needs', () => {
		expect(pictureUrl(GOOGLE_PICTURE)).toBe('https://lh3.googleusercontent.com/a/exempel=s192-c');
		expect(pictureUrl('https://exempel.se/bild.png')).toBeNull();
		expect(pictureUrl('http://lh3.googleusercontent.com/a/exempel')).toBeNull();
		expect(pictureUrl('inte en adress')).toBeNull();
	});

	it('may come from elsewhere in the browser tests', () => {
		expect(pictureUrl('http://localhost:4174/access/bild', true)).toBe(
			'http://localhost:4174/access/bild'
		);
	});
});

it('what was fetched is fetched again after a week', () => {
	const fetched = '2030-01-01T08:00:00.000Z';
	expect(isStale(fetched, new Date('2030-01-07T08:00:00Z'))).toBe(false);
	expect(isStale(fetched, new Date('2030-01-08T08:00:00Z'))).toBe(true);
});

describe('an account', () => {
	const ACCESS = token({ iss: 'https://exempel.cloudflareaccess.com' });

	/** Answers as Access and Google would, and keeps what was asked for. */
	function stubFetch(identity: object | null, picture: Response = image()) {
		const asked: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init?: RequestInit) => {
				asked.push(url);
				if (url.endsWith('/get-identity')) {
					expect(new Headers(init?.headers).get('cookie')).toBe(`CF_Authorization=${ACCESS}`);
					return identity ? Response.json(identity) : new Response(null, { status: 401 });
				}
				return picture;
			})
		);
		return asked;
	}

	const image = (bytes = 3, type = 'image/png') =>
		new Response(new Uint8Array(bytes), { headers: { 'content-type': type } });

	it('gets its name and Google picture, wherever Access keeps the claim', async () => {
		const asked = stubFetch({
			email: 'alex@exempel.se',
			name: 'Alex Exempel',
			custom: { picture: GOOGLE_PICTURE }
		});
		await refreshAccount(db, 'alex@exempel.se', ACCESS);
		expect(asked).toEqual([
			'https://exempel.cloudflareaccess.com/cdn-cgi/access/get-identity',
			'https://lh3.googleusercontent.com/a/exempel=s192-c'
		]);
		expect(await getAccount(db, 'alex@exempel.se')).toMatchObject({
			name: 'Alex Exempel',
			hasPicture: true
		});
		const picture = await getPicture(db, 'alex@exempel.se');
		expect(picture?.type).toBe('image/png');
		expect(picture?.bytes.byteLength).toBe(3);
	});

	it('is kept without a picture that is missing, too large or not an image', async () => {
		for (const [identity, picture] of [
			[{ name: 'Sam' }, image()],
			[{ name: 'Sam', picture: GOOGLE_PICTURE }, image(300_000)],
			[{ name: 'Sam', picture: GOOGLE_PICTURE }, image(3, 'text/html')],
			[{ name: 'Sam', picture: 'https://exempel.se/bild.png' }, image()]
		] as const) {
			stubFetch(identity, picture);
			await refreshAccount(db, 'sam@exempel.se', ACCESS);
			expect(await getAccount(db, 'sam@exempel.se')).toMatchObject({
				name: 'Sam',
				hasPicture: false
			});
			expect(await getPicture(db, 'sam@exempel.se')).toBeNull();
		}
	});

	it('is not saved when the identity cannot be read, so the next visit tries again', async () => {
		stubFetch(null);
		await refreshAccount(db, 'sam@exempel.se', ACCESS);
		expect(await getAccount(db, 'sam@exempel.se')).toBeNull();
	});

	it('is not asked for from anyone but Access', async () => {
		const asked = stubFetch({ name: 'Sam' });
		await refreshAccount(db, 'sam@exempel.se', token({ iss: 'https://exempel.se' }));
		expect(asked).toEqual([]);
	});
});
