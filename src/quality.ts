/**
 * Calculate the quality of a block of pixel data.
 * The quality is a heuristic based on the sum of the gradients in the block.
 * The gradients are calculated by taking the difference between adjacent pixels,
 * both horizontally and vertically, and scaling them to a percentage of the maximum possible difference (255).
 * The final quality score is scaled to a maximum of 100.
 */
export default (block: number, data: number[] | Float32Array): number => {
	let gradient = 0;

	// diff top to bottom
	for (let y = 0; y < block - 1; y++) {
		for (let x = 0; x < block; x++) {
			const u = data[(y * block) + x],
				v = data[((y + 1) * block) + x],
				d = Math.trunc(((u - v) * 100) / 255);
			gradient += Math.abs(d);
		}
	}

	// diff left to right
	for (let y = 0; y < block; y++) {
		for (let x = 0; x < block - 1; x++) {
			const u = data[(y * block) + x],
				v = data[(y * block) + x + 1],
				d = Math.trunc(((u - v) * 100) / 255);
			gradient += Math.abs(d);
		}
	}

	// Heuristic scaling factor
	return Math.min(Math.trunc(gradient / 90), 100);
};
