
/**
 * Rescale function for resizing image data.
 * The function takes the original width and height of the image, the target block size, and the pixel data (either as a number array or a Uint8Array).
 * It returns a Float32Array containing the rescaled image data.
 * The rescaling is done by picking the middle pixel in each block of the original image.
 */
export default (width: number, height: number, block: number, data: number[] | Float32Array): Float32Array => {
	const scaled = new Float32Array(block * block);
	for (let i = 0; i < block; i++) {
		const y = Math.floor(((i + 0.5) * height) / block);
		for (let j = 0; j < block; j++) {
			const x = Math.floor(((j + 0.5) * width) / block);
			scaled[i * block + j] = data[y * width + x];
		}
	}
	return scaled;
};
