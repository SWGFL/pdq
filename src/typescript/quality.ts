export default (block: number, data: Uint8Array) => {
	let gradient = 0;

	// diff left to right
	for (let i = 0; i < block - 1; i++) {
		for (let j = 0; j < block; j++) {
			const u = data[(i * block) + j],
				v = data[((i + 1) * block) + j],
				d = Math.trunc(((u - v) * 100) / 255);
			gradient += Math.trunc(Math.abs(d));
		}
	}

	// diff top to bottom
	for (let i = 0; i < block; i++) {
		for (let j = 0; j < block - 1; j++) {
			const u = data[(i * block) + j],
				v = data[(i * block) + j + 1],
				d = Math.trunc(((u - v) * 100) / 255);
			gradient += Math.trunc(Math.abs(d));
		}
	}

	// Heuristic scaling factor
	return Math.min(Math.trunc(gradient / 90), 100);
};