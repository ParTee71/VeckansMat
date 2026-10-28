import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../../../test/d1';
import { isStale, needsRefresh, pictureUrl, saveIdentity } from './account';
import { getAccount, getPicture, saveAccount } from './db/account';

let db: D1Database;
useTestDb((test) => (db = test));

afterEach(() => vi.unstubAllGlobals());

const GOOGLE_PICTURE = 'https://lh3.googleusercontent.com/a/exempel=s96-c';

describe('the picture', () => {
	it('comes only from Google, in the size the app needs', () => {
		expect(pictureUrl(GOOGLE_PICTURE)).toBe('https://lh3.googleusercontent.com/a/exempel=s192-c');
		expect(pictureUrl('https://exempel.se/bild.png')).toBeNull();
		expect(pictureUrl('https://drive.googleusercontent.com/fil')).toBeNull();
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

it('the browser is asked for a missing account or picture, or an old one', () => {
	const now = new Date('2030-01-02T08:00:00Z');
	const fetchedAt = '2030-01-01T08:00:00.000Z';
	expect(needsRefresh(null, now)).toBe(true);
	expect(needsRefresh({ name: 'Alex', fetchedAt, hasPicture: false }, now)).toBe(true);
	expect(needsRefresh({ name: 'Alex', fetchedAt, hasPicture: true }, now)).toBe(false);
	expect(
		needsRefresh({ name: 'Alex', fetchedAt, hasPicture: true }, new Date('2030-01-09T08:00:00Z'))
	).toBe(true);
});

describe('an identity from Access', () => {
	/** Answers as Google would, and keeps what was asked for. */
	function stubGoogle(picture: Response = image()) {
		const asked: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				asked.push(url);
				return picture;
			})
		);
		return asked;
	}

	const image = (bytes = 3, type = 'image/png') =>
		new Response(new Uint8Array(bytes), { headers: { 'content-type': type } });

	it('gives the account its name and the Google picture Access keeps under oidc_fields', async () => {
		const asked = stubGoogle();
		const identity = {
			email: 'Alex@exempel.se',
			name: 'Alex Exempel',
			oidc_fields: { picture: GOOGLE_PICTURE }
		};
		expect(await saveIdentity(db, 'alex@exempel.se', identity)).toBe(true);
		expect(asked).toEqual(['https://lh3.googleusercontent.com/a/exempel=s192-c']);
		expect(await getAccount(db, 'alex@exempel.se')).toMatchObject({
			name: 'Alex Exempel',
			hasPicture: true
		});
		const picture = await getPicture(db, 'alex@exempel.se');
		expect(picture?.type).toBe('image/png');
		expect(picture?.bytes.byteLength).toBe(3);
	});

	it('gives no picture that is missing, too large, not an image or not Google’s', async () => {
		const sam = { email: 'sam@exempel.se', name: 'Sam' };
		for (const [identity, picture] of [
			[sam, image()],
			[{ ...sam, picture: GOOGLE_PICTURE }, image(300_000)],
			[{ ...sam, picture: GOOGLE_PICTURE }, image(3, 'text/html')],
			[{ ...sam, picture: GOOGLE_PICTURE }, image(3, 'image/svg+xml')],
			[{ ...sam, picture: 'https://exempel.se/bild.png' }, image()]
		] as const) {
			stubGoogle(picture);
			expect(await saveIdentity(db, 'sam@exempel.se', identity)).toBe(true);
			expect(await getAccount(db, 'sam@exempel.se')).toMatchObject({
				name: 'Sam',
				hasPicture: false
			});
			expect(await getPicture(db, 'sam@exempel.se')).toBeNull();
		}
	});

	it('keeps the picture the account had when Google does not answer', async () => {
		const before = { bytes: new Uint8Array(5).buffer, type: 'image/png' };
		await saveAccount(db, 'alex@exempel.se', 'Alex', before, new Date('2030-01-01'));
		stubGoogle(new Response(null, { status: 503 }));
		const identity = { email: 'alex@exempel.se', name: 'Alex Exempel', picture: GOOGLE_PICTURE };
		expect(await saveIdentity(db, 'alex@exempel.se', identity)).toBe(true);
		expect(await getAccount(db, 'alex@exempel.se')).toMatchObject({
			name: 'Alex Exempel',
			hasPicture: true
		});
		expect((await getPicture(db, 'alex@exempel.se'))?.bytes.byteLength).toBe(5);
		// So it is fetched again on the next visit.
		expect((await getAccount(db, 'alex@exempel.se'))?.fetchedAt).toBe('2030-01-01T00:00:00.000Z');
	});

	it('is fetched again soon when Google does not answer the first time', async () => {
		stubGoogle(new Response(null, { status: 503 }));
		const identity = { email: 'sam@exempel.se', name: 'Sam', picture: GOOGLE_PICTURE };
		expect(await saveIdentity(db, 'sam@exempel.se', identity)).toBe(true);
		const stored = await getAccount(db, 'sam@exempel.se');
		expect(stored).toMatchObject({ name: 'Sam', hasPicture: false });
		expect(isStale(stored!.fetchedAt, new Date())).toBe(true);
	});

	it('of someone else, or that is not one, is never saved', async () => {
		const asked = stubGoogle();
		for (const identity of [
			{ email: 'annan@exempel.se', name: 'Annan', picture: GOOGLE_PICTURE },
			{ name: 'Sam' },
			null,
			'sam@exempel.se'
		]) {
			expect(await saveIdentity(db, 'sam@exempel.se', identity)).toBe(false);
		}
		expect(asked).toEqual([]);
		expect(await getAccount(db, 'sam@exempel.se')).toBeNull();
	});
});
