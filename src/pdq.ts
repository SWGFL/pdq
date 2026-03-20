import jarosz from "./jarosz-filter";
import render, { renderHash } from "./render";
import matrix from "./matrix";
import hash from "./hash-dct";
import luminance from "./luminance";
import rescale from "./rescale";
import dct from "./dct";
import quality from "./quality";

export interface PdqConfig {
	debug?: boolean;
	passes?: number;
	block?: number;
	transform?: boolean;
}

export interface PdqResult {
	type: "pdq";
	hash: string | string[];
	quality: number;
}

/**
 * Perceptual hash (PDQ) implementation for image similarity comparison.
 * The function takes an HTMLCanvasElement and an optional configuration object, and returns a Promise that resolves to a PdqResult object containing the hash and quality score.
 * The process involves several steps: extracting image data, converting it to luminance, applying a Jarosz box blur filter, rescaling the image to a specified block size, calculating the quality of the block, generating a 2D discrete cosine transform (DCT), optionally applying dihedral transformations to the DCT, and finally computing the hash from the DCT values.
 * The resulting hash can be used for comparing images based on their perceptual similarity, while the quality score provides a heuristic measure of the image's detail and sharpness.
 */
export default (canvas: HTMLCanvasElement, config?: PdqConfig): Promise<PdqResult> => {

	// merge default config
	const opts = Object.assign({
		debug: false,
		passes: 2,
		block: 64,
		transform: false, // whether to generate dihedral transformation hashes
	}, config);

	// assign variables
	const block = opts.block,
		debug = opts.debug,
		width = canvas.width,
		height = canvas.height;
	let q: number;

	// extract the image data
	return new Promise<Uint8ClampedArray>(success => {

		// debug
		if (debug) {
			document.body.appendChild(canvas);
		}

		// Return the image data.
		success(canvas.getContext("2d")!.getImageData(0, 0, width, height).data);
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
			const output = jarosz(data, width, height, opts.passes);

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

		// generate 2D discrete cosine transform
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
			const dcts: Record<string, number[]> = { original: buffer };
			if (opts.transform) {
				dcts.rot90 = matrix.rotate(buffer);
				dcts.flip = matrix.flip(buffer);
				dcts.rot180 = matrix.rotate(dcts.rot90);
				dcts.rot270 = matrix.rotate(dcts.rot180);
				dcts.fliprot90 = matrix.rotate(dcts.flip);
				dcts.fliprot180 = matrix.rotate(dcts.fliprot90);
				dcts.fliprot270 = matrix.rotate(dcts.fliprot180);
			}

			// debug
			if (debug) {
				console.log(dcts);
			}
			return dcts;
		})

		// compute hash from DCTs
		.then(dcts => {
			const hashes: string[] = [];

			// generate hashes
			for (const item in dcts) {
				const result = hash.computeDct(dcts[item]),
					hex = hash.toHex(result);
				hashes.push(hex);

				// debug
				if (debug) {
					renderHash(result);
				}
			}
			return { type: "pdq" as const, hash: opts.transform ? hashes : hashes[0], quality: q };
		});
};
