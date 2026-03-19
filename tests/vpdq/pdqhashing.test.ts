import { describe, it, expect } from "vitest";
import {
	pdqHashFromRGBA,
	pdqHash256FromFloatLuma,
	torben,
	dct64To16,
	MIN_HASHABLE_DIM,
} from "../../src/vpdq/pdqhashing";
import { Hash256 } from "../../src/vpdq/hash256";
import { makeUniformRGBA, makeGradientRGBA } from "../helpers";

describe("torben (median finder)", () => {
	it("finds median of odd-length array", () => {
		expect(torben([1, 3, 5, 7, 9], 5)).toBe(5);
	});

	it("finds median of even-length array", () => {
		const result = torben([10, 20, 30, 40], 4);
		expect(result).toBeGreaterThanOrEqual(20);
		expect(result).toBeLessThanOrEqual(30);
	});

	it("handles single element", () => {
		expect(torben([42], 1)).toBe(42);
	});

	it("handles identical values", () => {
		expect(torben([7, 7, 7, 7, 7], 5)).toBe(7);
	});

	it("works with Float64Array", () => {
		const arr = new Float64Array([1.5, 2.5, 3.5, 4.5, 5.5]);
		expect(torben(arr, 5)).toBeCloseTo(3.5, 5);
	});
});

describe("dct64To16", () => {
	it("returns Float64Array of length 256", () => {
		const input = new Float32Array(4096).fill(100);
		const result = dct64To16(input);
		expect(result).toBeInstanceOf(Float64Array);
		expect(result).toHaveLength(256);
	});

	it("uniform input produces near-zero output", () => {
		const input = new Float32Array(4096).fill(200);
		const result = dct64To16(input);
		const maxMagnitude = Math.max(...Array.from(result).map(Math.abs));
		expect(maxMagnitude).toBeLessThan(1);
	});
});

describe("pdqHashFromRGBA", () => {
	it("returns hash and quality", () => {
		const rgba = makeGradientRGBA(64, 64);
		const { hash, quality } = pdqHashFromRGBA(rgba, 64, 64);
		expect(hash).toBeInstanceOf(Hash256);
		expect(typeof quality).toBe("number");
	});

	it("returns zero hash for too-small images", () => {
		const rgba = makeUniformRGBA(4, 4, 128, 128, 128);
		const { hash, quality } = pdqHashFromRGBA(rgba, 4, 4);
		expect(hash.hammingNorm()).toBe(0);
		expect(quality).toBe(0);
	});

	it("is deterministic", () => {
		const rgba = makeGradientRGBA(64, 64);
		const a = pdqHashFromRGBA(rgba, 64, 64);
		const b = pdqHashFromRGBA(rgba, 64, 64);
		expect(a.hash.equals(b.hash)).toBe(true);
		expect(a.quality).toBe(b.quality);
	});

	it("uniform white image has quality 0", () => {
		const rgba = makeUniformRGBA(64, 64, 255, 255, 255);
		const { quality } = pdqHashFromRGBA(rgba, 64, 64);
		expect(quality).toBe(0);
	});

	it("different images produce different hashes", () => {
		const white = makeUniformRGBA(64, 64, 255, 255, 255);
		const gradient = makeGradientRGBA(64, 64);
		const a = pdqHashFromRGBA(white, 64, 64);
		const b = pdqHashFromRGBA(gradient, 64, 64);
		expect(a.hash.equals(b.hash)).toBe(false);
	});

	it("works with larger images", () => {
		const rgba = makeGradientRGBA(256, 256);
		const { hash, quality } = pdqHashFromRGBA(rgba, 256, 256);
		expect(hash).toBeInstanceOf(Hash256);
		expect(quality).toBeGreaterThanOrEqual(0);
	});
});

describe("pdqHash256FromFloatLuma", () => {
	it("returns zero for too-small input", () => {
		const luma = new Float32Array(16).fill(100);
		const { hash, quality } = pdqHash256FromFloatLuma(luma, 4, 4);
		expect(hash.hammingNorm()).toBe(0);
		expect(quality).toBe(0);
	});

	it("handles 64x64 input without blurring", () => {
		const luma = new Float32Array(4096);
		for (let i = 0; i < 4096; i++) luma[i] = Math.sin(i / 100) * 100 + 128;
		const { hash } = pdqHash256FromFloatLuma(luma, 64, 64);
		expect(hash).toBeInstanceOf(Hash256);
	});
});
