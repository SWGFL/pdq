import jarosz from "./jarosz-filter";
import render from "./render";
import matrix from "./matrix";
import hash from "./hash-dct";
import luminance from "./luminance";
import rescale from "./rescale";
import dct from "./dct";
import quality from "./quality.js";

type BaseConfig = {
	resize: boolean;
	debug: boolean;
	block: number;
	transform: boolean;
	passes: number;
}

type DCTs = {
	original: Array<number>;
	rot90?: Array<number>;
	flip?: Array<number>;
	rot180?: Array<number>;
	rot270?: Array<number>;
	fliprot90?: Array<number>;
	fliprot180?: Array<number>;
	fliprot270?: Array<number>;
}

export default (canvas: HTMLCanvasElement, config: BaseConfig) => {

	// merge default config
	config = Object.assign({
		debug: false,
		passes: 2,
		block: 64,
		transform: false // whether to generate dihedral transformation hashes
	}, config);

	// assign varables
	const block = config.block,
		debug = config.debug,
		width = canvas.width,
		height = canvas.height;
	let q: ReturnType<typeof quality>;

	// extract the image data
	return new Promise(resolve => {

		// debug
		if (debug) {
			document.body.appendChild(canvas);
		}
		
		// Return the image data.
		resolve(canvas.getContext("2d")?.getImageData(0, 0, width, height).data);
	})

		// greyscale the image
		.then(data => {
			const grey = luminance(data as Uint8Array);
			
			// Convert grey array to Uint8Array
			const greyUint8Array = new Uint8Array(grey);

			// debug
			if (debug) {
				render(width, height, greyUint8Array);
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
			const dcts: DCTs = {original: buffer} as const;
			if (config.transform) {
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
			const hashes: Array<string> = [];

			// generate hashes
			for (const item in dcts) {
				if(dcts[item as keyof DCTs] !== undefined) {
					const result = hash.computeDct(dcts[item as keyof DCTs]!),
						hex = hash.toHex(result);
					hashes.push(hex);
				}
			}
			return {type: "pdq", hash: config.transform ? hashes : hashes[0], quality: q};
		}).catch(() => {
			throw new Error("Could not process image data.");
		});
};