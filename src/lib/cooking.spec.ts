import { describe, expect, it } from 'vitest';
import { amountText, scaleLine, portionsFor, stepMinutes } from './cooking';

describe('scaleLine', () => {
	it('scales a whole number with its unit', () => {
		expect(scaleLine('600 g torskfilé', 1.5)).toEqual({ amount: '900 g', text: 'torskfilé' });
		expect(scaleLine('2 dl grädde', 1.5)).toEqual({ amount: '3 dl', text: 'grädde' });
	});

	it('writes fractions the Swedish way', () => {
		expect(scaleLine('1 gul lök', 1.5)).toEqual({ amount: '1 ½', text: 'gul lök' });
		expect(scaleLine('1 msk curry', 0.5)).toEqual({ amount: '½ msk', text: 'curry' });
		expect(scaleLine('3 dl ris', 1.5)).toEqual({ amount: '4 ½ dl', text: 'ris' });
	});

	it('reads decimals with a comma, fractions and mixed numbers', () => {
		expect(scaleLine('1,5 dl mjölk', 2).amount).toBe('3 dl');
		expect(scaleLine('½ tsk salt', 2).amount).toBe('1 tsk');
		expect(scaleLine('1½ msk smör', 2).amount).toBe('3 msk');
		expect(scaleLine('1 1/2 dl vatten', 2).amount).toBe('3 dl');
		expect(scaleLine('1/2 citron', 2).amount).toBe('1');
	});

	it('scales both ends of a range', () => {
		expect(scaleLine('2–3 vitlöksklyftor', 2)).toEqual({ amount: '4–6', text: 'vitlöksklyftor' });
		expect(scaleLine('1-2 dl buljong', 2).amount).toBe('2–4 dl');
	});

	it('scales only the first number, so the size of a can stays', () => {
		expect(scaleLine('1 burk (400 g) krossade tomater', 2)).toEqual({
			amount: '2',
			text: 'burk (400 g) krossade tomater'
		});
	});

	it('scales a number later in the line where it is', () => {
		expect(scaleLine('Kycklingfilé, 600 g', 1.5)).toEqual({
			amount: '',
			text: 'Kycklingfilé, 900 g'
		});
	});

	it('takes no number without a unit later in the line for an amount', () => {
		expect(scaleLine('Matlagningsgrädde 15 %, 2 dl', 2).text).toBe('Matlagningsgrädde 15 %, 4 dl');
		expect(scaleLine('Vetemjöl typ 00, 5 dl', 2).text).toBe('Vetemjöl typ 00, 10 dl');
		expect(scaleLine('Ägg, storlek 2', 2).text).toBe('Ägg, storlek 2');
	});

	it('keeps a line without a number as it is', () => {
		expect(scaleLine('salt och peppar', 2)).toEqual({ amount: '', text: 'salt och peppar' });
	});

	it('keeps the amount as written when nothing is scaled', () => {
		expect(scaleLine('1,5 dl mjölk', 1)).toEqual({ amount: '1,5 dl', text: 'mjölk' });
	});

	it('does not take the start of a word for a unit', () => {
		expect(scaleLine('2 gula lökar', 2)).toEqual({ amount: '4', text: 'gula lökar' });
	});
});

describe('amountText', () => {
	it('rounds grams to steps that make sense', () => {
		expect(amountText(333.33, 'g')).toBe('330');
		expect(amountText(47, 'g')).toBe('45');
		expect(amountText(1333, 'g')).toBe('1350');
		expect(amountText(0.2, 'g')).toBe('1');
	});

	it('rounds the rest to quarters, and never down to nothing', () => {
		expect(amountText(0.8)).toBe('¾');
		expect(amountText(2.25, 'dl')).toBe('2 ¼');
		expect(amountText(0.05, 'krm')).toBe('¼');
		expect(amountText(12.4)).toBe('12');
	});
});

describe('stepMinutes', () => {
	it('finds minutes and hours', () => {
		expect(stepMinutes('Låt koka under lock i 20 minuter.')).toBe(20);
		expect(stepMinutes('Koka riset, cirka 18 min.')).toBe(18);
		expect(stepMinutes('Låt stå 1 minut.')).toBe(1);
		expect(stepMinutes('Ugnen i 1 timme.')).toBe(60);
		expect(stepMinutes('Sjud i 1,5 timmar.')).toBe(90);
		expect(stepMinutes('Sjud i en timme.')).toBe(60);
		expect(stepMinutes('Låt vila en halvtimme.')).toBe(30);
		expect(stepMinutes('Låt vila en kvart.')).toBe(15);
		expect(stepMinutes('Efter 5 minuters vila är den klar.')).toBe(5);
		expect(stepMinutes('Grädda i 1 timme och 30 minuter.')).toBe(90);
	});

	it('takes the first end of a range', () => {
		expect(stepMinutes('Puttra 1–2 timmar.')).toBe(60);
		expect(stepMinutes('Stek 3-4 min per sida.')).toBe(3);
	});

	it('finds nothing when the step names no time', () => {
		expect(stepMinutes('Hacka löken.')).toBeNull();
		expect(stepMinutes('Sätt ugnen på 200 grader.')).toBeNull();
		expect(stepMinutes('Ta min bästa kniv.')).toBeNull();
		expect(stepMinutes('Strö över 2 kvistar timjan.')).toBeNull();
	});
});

describe('portionsFor', () => {
	it('is those who eat, with lunch boxes for a dish good for them', () => {
		expect(portionsFor({ eaters: 4, lunchbox: true, extra: 2 })).toBe(6);
		expect(portionsFor({ eaters: 3, lunchbox: false, extra: 2 })).toBe(3);
	});

	it('is two when nobody is chosen', () => {
		expect(portionsFor({ eaters: 0, lunchbox: false, extra: 2 })).toBe(2);
		expect(portionsFor({ eaters: 0, lunchbox: true, extra: 2 })).toBe(4);
	});
});
