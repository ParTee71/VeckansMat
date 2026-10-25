/** Text with the spaces at the ends taken off and single spaces within. */
export function cleanText(text: string): string {
	return text.trim().replace(/\s+/g, ' ');
}

/** A string from Claude's answer, cleaned and cut to a length; anything else is empty. */
export const answerText = (value: unknown, max: number) =>
	typeof value === 'string' ? cleanText(value).slice(0, max) : '';

/** The non-empty strings of a list in Claude's answer, each cleaned and cut to a length. */
export const answerStrings = (value: unknown, max = Infinity) =>
	Array.isArray(value) ? value.map((v) => answerText(v, max)).filter(Boolean) : [];

/**
 * Material for a prompt, which cannot close the tag it is in and write outside it, however the
 * tag is spaced. Text such as "< 5 min" has no tag in it and is kept.
 */
export const stripTags = (text: string) => text.replace(/<\s*\/?\s*[a-z_]+\b[^<>]*>/gi, '').trim();

/** The same dish written with other spacing or case gets the same key. */
export function nameKey(name: string): string {
	return cleanText(name).toLocaleLowerCase('sv');
}

/** "1 vara", "3 varor". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
