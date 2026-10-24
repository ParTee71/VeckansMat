/** The same dish written with other spacing or case gets the same key. */
export function nameKey(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv');
}
