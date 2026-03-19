import { jaroszFilterFloat, computeJaroszFilterWindowSize } from "./jarosz-filter";
import render, { renderHash } from "./render";
import matrix from "./matrix";
import { pdqBuffer16x16ToBits, torben } from "./hash-dct";
import { fillFloatLumaFromRGBA } from "./luminance";
import { decimateFloat } from "./rescale";
import dct from "./dct";
import quality from "./quality";
import { Hash256 } from "./hash256";

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

export interface PdqHashResult {
	hash: Hash256;
	quality: number;
}

const PDQ_NUM_JAROSZ_XY_PASSES = 2;
const MIN_HASHABLE_DIM = 5;

// Scratch buffer cache keyed by pixel count (numRows * numCols)
let cachedSize = 0;
let cachedBuf1: Float32Array | null = null;
let cachedBuf2: Float32Array | null = null;

function getScratchBuffers(n: number): [Float32Array, Float32Array] {
	if (n !== cachedSize || !cachedBuf1 || !cachedBuf2) {
		cachedSize = n;
		cachedBuf1 = new Float32Array(n);
		cachedBuf2 = new Float32Array(n);
	}
	return [cachedBuf1, cachedBuf2];
}

/**
 * Hash RGBA pixel data to a 256-bit perceptual hash.
 */
function pdqHashFromRGBA(rgbaData: Uint8Array | Uint8ClampedArray, numRows: number, numCols: number): PdqHashResult {
	if (numRows < MIN_HASHABLE_DIM || numCols < MIN_HASHABLE_DIM) {
		return { hash: new Hash256(), quality: 0 };
	}

	const luma = fillFloatLumaFromRGBA(rgbaData, numRows, numCols);
	return pdqHash256FromFloatLuma(luma, numRows, numCols);
}

/**
 * Hash pre-computed luminance data to a 256-bit perceptual hash.
 * Scratch buffers are cached so repeated calls at the same resolution
 * (e.g. video frames) avoid re-allocation.
 */
function pdqHash256FromFloatLuma(lumaBuffer: Float32Array, numRows: number, numCols: number): PdqHashResult {
	if (numRows < MIN_HASHABLE_DIM || numCols < MIN_HASHABLE_DIM) {
		return { hash: new Hash256(), quality: 0 };
	}

	let buffer64x64: Float32Array;

	if (numRows === 64 && numCols === 64) {
		buffer64x64 = new Float32Array(lumaBuffer);
	} else {
		const n = numRows * numCols;
		const [buffer1, buffer2] = getScratchBuffers(n);
		buffer1.set(lumaBuffer);

		const windowSizeAlongRows = computeJaroszFilterWindowSize(numCols, 64);
		const windowSizeAlongCols = computeJaroszFilterWindowSize(numRows, 64);

		jaroszFilterFloat(
			buffer1,
			buffer2,
			numRows,
			numCols,
			windowSizeAlongRows,
			windowSizeAlongCols,
			PDQ_NUM_JAROSZ_XY_PASSES
		);

		buffer64x64 = decimateFloat(buffer1, numRows, numCols, 64, 64);
	}

	const q = quality(64, buffer64x64);
	const dctOutput = dct(buffer64x64);
	const hash = pdqBuffer16x16ToBits(dctOutput);

	return { hash, quality: q };
}

/**
 * Perceptual hash (PDQ) implementation for image similarity comparison.
 * Accepts an HTMLCanvasElement and optional config for debug/transforms.
 */
export default (canvas: HTMLCanvasElement, config?: PdqConfig): Promise<PdqResult> => {

	const opts = Object.assign({
		debug: false,
		passes: PDQ_NUM_JAROSZ_XY_PASSES,
		block: 64,
		transform: false,
	}, config);

	const block = opts.block,
		debug = opts.debug,
		width = canvas.width,
		height = canvas.height;

	if (debug) {
		document.body.appendChild(canvas);
	}

	return new Promise<PdqResult>(resolve => {

		const imgdata = canvas.getContext("2d")!.getImageData(0, 0, width, height).data;

		// Fast path: no debug rendering or dihedral transforms needed
		if (!debug && !opts.transform) {
			const { hash, quality: q } = pdqHashFromRGBA(imgdata, height, width);
			resolve({ type: "pdq", hash: hash.toHexString(), quality: q });
			return;
		}

		// Debug/transform path: need intermediate results for rendering
		const luma = fillFloatLumaFromRGBA(imgdata, height, width);

		if (debug) {
			render(width, height, luma);
		}

		const buffer2 = new Float32Array(height * width);
		const windowSizeAlongRows = computeJaroszFilterWindowSize(width, block);
		const windowSizeAlongCols = computeJaroszFilterWindowSize(height, block);
		jaroszFilterFloat(luma, buffer2, height, width, windowSizeAlongRows, windowSizeAlongCols, opts.passes);

		if (debug) {
			render(width, height, luma);
		}

		const scaled = decimateFloat(luma, height, width, block, block);

		if (debug) {
			render(block, block, scaled);
		}

		const q = quality(block, scaled);
		const dctOutput = dct(scaled);

		if (debug) {
			console.log(dctOutput);
		}

		// generate dihedral transforms if requested
		const dcts: Record<string, Float64Array> = { original: dctOutput };
		if (opts.transform) {
			dcts.rot90 = matrix.rotate(dctOutput) as Float64Array;
			dcts.flip = matrix.flip(dctOutput) as Float64Array;
			dcts.rot180 = matrix.rotate(dcts.rot90) as Float64Array;
			dcts.rot270 = matrix.rotate(dcts.rot180) as Float64Array;
			dcts.fliprot90 = matrix.rotate(dcts.flip) as Float64Array;
			dcts.fliprot180 = matrix.rotate(dcts.fliprot90) as Float64Array;
			dcts.fliprot270 = matrix.rotate(dcts.fliprot180) as Float64Array;
		}

		if (debug) {
			console.log(dcts);
		}

		const hashes: string[] = [];
		for (const item in dcts) {
			const hash = pdqBuffer16x16ToBits(dcts[item]);
			const hex = hash.toHexString();
			hashes.push(hex);

			if (debug) {
				renderHash(hash);
			}
		}

		resolve({ type: "pdq", hash: opts.transform ? hashes : hashes[0], quality: q });
	});
};

export { default as dct64To16 } from "./dct";

export {
	pdqHashFromRGBA,
	pdqHash256FromFloatLuma,
	pdqBuffer16x16ToBits,
	torben,
	MIN_HASHABLE_DIM,
};
