// Made-up dishes for the sort eval, with the sort and base each must get. Never the household's
// real dishes.
import type { Base, Category } from '../../src/lib/recipes';

export interface Case {
	name: string;
	ingredients?: string[];
	category: Category;
	/** The bases that are right; some dishes are eaten with more than one. */
	base: Base | Base[];
}

export const CASES: Case[] = [
	// A soup is a soup, whatever is in it.
	{ name: 'Köttsoppa', category: 'soppa', base: 'annat' },
	{ name: 'Kycklingsoppa med kokos', category: 'soppa', base: ['annat', 'ris'] },
	{
		name: 'Fisksoppa',
		ingredients: ['400 g torsk', '200 g räkor', '2 dl grädde'],
		category: 'soppa',
		base: 'annat'
	},
	{ name: 'Gul ärtsoppa', category: 'soppa', base: 'annat' },
	{ name: 'Linssoppa', category: 'soppa', base: 'annat' },
	{ name: 'Tomatsoppa med ost', category: 'soppa', base: 'annat' },
	{ name: 'Potatis- och purjolökssoppa', category: 'soppa', base: ['annat', 'potatis'] },
	{
		name: 'Korvsoppa',
		ingredients: ['400 g falukorv', '5 potatisar', '1 gul lök'],
		category: 'soppa',
		base: ['annat', 'potatis']
	},
	// Minced meat.
	{ name: 'Köttbullar med potatismos', category: 'kottfars', base: 'potatis' },
	{ name: 'Spaghetti och köttfärssås', category: 'kottfars', base: 'pasta' },
	{ name: 'Lasagne', category: 'kottfars', base: 'pasta' },
	{ name: 'Pannbiff med lök', category: 'kottfars', base: 'potatis' },
	{
		name: 'Tacos',
		ingredients: ['500 g nötfärs', '8 tortillabröd', '1 gurka'],
		category: 'kottfars',
		base: 'annat'
	},
	{
		name: 'Chili con carne',
		ingredients: ['500 g blandfärs', '1 burk kidneybönor', '3 dl ris'],
		category: 'kottfars',
		base: 'ris'
	},
	// Other meat.
	{ name: 'Fläskfilé med klyftpotatis', category: 'kott', base: 'potatis' },
	{ name: 'Biff med bearnaise och pommes', category: 'kott', base: 'potatis' },
	{ name: 'Kalops', category: 'kott', base: 'potatis' },
	{ name: 'Pulled pork i bröd', category: 'kott', base: 'annat' },
	{ name: 'Lammgryta med ris', category: 'kott', base: 'ris' },
	// Sausage.
	{ name: 'Korv stroganoff', category: 'korv', base: 'ris' },
	{ name: 'Stekt falukorv med makaroner', category: 'korv', base: 'pasta' },
	{ name: 'Korv med potatismos', category: 'korv', base: 'potatis' },
	// Chicken.
	{ name: 'Kycklinggryta med curry', category: 'kyckling', base: 'ris' },
	{ name: 'Kycklinglår med rotfrukter', category: 'kyckling', base: ['annat', 'potatis'] },
	{ name: 'Caesarsallad med kyckling', category: 'kyckling', base: 'sallad' },
	{ name: 'Kycklingpasta med pesto', category: 'kyckling', base: 'pasta' },
	// Fish.
	{
		name: 'Fiskgratäng med dill',
		ingredients: ['600 g torskfilé', '1 kg potatis', '2 dl grädde'],
		category: 'fisk',
		base: 'potatis'
	},
	{ name: 'Ugnsbakad lax med kokt potatis', category: 'fisk', base: 'potatis' },
	{ name: 'Fiskpinnar med potatismos', category: 'fisk', base: 'potatis' },
	{ name: 'Räkpasta', category: 'fisk', base: 'pasta' },
	{ name: 'Sushibowl med lax', category: 'fisk', base: 'ris' },
	// Vegetarian.
	{ name: 'Halloumiburgare', category: 'vego', base: 'annat' },
	{
		name: 'Vegetarisk lasagne',
		ingredients: ['1 zucchini', '1 aubergine', 'lasagneplattor', '2 dl riven ost'],
		category: 'vego',
		base: 'pasta'
	},
	{ name: 'Linsgryta med ris', category: 'vego', base: 'ris' },
	{ name: 'Svamprisotto', category: 'vego', base: 'ris' },
	{ name: 'Grekisk sallad med fetaost', category: 'vego', base: 'sallad' },
	{ name: 'Falafel med bulgur', category: 'vego', base: 'annat' },
	// Neither a main meal of a kind nor clear.
	{ name: 'Pannkakor', category: 'ovrigt', base: 'annat' },
	{ name: 'Risgrynsgröt', category: 'ovrigt', base: ['ris', 'annat'] },
	{ name: 'Mormors fredagsspecial', category: 'ovrigt', base: 'annat' }
];
