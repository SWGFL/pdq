import jarosz from "./jarosz-filter.js";
import render from "./render.js";
import matrix from "./matrix.js";
import hash from "./hash-dct.js";
import luminance from "./luminance.js";
import rescale from "./rescale.js";
import dct from "./dct.js";
import quality from "./quality.js";

export default (canvas, config) => {

	// merge default config
	config = Object.assign({
		debug: false,
		passes: 2,
		block: 64
	}, config);

	// assign varables
	const block = config.block,
		debug = config.debug,
		width = canvas.width,
		height = canvas.height;
	let q;

	// extract the image data
	return new Promise(success => {

		// debug
		if (debug) {
			document.body.appendChild(canvas);
		}
		
		// Return the luminance data.
		success(canvas.getContext("2d").getImageData(0, 0, width, height).data);
	})

		// greyscale the image
		.then(data => {
			const grey = luminance(data);

			// debug
			if (debug) {
				render(width, height, grey);
			}
			
			// Return the luminance data.
			return grey;
		})

		// apply a two-pass jarosz box blur filter
		.then(data => {
			const output = jarosz(data, width, height, config.passes);

			// debug
			if (debug) {
				render(width, height, output);
			}
			return output;
		})

		// rescale the image to 64x64
		.then(data => {

			// rescale
			const scaled = rescale(width, height, block, data);

			// debug
			if (debug) {
				render(block, block, scaled);
			}
			return scaled;
		})

		// generate quality metric
		.then(data => {
			q = quality(block, data);
			return data;
		})
		
		// generate 2D descrete cosine transform
		.then(data => {

			const buffer16x16 = dct(data);
			
			// debug
			if (debug) {
				console.log(buffer16x16);
			}
			return buffer16x16;
		})
		
		// rotate and flip DCTs
		.then(buffer => {
			const dcts = {
				original: buffer,
				rot90: matrix.rotate(buffer),
				flip: matrix.flip(buffer)
			};
			dcts.rot180 = matrix.rotate(dcts.rot90);
			dcts.rot270 = matrix.rotate(dcts.rot180);
			dcts.fliprot90 = matrix.rotate(dcts.flip);
			dcts.fliprot180 = matrix.rotate(dcts.fliprot90);
			dcts.fliprot270 = matrix.rotate(dcts.fliprot180);

			// debug
			if (debug) {
				console.log(dcts);
			}
			return dcts;
		})
		
		// compute hash from DCTs
		.then(dcts => {
			const hashes = [];

			// generate hashes
			for (const item in dcts) {
				const result = hash.computeDct(dcts[item]),
					hex = hash.toHex(result);
				hashes.push(hex);
			}
			return {type: "pdq", hashes: hashes, quality: q};
		});
};