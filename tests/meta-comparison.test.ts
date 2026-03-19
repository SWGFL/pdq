/**
 * Comparison tests: verify the refactored src/ implementation produces
 * identical results to the original Meta Python-to-TypeScript translation.
 */
import { describe, it, expect } from "vitest";
import { pdqHashFromRGBA as srcHashFromRGBA, pdqHash256FromFloatLuma as srcHashFromLuma } from "../src/vpdq/pdqhashing";
import { pdqHashFromRGBA as metaHashFromRGBA, pdqHash256FromFloatLuma as metaHashFromLuma } from "../meta/pdqhashing";
import { fillFloatLumaFromRGBA as srcLuma } from "../src/luminance";
import { fillFloatLumaFromRGBA as metaLuma } from "../meta/downscaling";
import { computeJaroszFilterWindowSize as srcWindowSize, jaroszFilterFloat as srcJarosz } from "../src/jarosz-filter";
import { computeJaroszFilterWindowSize as metaWindowSize, jaroszFilterFloat as metaJarosz } from "../meta/downscaling";
import { decimateFloat as srcDecimate } from "../src/rescale";
import { decimateFloat as metaDecimate } from "../meta/downscaling";
import { dct64To16 as srcDct } from "../src/dct";
import { dct64To16 as metaDct } from "../meta/pdqhashing";
import { pdqBuffer16x16ToBits as srcBits, torben as srcTorben } from "../src/hash-dct";
import { pdqBuffer16x16ToBits as metaBits, torben as metaTorben } from "../meta/pdqhashing";
import { makeUniformRGBA, makeGradientRGBA } from "./helpers";

function makeNoiseRGBA(width: number, height: number, seed: number): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	let s = seed;
	for (let i = 0; i < data.length; i += 4) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const v = s % 256;
		data[i] = v;
		data[i + 1] = (v * 3) % 256;
		data[i + 2] = (v * 7) % 256;
		data[i + 3] = 255;
	}
	return data;
}

function makeStripeRGBA(width: number, height: number): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const v = (y % 16 < 8) ? 200 : 50;
			data[i] = v;
			data[i + 1] = v;
			data[i + 2] = v;
			data[i + 3] = 255;
		}
	}
	return data;
}

describe("Meta vs Src: luminance", () => {
	it("produces identical Float32Array for gradient image", () => {
		const rgba = makeGradientRGBA(128, 128);
		const srcResult = srcLuma(rgba, 128, 128);
		const metaResult = metaLuma(rgba, 128, 128);
		expect(srcResult).toEqual(metaResult);
	});

	it("produces identical Float32Array for noise image", () => {
		const rgba = makeNoiseRGBA(64, 64, 42);
		const srcResult = srcLuma(rgba, 64, 64);
		const metaResult = metaLuma(rgba, 64, 64);
		expect(srcResult).toEqual(metaResult);
	});
});

describe("Meta vs Src: Jarosz filter window size", () => {
	it("matches for common dimensions", () => {
		for (const [old, nw] of [[512, 64], [256, 64], [128, 64], [1920, 64], [64, 64]]) {
			expect(srcWindowSize(old, nw)).toBe(metaWindowSize(old, nw));
		}
	});
});

describe("Meta vs Src: Jarosz filter", () => {
	it("produces identical blurred output for 256x256", () => {
		const rgba = makeNoiseRGBA(256, 256, 99);
		const luma = srcLuma(rgba, 256, 256);

		const srcBuf1 = new Float32Array(luma);
		const srcBuf2 = new Float32Array(256 * 256);
		const metaBuf1 = new Float32Array(luma);
		const metaBuf2 = new Float32Array(256 * 256);

		const winRows = srcWindowSize(256, 64);
		const winCols = srcWindowSize(256, 64);

		srcJarosz(srcBuf1, srcBuf2, 256, 256, winRows, winCols, 2);
		metaJarosz(metaBuf1, metaBuf2, 256, 256, winRows, winCols, 2);

		expect(srcBuf1).toEqual(metaBuf1);
	});
});

describe("Meta vs Src: decimateFloat", () => {
	it("produces identical downsampled output", () => {
		const input = new Float32Array(256 * 256);
		for (let i = 0; i < input.length; i++) input[i] = Math.sin(i / 100) * 100 + 128;

		const srcResult = srcDecimate(input, 256, 256, 64, 64);
		const metaResult = metaDecimate(input, 256, 256, 64, 64);
		expect(srcResult).toEqual(metaResult);
	});
});

describe("Meta vs Src: DCT", () => {
	it("produces identical 16x16 output from 64x64 input", () => {
		const input = new Float32Array(4096);
		for (let i = 0; i < 4096; i++) input[i] = Math.cos(i / 50) * 80 + 128;

		const srcResult = srcDct(input);
		const metaResult = metaDct(input);

		expect(srcResult.length).toBe(metaResult.length);
		for (let i = 0; i < srcResult.length; i++) {
			expect(srcResult[i]).toBeCloseTo(metaResult[i], 10);
		}
	});
});

describe("Meta vs Src: torben median", () => {
	it("produces identical median for various inputs", () => {
		const inputs = [
			new Float64Array([1, 5, 3, 9, 7]),
			new Float64Array(Array.from({ length: 256 }, (_, i) => Math.sin(i) * 100)),
			new Float64Array(Array.from({ length: 256 }, (_, i) => i)),
			new Float64Array(256).fill(42),
		];
		for (const input of inputs) {
			expect(srcTorben(input, input.length)).toBe(metaTorben(input, input.length));
		}
	});
});

describe("Meta vs Src: pdqBuffer16x16ToBits", () => {
	it("produces identical hash from DCT coefficients", () => {
		const dctData = new Float64Array(256);
		for (let i = 0; i < 256; i++) dctData[i] = Math.sin(i * 0.1) * 50;

		const srcHash = srcBits(dctData);
		const metaHash = metaBits(dctData);
		expect(srcHash.toHexString()).toBe(metaHash.toHexString());
	});
});

describe("Meta vs Src: full pdqHashFromRGBA pipeline", () => {
	it("identical hash and quality for 64x64 gradient", () => {
		const rgba = makeGradientRGBA(64, 64);
		const src = srcHashFromRGBA(rgba, 64, 64);
		const meta = metaHashFromRGBA(rgba, 64, 64);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});

	it("identical hash and quality for 256x256 gradient", () => {
		const rgba = makeGradientRGBA(256, 256);
		const src = srcHashFromRGBA(rgba, 256, 256);
		const meta = metaHashFromRGBA(rgba, 256, 256);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});

	it("identical hash and quality for 512x512 noise", () => {
		const rgba = makeNoiseRGBA(512, 512, 12345);
		const src = srcHashFromRGBA(rgba, 512, 512);
		const meta = metaHashFromRGBA(rgba, 512, 512);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});

	it("identical hash and quality for 128x128 stripes", () => {
		const rgba = makeStripeRGBA(128, 128);
		const src = srcHashFromRGBA(rgba, 128, 128);
		const meta = metaHashFromRGBA(rgba, 128, 128);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});

	it("identical hash and quality for uniform white", () => {
		const rgba = makeUniformRGBA(64, 64, 255, 255, 255);
		const src = srcHashFromRGBA(rgba, 64, 64);
		const meta = metaHashFromRGBA(rgba, 64, 64);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});

	it("identical for too-small image (returns zero hash)", () => {
		const rgba = makeUniformRGBA(4, 4, 128, 128, 128);
		const src = srcHashFromRGBA(rgba, 4, 4);
		const meta = metaHashFromRGBA(rgba, 4, 4);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});
});

describe("Meta vs Src: pdqHash256FromFloatLuma", () => {
	it("identical for pre-computed 64x64 luma (skip blur path)", () => {
		const luma = new Float32Array(4096);
		for (let i = 0; i < 4096; i++) luma[i] = Math.sin(i / 100) * 100 + 128;

		const src = srcHashFromLuma(luma, 64, 64);
		const meta = metaHashFromLuma(luma, 64, 64);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});

	it("identical for 512x512 luma (full blur+decimate path)", () => {
		const luma = new Float32Array(512 * 512);
		for (let i = 0; i < luma.length; i++) luma[i] = Math.cos(i / 200) * 80 + 128;

		const src = srcHashFromLuma(luma, 512, 512);
		const meta = metaHashFromLuma(luma, 512, 512);
		expect(src.hash.toHexString()).toBe(meta.hash.toHexString());
		expect(src.quality).toBe(meta.quality);
	});
});
