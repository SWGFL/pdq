/**
 * Downsamples an image by center-point sampling.
 */
function decimateFloat(input: Float32Array, inNumRows: number, inNumCols: number, outNumRows: number, outNumCols: number): Float32Array {
	// Precompute source column indices
	const colMap = new Int32Array(outNumCols);
	for (let outj = 0; outj < outNumCols; outj++) {
		colMap[outj] = ((outj + 0.5) * inNumCols / outNumCols) | 0;
	}

	const output = new Float32Array(outNumRows * outNumCols);
	for (let outi = 0; outi < outNumRows; outi++) {
		const srcRowOff = (((outi + 0.5) * inNumRows / outNumRows) | 0) * inNumCols;
		const dstRowOff = outi * outNumCols;
		for (let outj = 0; outj < outNumCols; outj++) {
			output[dstRowOff + outj] = input[srcRowOff + colMap[outj]];
		}
	}
	return output;
}

export default decimateFloat;

export { decimateFloat };
