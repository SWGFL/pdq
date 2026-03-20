
/**
 * Rescale function for resizing image data.
 * The function takes the original width and height of the image, the target block size, and the pixel data (either as a number array or a Uint8Array).
 * It returns a Uint8Array containing the rescaled image data.
 * The rescaling is done by picking the middle pixel in each block of the original image.
 */
export default (width: number, height: number, block: number, data: number[] | Uint8Array): Uint8Array => {
	const scaled = new Uint8Array(block * block),
		halfwidth = width / block / 2,
		halfheight = height / block / 2; // for picking the middle pixel in a block
	for (let i = 0; i < block; i++) {
		const x = Math.round((i * width) / block + halfwidth);
		for (let j = 0; j < block; j++) {
			const y = Math.round((j * height) / block + halfheight);
			scaled[(j * block) + i] = data[(y * width) + x];
		}
	}
	return scaled;
};
