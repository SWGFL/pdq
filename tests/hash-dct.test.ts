import { describe, it, expect } from "vitest";
import { pdqBuffer16x16ToBits, torben } from "../src/hash-dct";
import { Hash256 } from "../src/hash256";

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

describe("pdqBuffer16x16ToBits", () => {
	it("returns a Hash256", () => {
		const dctData = new Float64Array(256);
		for (let i = 0; i < 256; i++) dctData[i] = i;
		const result = pdqBuffer16x16ToBits(dctData);
		expect(result).toBeInstanceOf(Hash256);
	});

	it("is deterministic", () => {
		const dctData = new Float64Array(256);
		for (let i = 0; i < 256; i++) dctData[i] = Math.sin(i);
		const a = pdqBuffer16x16ToBits(dctData);
		const b = pdqBuffer16x16ToBits(new Float64Array(dctData));
		expect(a.equals(b)).toBe(true);
	});

	it("produces all-zero hash for uniform input", () => {
		const dctData = new Float64Array(256).fill(42);
		const result = pdqBuffer16x16ToBits(dctData);
		expect(result.hammingNorm()).toBe(0);
	});

	it("sets bits where value exceeds median", () => {
		const dctData = new Float64Array(256);
		for (let i = 0; i < 256; i++) dctData[i] = i;
		const result = pdqBuffer16x16ToBits(dctData);
		// values above median should set bits
		expect(result.hammingNorm()).toBeGreaterThan(0);
		expect(result.hammingNorm()).toBeLessThan(256);
	});

	it("hex string is 64 characters", () => {
		const dctData = new Float64Array(256);
		for (let i = 0; i < 256; i++) dctData[i] = i;
		const result = pdqBuffer16x16ToBits(dctData);
		expect(result.toHexString()).toHaveLength(64);
	});
});
