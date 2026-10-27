// A made-up recipe site for the Playwright tests, so reading a link never leaves the machine,
// and a stand-in for Claude's API under /claude, so no test calls the real one. It reads recipes
// and suggests weeks.
import { createServer } from 'node:http';

const recipe = (name, extra = {}) => ({
	'@context': 'https://schema.org',
	'@type': 'Recipe',
	name,
	recipeYield: '4 portioner',
	totalTime: 'PT35M',
	recipeIngredient: ['1 kg pumpa', '1 msk riven ingefära', '8 dl grönsaksbuljong'],
	recipeInstructions: [
		{ '@type': 'HowToStep', text: 'Skala och tärna pumpan.' },
		{ '@type': 'HowToStep', text: 'Koka allt mjukt och mixa.' }
	],
	...extra
});

const pages = {
	'/pumpasoppa': recipe('Pumpasoppa med ingefära'),
	'/linssoppa': recipe('Linssoppa', { recipeIngredient: ['3 dl röda linser', '1 gul lök'] }),
	'/frallor': recipe('Frallor med ost', { recipeIngredient: ['5 dl vetemjöl', '2 dl riven ost'] }),
	'/fiskgratang': recipe('Fiskgratäng'),
	'/inget-recept': '<html><body>Inget här</body></html>',
	'/utan-jsonld': '<html><body><h1>Kålsoppa</h1><ul><li>1 vitkål</li></ul></body></html>'
};

const answer = (name, ingredients = [], extra = {}) => ({
	name,
	servings: null,
	timeMinutes: null,
	ingredients,
	instructions: ingredients.length ? ['Blanda och laga.'] : [],
	...extra
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DINNERS = [
	'Blomkålssoppa',
	'Kycklinggryta',
	'Tacos',
	'Laxpudding',
	'Hemgjord pizza',
	'Kycklinglår med rotfrukter',
	'Pannkakor'
];

/**
 * A week for the days the request asks for, or new dishes for a day swapped. Like a model that
 * slips, it chooses the first dish never to be suggested for Monday, which the app leaves out.
 */
function menu(text) {
	if (text.includes('Krascha')) return 'inget menyförslag';
	const never = text.match(/<never_suggest>\n- (.+)/)?.[1];
	const asked = text.split('\n').find((line) => /^(Plan these|Suggest)/.test(line));
	const slots = [...asked.matchAll(/(\w+day) (dinner|lunch)/g)].map(([, day, meal]) => ({
		weekday: DAYS.indexOf(day) + 1,
		meal
	}));
	const again = asked.startsWith('Suggest');
	return {
		rows: slots.map(({ weekday, meal }) => ({
			weekday,
			meal,
			dish: again
				? 'Fiskpinnar'
				: meal === 'lunch'
					? 'Varm korv'
					: (weekday === 1 && never) || DINNERS[weekday - 1],
			reason: again ? 'Snabbt' : 'Senast v. 36',
			alternatives: (again ? ['Köttbullar', 'Lasagne'] : ['Pytt i panna', 'Korv stroganoff']).map(
				(dish) => ({ dish, reason: 'Ett annat förslag' })
			)
		}))
	};
}

/** A made-up list: one item per dish, and a guess for each dish with just a name. */
function shopping(text) {
	const dishes = [...text.matchAll(/^(\d+)\. (.+): cook \d+ portions\. (No|Lines)/gm)].map(
		([, number, name, lines]) => ({ number: Number(number), name, guess: lines === 'No' })
	);
	return {
		guesses: dishes
			.filter((dish) => dish.guess)
			.map((dish) => ({ dish: dish.number, ingredients: ['2 gula lökar', '500 g potatis'] })),
		items: [
			...dishes.map((dish) => ({
				text: `Till ${dish.name.toLowerCase()}`,
				amount: '1 st',
				section: 'Skafferi',
				lines: [`${dish.number}.1`]
			})),
			{ text: 'Gul lök', amount: '2 st', section: 'Frukt och grönt', lines: [] },
			{ text: 'Salt', amount: '', section: 'Finns kanske hemma', lines: [] }
		]
	};
}

/** Soups are soups and the rest is fish, eaten with potatoes, so a test can tell they were sorted. */
function categories(text) {
	return {
		dishes: [...text.matchAll(/^(\d+)\. ([^:\n]+)/gm)].map(([, number, name]) => ({
			dish: Number(number),
			category: /soppa/i.test(name) ? 'soppa' : 'fisk',
			base: /soppa/i.test(name) ? 'annat' : 'potatis'
		}))
	};
}

/** What the stand-in reads from a request: a recipe by what the text says, and its cost. */
function claude(request) {
	const content = request.messages[0].content;
	const text = content.map((block) => block.text ?? '').join('\n');
	const { properties } = request.output_config.format.schema;
	if (properties.rows) return [menu(text)];
	if (properties.items) return [shopping(text)];
	if (properties.dishes) return [categories(text)];
	// Only photos the phone made smaller, which are always JPEG.
	if (content.some((block) => block.source?.media_type === 'image/jpeg')) {
		return [answer('Saffransbullar', ['50 g jäst', '5 dl mjölk'], { servings: 30 })];
	}
	if (text.includes('Pannkakor')) return [answer('Pannkakor', ['3 dl vetemjöl', '6 dl mjölk'])];
	if (text.includes('Kålsoppa')) return [answer('Kålsoppa', ['1 vitkål'])];
	// Costs more than the month's cap of $5 at Haiku's $0.10 per million input tokens.
	if (text.includes('Dyr gryta')) return [answer('Dyr gryta', ['1 kg oxkött']), 60_000_000];
	return [answer('')];
}

function messages(request, response) {
	let body = '';
	request.on('data', (chunk) => (body += chunk));
	request.on('end', () => {
		const params = JSON.parse(body);
		const [reply, inputTokens = 1500] = claude(params);
		response.writeHead(200, { 'content-type': 'application/json' }).end(
			JSON.stringify({
				id: 'msg_e2e',
				type: 'message',
				role: 'assistant',
				model: params.model,
				content: [
					{ type: 'text', text: typeof reply === 'string' ? reply : JSON.stringify(reply) }
				],
				stop_reason: 'end_turn',
				stop_sequence: null,
				usage: { input_tokens: inputTokens, output_tokens: 300 }
			})
		);
	});
}

const html = (data) =>
	typeof data === 'string'
		? data
		: `<html><head><script type="application/ld+json">${JSON.stringify(data)}</script></head><body></body></html>`;

createServer((request, response) => {
	if (request.method === 'POST' && request.url === '/claude/v1/messages') {
		return messages(request, response);
	}
	const data = pages[new URL(request.url, 'http://localhost').pathname];
	if (data) response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html(data));
	else response.writeHead(403).end('Nekad');
}).listen(4174);
