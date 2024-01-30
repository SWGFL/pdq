export default (block, data) => {
	let gradient = 0;
	for (let i = 0; i < block - 1; i++) {
		for (let j = 0; j < block; j++) {
			const u = data[(i * block) + j],
				v = data[((i + 1) * block) + j],
				d = parseInt(((u - v) * 100) / 255);
			gradient += parseInt(Math.abs(d));
		}
	}
	for (let i = 0; i < block; i++) {
		for (let j = 0; j < block - 1; j++) {
			const u = data[(i * block) + j],
				v = data[(i * block) + j + 1],
				d = parseInt(((u - v) * 100) / 255);
			gradient += parseInt(Math.abs(d));
		}
	}

	// Heuristic scaling factor
	return Math.min(parseInt(gradient / 90), 100);
};