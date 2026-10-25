/** Text with the spaces at the ends taken off and single spaces within. */
export function cleanText(text: string): string {
	return text.trim().replace(/\s+/g, ' ');
}

/** The same dish written with other spacing or case gets the same key. */
export function nameKey(name: string): string {
	return cleanText(name).toLocaleLowerCase('sv');
}
