/**
 * Jarosz box filter implementation for image processing.
 *
 * Implements the blur-and-decimate approach from:
 * Wojciech Jarosz 'Fast Image Convolutions' ACM SIGGRAPH 2001
 *
 * X,Y,X,Y passes of 1-D box filters produce a 2D tent filter.
 */

function computeJaroszFilterWindowSize(oldDimension: number, newDimension: number): number {
	return Math.floor(
		(oldDimension + 2 * newDimension - 1) / (2 * newDimension)
	);
}

function box1DFloat(
	invec: Float32Array,
	outvec: Float32Array,
	inOffset: number,
	outOffset: number,
	vectorLength: number,
	stride: number,
	fullWindowSize: number
): void {
	const halfWindowSize = Math.floor((fullWindowSize + 2) / 2);

	const phase1Nreps = halfWindowSize - 1;
	const phase2Nreps = fullWindowSize - halfWindowSize + 1;
	const phase3Nreps = vectorLength - fullWindowSize;
	const phase4Nreps = halfWindowSize - 1;

	let li = inOffset;
	let ri = inOffset;
	let oi = outOffset;
	let sum = 0.0;
	let currentWindowSize = 0;

	for (let i = 0; i < phase1Nreps; i++) {
		sum += invec[ri];
		currentWindowSize++;
		ri += stride;
	}

	for (let i = 0; i < phase2Nreps; i++) {
		sum += invec[ri];
		currentWindowSize++;
		outvec[oi] = sum / currentWindowSize;
		ri += stride;
		oi += stride;
	}

	for (let i = 0; i < phase3Nreps; i++) {
		sum += invec[ri];
		sum -= invec[li];
		outvec[oi] = sum / currentWindowSize;
		li += stride;
		ri += stride;
		oi += stride;
	}

	for (let i = 0; i < phase4Nreps; i++) {
		sum -= invec[li];
		currentWindowSize--;
		outvec[oi] = sum / currentWindowSize;
		li += stride;
		oi += stride;
	}
}

function boxAlongRowsFloat(input: Float32Array, output: Float32Array, numRows: number, numCols: number, windowSize: number): void {
	for (let i = 0; i < numRows; i++) {
		const offset = i * numCols;
		box1DFloat(input, output, offset, offset, numCols, 1, windowSize);
	}
}

function boxAlongColsFloat(input: Float32Array, output: Float32Array, numRows: number, numCols: number, windowSize: number): void {
	for (let j = 0; j < numCols; j++) {
		box1DFloat(input, output, j, j, numRows, numCols, windowSize);
	}
}

function jaroszFilterFloat(
	buffer1: Float32Array,
	buffer2: Float32Array,
	numRows: number,
	numCols: number,
	windowSizeAlongRows: number,
	windowSizeAlongCols: number,
	nreps: number
): void {
	for (let i = 0; i < nreps; i++) {
		boxAlongRowsFloat(buffer1, buffer2, numRows, numCols, windowSizeAlongRows);
		boxAlongColsFloat(buffer2, buffer1, numRows, numCols, windowSizeAlongCols);
	}
}

export default jaroszFilterFloat;

export {
	jaroszFilterFloat,
	computeJaroszFilterWindowSize,
	box1DFloat,
	boxAlongRowsFloat,
	boxAlongColsFloat,
};
