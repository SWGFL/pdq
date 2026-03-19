/**
 * Matrix transformations for pixel data.
 * Rotation and flipping for generating dihedral transformation hashes.
 */
export default {
	rotate: (data: Float64Array | number[]): Float64Array | number[] => {
		const len = data.length,
			dim = Math.sqrt(len);
		const isTyped = data instanceof Float64Array;
		const rotated = isTyped ? new Float64Array(len) : Array<number>(len);
		for (let i = 0; i < dim; i++) {
			for (let j = 0; j < dim; j++) {
				rotated[i * dim + j] = data[(dim - j - 1) * dim + i];
			}
		}
		return rotated;
	},
	flip: (data: Float64Array | number[]): Float64Array | number[] => {
		const len = data.length,
			dim = Math.sqrt(len);
		const isTyped = data instanceof Float64Array;
		const flipped = isTyped ? new Float64Array(len) : Array<number>(len);
		for (let i = 0; i < dim; i++) {
			for (let j = 0; j < dim; j++) {
				flipped[i * dim + j] = data[i * dim + (dim - j - 1)];
			}
		}
		return flipped;
	},
};
