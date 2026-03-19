import { describe, it, expect } from "vitest";
import {
	fillFloatLumaFromRGBA,
	fillFloatLumaFromRGB,
	fillFloatLumaFromGrey,
	computeJaroszFilterWindowSize,
	decimateFloat,
} from "../../src/vpdq/downscaling";

describe("fillFloatLumaFromRGBA", () => {
	it("converts white pixel to ~255", () => {
		const rgba = new Uint8ClampedArray([255, 255, 255, 255]);
		const luma = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(luma).toBeInstanceOf(Float32Array);
		expect(luma[0]).toBeCloseTo(255, 0);
	});

	it("converts black pixel to 0", () => {
		const rgba = new Uint8ClampedArray([0, 0, 0, 255]);
		const luma = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(luma[0]).toBe(0);
	});

	it("uses standard luma coefficients", () => {
		const red = fillFloatLumaFromRGBA(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
		expect(red[0]).toBeCloseTo(0.299 * 255, 0);

		const green = fillFloatLumaFromRGBA(new Uint8ClampedArray([0, 255, 0, 255]), 1, 1);
		expect(green[0]).toBeCloseTo(0.587 * 255, 0);

		const blue = fillFloatLumaFromRGBA(new Uint8ClampedArray([0, 0, 255, 255]), 1, 1);
		expect(blue[0]).toBeCloseTo(0.114 * 255, 0);
	});

	it("returns correct size for multi-pixel image", () => {
		const rgba = new Uint8ClampedArray(4 * 4 * 4); // 4x4 image
		const luma = fillFloatLumaFromRGBA(rgba, 4, 4);
		expect(luma).toHaveLength(16);
	});
});

describe("fillFloatLumaFromRGB", () => {
	it("computes luma from separate channels", () => {
		const r = new Uint8Array([255]);
		const g = new Uint8Array([0]);
		const b = new Uint8Array([0]);
		const luma = fillFloatLumaFromRGB(r, g, b, 1, 1);
		expect(luma[0]).toBeCloseTo(0.299 * 255, 0);
	});
});

describe("fillFloatLumaFromGrey", () => {
	it("copies grey values directly", () => {
		const grey = new Uint8Array([100, 200, 50]);
		const luma = fillFloatLumaFromGrey(grey, 1, 3);
		expect(luma[0]).toBe(100);
		expect(luma[1]).toBe(200);
		expect(luma[2]).toBe(50);
	});
});

describe("computeJaroszFilterWindowSize", () => {
	it("computes expected window for 512 -> 64", () => {
		const result = computeJaroszFilterWindowSize(512, 64);
		expect(result).toBe(Math.floor((512 + 127) / 128));
	});

	it("returns 1 when dimensions are equal", () => {
		// floor((64 + 127) / 128) = floor(191/128) = 1
		const result = computeJaroszFilterWindowSize(64, 64);
		expect(result).toBe(1);
	});
});

describe("decimateFloat", () => {
	it("returns correct output size", () => {
		const input = new Float32Array(64 * 64);
		const result = decimateFloat(input, 64, 64, 8, 8);
		expect(result).toHaveLength(64);
	});

	it("preserves uniform values", () => {
		const input = new Float32Array(100).fill(42);
		const result = decimateFloat(input, 10, 10, 4, 4);
		result.forEach(val => {
			expect(val).toBeCloseTo(42, 5);
		});
	});

	it("downsamples by center-point sampling", () => {
		const input = new Float32Array(16);
		for (let i = 0; i < 16; i++) input[i] = i;
		const result = decimateFloat(input, 4, 4, 2, 2);
		expect(result).toHaveLength(4);
	});
});
