
/**
 * Matrix transformations for pixel data.
 * These transformations include rotation and flipping of the pixel data.
 * The pixel data is represented as a flat array of numbers, where each number corresponds to a pixel's luminance value.
 * The transformations are applied to the pixel data to produce new arrangements of the pixels, which can be used for various purposes such as data augmentation or visualisation.
 */
export default {
	rotate: (data: number[]): number[] => {
		const len = data.length,
			dim = Math.sqrt(len),
			rotated = Array<number>(len);
		for (let i = 0; i < dim; i++) {
			for (let j = 0; j < dim; j++) {
				rotated[i * dim + j] = data[(dim - j - 1) * dim + i];
			}
		}
		return rotated;
	},
	flip: (data: number[]): number[] => {
		const len = data.length,
			dim = Math.sqrt(len);
		let flipped: number[] = [];
		for (let i = 0; i < dim; i++) {
			flipped = flipped.concat(data.slice(i * dim, (i + 1) * dim).reverse());
		}
		return flipped;
	},
};
