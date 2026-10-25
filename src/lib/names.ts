/** Text with the spaces at the ends taken off and single spaces within. */
export function cleanText(text: string): string {
	return text.trim().replace(/\s+/g, ' ');
}

/** A string from Claude's answer, cleaned and cut to a length; anything else is empty. */
export const answerText = (value: unknown, max: number) =>
	typeof value === 'string' ? cleanText(value).slice(0, max) : '';

/** Material for a prompt, which cannot close the tag it is in and write outside it. */
export const stripTags = (text: string) => text.replace(/<\/?[a-z_]+>/gi, '').trim();

/** The same dish written with other spacing or case gets the same key. */
export function nameKey(name: string): string {
	return cleanText(name).toLocaleLowerCase('sv');
}
