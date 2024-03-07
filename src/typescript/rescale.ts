export default (width: number, height: number, block: number, data: Uint8Array) => {
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