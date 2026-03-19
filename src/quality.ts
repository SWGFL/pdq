/**
 * Calculate the quality of a block of pixel data.
 * The quality is a heuristic based on the sum of the gradients in the block.
 */
export default (block: number, data: Float32Array | Float64Array | number[] | Uint8Array): number => {
	let gradient = 0;

	// diff left to right
	for (let i = 0; i < block - 1; i++) {
		const rowOff = i * block;
		const nextRowOff = rowOff + block;
		for (let j = 0; j < block; j++) {
			const d = ((data[rowOff + j] - data[nextRowOff + j]) * 100 / 255) | 0;
			gradient += (d ^ (d >> 31)) - (d >> 31); // branchless abs
		}
	}

	// diff top to bottom
	for (let i = 0; i < block; i++) {
		const rowOff = i * block;
		for (let j = 0; j < block - 1; j++) {
			const d = ((data[rowOff + j] - data[rowOff + j + 1]) * 100 / 255) | 0;
			gradient += (d ^ (d >> 31)) - (d >> 31); // branchless abs
		}
	}

	// Heuristic scaling factor
	const q = (gradient / 90) | 0;
	return q > 100 ? 100 : q;
};
