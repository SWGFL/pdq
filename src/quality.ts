/**
 * Calculate the quality of a block of pixel data.
 * The quality is a heuristic based on the sum of the gradients in the block.
 * The gradients are calculated by taking the difference between adjacent pixels,
 * both horizontally and vertically, and scaling them to a percentage of the maximum possible difference (255).
 * The final quality score is scaled to a maximum of 100.
 */
export default (block: number, data: number[] | Uint8Array): number => {
	let gradient = 0;

	// diff left to right
	for (let i = 0; i < block - 1; i++) {
		for (let j = 0; j < block; j++) {
			const u = data[(i * block) + j],
				v = data[((i + 1) * block) + j],
				d = Math.trunc(((u - v) * 100) / 255);
			gradient += Math.abs(d);
		}
	}

	// diff top to bottom
	for (let i = 0; i < block; i++) {
		for (let j = 0; j < block - 1; j++) {
			const u = data[(i * block) + j],
				v = data[(i * block) + j + 1],
				d = Math.trunc(((u - v) * 100) / 255);
			gradient += Math.abs(d);
		}
	}

	// Heuristic scaling factor
	return Math.min(Math.trunc(gradient / 90), 100);
};
