/**
 * Jarosz filter implementation for image processing.
 * The Jarosz filter is a fast approximation of a Gaussian blur, which is commonly used in image processing to reduce noise and detail.
 * The filter works by applying a box blur in two passes: first horizontally (rows) and then vertically (columns).
 * The radius of the blur can be adjusted to control the amount of blurring applied to the image.
 * The implementation uses a convolution matrix value that is constant for the box blur, allowing for efficient computation.
 * The filter is applied to a flat array of pixel data, where each number corresponds to a pixel's luminance value.
 */
function boxBlurRows(input: number[], output: number[], width: number, height: number, radius: number): void {
	const iarr = 1 / (radius + radius + 1); // convolution matrix value - constant for box blur

	// loop through each row
	for (let i = 0; i < height; i++) {
		let ti = i * width,
			li = ti,
			ri = ti + radius,
			fv = input[ti],
			lv = input[ti + width - 1],
			val = (radius + 1) * fv;

		// add up from the left to the radius - reflecting the missing data
		for (let j = 0; j < radius; j++) {
			val += input[ti + j];
		}

		// average the radius of pixels
		for (let j = 0; j <= radius; j++) {
			val += input[ri++] - fv;
			output[ti++] = val * iarr;
		}

		// take a floating average from {radius} to {width - radius}
		for (let j = radius + 1; j < width - radius; j++) {
			val += input[ri++] - input[li++];
			output[ti++] = val * iarr;
		}

		// average out the last {radius} pixels
		for (let j = 0; j < radius; j++) {
			val += lv - input[li++];
			output[ti++] = val * iarr;
		}
	}
}

function boxBlurColumns(input: number[], output: number[], width: number, height: number, radius: number): void {
	const iarr = 1 / (radius + radius + 1); // convolution matrix value - constant for box blur

	// loop through each column
	for (let i = 0; i < width; i++) {
		let ti = i,
			li = ti,
			ri = ti + radius * width,
			fv = input[ti],
			lv = input[ti + width * (height - 1)],
			val = (radius + 1) * fv;

		// add up from the top to the radius - reflecting the missing data
		for (let j = 0; j < radius; j++) {
			val += input[ti + j * width];
		}

		// average the radius of pixels
		for (let j = 0; j <= radius; j++) {
			val += input[ri] - fv;
			output[ti] = val * iarr;
			ri += width;
			ti += width;
		}

		// take a floating average from {radius} to {height - radius}
		for (let j = radius + 1; j < height - radius; j++) {
			val += input[ri] - input[li];
			output[ti] = val * iarr;
			li += width;
			ri += width;
			ti += width;
		}

		// average out the last {radius} pixels
		for (let j = 0; j < radius; j++) {
			val += lv - input[li];
			output[ti] = val * iarr;
			li += width;
			ti += width;
		}
	}
}

export default (data: number[], width: number, height: number, passes: number): number[] => {

	// copy data to temp array
	const output = Array<number>(data.length).fill(0);

	// apply the filter
	const block = 128, // how many pixels to divide the blocks into
		winx = Math.round(width / block / passes),
		winy = Math.round(width / block / passes);
	for (let i = 0; i < passes; i++) {
		boxBlurRows(data, output, width, height, winx);
		boxBlurColumns(output, data, width, height, winy);
	}
	return data;
};
