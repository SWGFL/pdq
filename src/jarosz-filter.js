function boxBlurRows(input, output, width, height, radius) {
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
			output[ti++] = Math.round(val * iarr);
		}
		
		// take a floating average from {radius} to {width - radius}
        for (let j = radius + 1; j < width - radius; j++) {
			val += input[ri++] - input[li++];
			output[ti++] = Math.round(val * iarr);
		}
		
		// average out the last {radius} pixels
        for (let j = 0; j < radius; j++) {
			val += lv - input[li++];
			output[ti++] = Math.round(val * iarr);
		}
    }
}

function boxBlurColumns(input, output, width, height, radius) {
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
			output[ti] = Math.round(val * iarr);
			ri += width;
			ti += width;
		}
		
		// take a floating average from {radius} to {height - radius}
        for (let j = radius + 1; j < height - radius; j++) {
			val += input[ri] - input[li];
			output[ti] = Math.round(val * iarr);
			li += width;
			ri += width;
			ti += width;
		}
		
		// average out the last {radius} pixels
        for (let j = 0; j < radius; j++) {
			val += lv - input[li];
			output[ti] = Math.round(val * iarr);
			li += width;
			ti += width;
		}
    }
}

export default (data, width, height, passes) => {

	// copy data to temp array
	const output = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) {
		output[i] = data[i];
	}

	// apply the filter
	const block = 128, // how many pixels to divide the blocks into
		winx = Math.round(width / block / passes),
		winy = Math.round(width / block / passes);
	for (let i = 0; i < passes; i++) {
		boxBlurRows(data, output, width, height, winx);
		boxBlurColumns(output, data, width, height, winy);
	}
	return data;
}