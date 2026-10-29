// Cooking a dish in Laga (#137): the portions to cook, the ingredient lines scaled to them, and
// the time a step names, for its timer. All read from the text as written, without Claude.

/** The portions a recipe is taken to be for when it does not say. */
export const DEFAULT_SERVINGS = 4;

const FRACTIONS: Record<string, number> = {
	'½': 1 / 2,
	'¼': 1 / 4,
	'¾': 3 / 4,
	'⅓': 1 / 3,
	'⅔': 2 / 3
};
const VULGAR = '[½¼¾⅓⅔]';
// "1/2", "1 1/2", "1½", "1,5", "2" or "½".
const NUMBER = String.raw`(?:\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\s*${VULGAR})?|${VULGAR})`;
// The units a Swedish recipe writes after an amount, which round in steps of their own.
const UNIT = String.raw`(?:kg|hg|g|mg|l|dl|cl|ml|msk|tsk|krm|st|förp)(?=[\s.,)]|$)`;
// An amount, or a range such as "2–3", with its unit when it has one: first in the line, or
// later in it with a unit, so that "15 %" in "Grädde 15 %, 2 dl" is no amount.
const RANGE = String.raw`(${NUMBER})(?:\s*[–-]\s*(${NUMBER}))?`;
const FIRST = new RegExp(String.raw`^${RANGE}(?:\s*(${UNIT}))?`, 'i');
const LATER = new RegExp(String.raw`(?<![\d.,])${RANGE}\s*(${UNIT})`, 'i');

/** The value of a number as a recipe writes it. */
function valueOf(text: string): number {
	return text
		.trim()
		.split(/\s+|(?=[½¼¾⅓⅔])/)
		.reduce((sum, part) => {
			if (part in FRACTIONS) return sum + FRACTIONS[part];
			const [top, bottom] = part.split('/');
			return sum + (bottom ? Number(top) / Number(bottom) : Number(part.replace(',', '.')));
		}, 0);
}

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

/** An amount written as a Swedish cookbook does, rounded to steps that make sense for the unit. */
export function amountText(n: number, unit = ''): string {
	const u = unit.toLowerCase();
	if (u === 'g' || u === 'ml' || u === 'mg')
		return String(roundTo(n, n < 10 ? 1 : n < 100 ? 5 : n < 1000 ? 10 : 50));
	if (u === 'cl' || n >= 10) return String(roundTo(n, 1));
	const quarters = Math.max(1, Math.round(n * 4));
	const whole = Math.floor(quarters / 4);
	const part = ['', '¼', '½', '¾'][quarters % 4];
	return [whole || '', part].filter(Boolean).join(' ');
}

/** An ingredient line split into its amount with unit, when it starts with one, and the rest. */
export interface ScaledLine {
	amount: string;
	text: string;
}

/**
 * The line with its first amount scaled by `factor`. An amount first in the line stands on its
 * own; one later in the line with a unit, as in "Kyckling, 900 g", is scaled where it is. A line
 * without an amount, such as "salt och peppar", is kept as it is, and so is the amount at a
 * factor of 1.
 */
export function scaleLine(line: string, factor: number): ScaledLine {
	const text = line.trim();
	const match = FIRST.exec(text) ?? LATER.exec(text);
	if (!match) return { amount: '', text };
	const [whole, from, to, unit = ''] = match;
	const scaled =
		factor === 1
			? whole
			: [from, to]
					.filter(Boolean)
					.map((n) => amountText(valueOf(n) * factor, unit))
					.join('–') + (unit ? ` ${unit}` : '');
	if (match.index === 0) return { amount: scaled, text: text.slice(whole.length).trim() };
	return {
		amount: '',
		text: text.slice(0, match.index) + scaled + text.slice(match.index + whole.length)
	};
}

// "20 minuter", "5 minuters vila", "1–2 timmar", "en timme" or "1 timme och 30 minuter".
const TIME =
	/(?<![\d.,])(\d+(?:[.,]\d+)?|\ben|\bett)\s*(?:[–-]\s*\d+(?:[.,]\d+)?\s*)?(minut(?:er|ers|en)?|min|tim(?:me|mar|men)?)\b(?:\s*(?:och\s*)?(\d+)\s*min)?/i;

/** The minutes a step says it takes, the first end of a range, or null when it names no time. */
export function stepMinutes(step: string): number | null {
	if (/\ben halvtimme\b/i.test(step)) return 30;
	if (/\ben kvart\b/i.test(step)) return 15;
	const match = TIME.exec(step);
	if (!match) return null;
	const [, amount, unit, more] = match;
	const n = /^e/i.test(amount) ? 1 : Number(amount.replace(',', '.'));
	const minutes = Math.round(unit.toLowerCase().startsWith('tim') ? n * 60 : n) + Number(more ?? 0);
	return minutes > 0 ? minutes : null;
}

/** Who eats when nobody is chosen for the week. */
export const DEFAULT_EATERS = 2;

/**
 * The portions of a dish to cook, for the shopping list and in Laga: those who eat the week, and
 * the extra portions of a dish good for lunch boxes.
 */
export const portionsFor = (dish: { eaters: number; lunchbox: boolean; extra: number }) =>
	(dish.eaters || DEFAULT_EATERS) + (dish.lunchbox ? dish.extra : 0);
