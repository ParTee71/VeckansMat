// A made-up recipe site for the Playwright tests, so reading a link never leaves the machine.
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
	'/inget-recept': '<html><body>Inget här</body></html>'
};

const html = (data) =>
	typeof data === 'string'
		? data
		: `<html><head><script type="application/ld+json">${JSON.stringify(data)}</script></head><body></body></html>`;

createServer((request, response) => {
	const data = pages[new URL(request.url, 'http://localhost').pathname];
	if (data) response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html(data));
	else response.writeHead(403).end('Nekad');
}).listen(4174);
