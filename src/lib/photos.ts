// Photos are made smaller on the phone before they are sent: this size is plenty for printed
// and handwritten text, and a phone's photo is several times larger.
// See docs/beslut/0013-recept-in.md.
const MAX_SIDE = 1568;

/** Pages of one recipe, such as a spread in a cookbook. */
export const MAX_PHOTOS = 4;

/** The photo as a JPEG at most MAX_SIDE pixels on its longer side, or as it was if that fails. */
export async function shrinkPhoto(file: File): Promise<File> {
	try {
		// Turned the way the camera held it, from the photo's own data.
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
		const canvas = new OffscreenCanvas(
			Math.round(bitmap.width * scale),
			Math.round(bitmap.height * scale)
		);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
		return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
	} catch {
		// A format or size the browser cannot handle; the server says what is wrong with it.
		return file;
	}
}
