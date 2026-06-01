
function rescale(width: number, height: number, block: number, data: Uint8ClampedArray): Uint8ClampedArray;
function rescale(width: number, height: number, block: number, data: Float32Array): Float32Array;
function rescale(width: number, height: number, block: number, data: number[]): number[];
function rescale(width: number, height: number, block: number, data: number[] | Float32Array | Uint8ClampedArray): number[] | Float32Array | Uint8ClampedArray {
	const scaled = data instanceof Uint8ClampedArray
		? new Uint8ClampedArray(block * block)
		: data instanceof Float32Array
			? new Float32Array(block * block)
			: new Array<number>(block * block);
	for (let i = 0; i < block; i++) {
		const y = Math.floor(((i + 0.5) * height) / block);
		for (let j = 0; j < block; j++) {
			const x = Math.floor(((j + 0.5) * width) / block);
			(scaled as Float32Array)[i * block + j] = data[y * width + x];
		}
	}
	return scaled;
}

export default rescale;
