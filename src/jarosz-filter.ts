/**
 * Jarosz filter implementation for image processing.
 * The Jarosz filter is a fast approximation of a Gaussian blur, which is commonly used in image processing to reduce noise and detail.
 * The filter works by applying a box blur in two passes: first horizontally (rows) and then vertically (columns).
 * The window size is calculated based on the image dimensions and target block size.
 * Uses a growing/shrinking window at boundaries rather than edge reflection.
 * The filter is applied to a flat array of pixel data, where each number corresponds to a pixel's luminance value.
 */
function box1D(
	input: number[],
	output: number[],
	inOffset: number,
	outOffset: number,
	length: number,
	stride: number,
	fullWindowSize: number
): void {
	const halfWindowSize = Math.floor((fullWindowSize + 2) / 2);

	const phase1Nreps = halfWindowSize - 1,
		phase2Nreps = fullWindowSize - halfWindowSize + 1,
		phase3Nreps = length - fullWindowSize,
		phase4Nreps = halfWindowSize - 1;

	let li = inOffset,
		ri = inOffset,
		oi = outOffset,
		sum = 0.0,
		currentWindowSize = 0;

	// phase 1: window grows from the left, not yet outputting
	for (let i = 0; i < phase1Nreps; i++) {
		sum += input[ri];
		currentWindowSize++;
		ri += stride;
	}

	// phase 2: window reaches full size, start outputting
	for (let i = 0; i < phase2Nreps; i++) {
		sum += input[ri];
		currentWindowSize++;
		output[oi] = sum / currentWindowSize;
		ri += stride;
		oi += stride;
	}

	// phase 3: full-size window slides across the middle
	for (let i = 0; i < phase3Nreps; i++) {
		sum += input[ri];
		sum -= input[li];
		output[oi] = sum / currentWindowSize;
		li += stride;
		ri += stride;
		oi += stride;
	}

	// phase 4: window shrinks at the right edge
	for (let i = 0; i < phase4Nreps; i++) {
		sum -= input[li];
		currentWindowSize--;
		output[oi] = sum / currentWindowSize;
		li += stride;
		oi += stride;
	}
}

function boxAlongRows(input: number[], output: number[], width: number, height: number, windowSize: number): void {
	for (let i = 0; i < height; i++) {
		const offset = i * width;
		box1D(input, output, offset, offset, width, 1, windowSize);
	}
}

function boxAlongColumns(input: number[], output: number[], width: number, height: number, windowSize: number): void {
	for (let j = 0; j < width; j++) {
		box1D(input, output, j, j, height, width, windowSize);
	}
}

export default (data: number[], width: number, height: number, passes: number, block: number): number[] => {

	// copy data to temp array
	const output = Array<number>(data.length).fill(0);

	// apply the filter
	const winx = Math.floor((width + (2 * block) - 1) / (2 * block)),
		winy = Math.floor((height + (2 * block) - 1) / (2 * block));
	for (let i = 0; i < passes; i++) {
		boxAlongRows(data, output, width, height, winx);
		boxAlongColumns(output, data, width, height, winy);
	}
	return data;
};
