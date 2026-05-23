import { describe, it, expect } from "vitest";
import hash from "../src/hash-dct";

describe("hash.computeDct", () => {
	it("returns a Uint16Array of 16 words", () => {
		const dct = Float32Array.from({ length: 256 }, (_, i) => i);
		const result = hash.computeDct(dct);
		expect(result).toBeInstanceOf(Uint16Array);
		expect(result).toHaveLength(16);
	});

	it("is deterministic", () => {
		const dct = Float32Array.from({ length: 256 }, (_, i) => Math.sin(i));
		expect(hash.computeDct(dct)).toEqual(hash.computeDct(dct));
	});

	it("produces all-zero hash for uniform input", () => {
		const dct = new Float32Array(256).fill(42);
		const result = hash.computeDct(dct);
		// all values equal median, none > median, so all bits are 0
		expect(result.every(word => word === 0)).toBe(true);
	});

	it("sets bits where value exceeds median", () => {
		// values 0..255, median is value at index 127 after sort = 127
		const dct = Float32Array.from({ length: 256 }, (_, i) => i);
		const result = hash.computeDct(dct);
		// values 128-255 should set bits, values 0-127 should not
		// bit k is stored at result[k >> 4] position (k & 15)
		for (let k = 0; k < 256; k++) {
			const bit = (result[k >> 4] >> (k & 15)) & 1;
			if (k > 127) {
				expect(bit).toBe(1);
			} else {
				expect(bit).toBe(0);
			}
		}
	});
});

describe("hash.toHex", () => {
	it("returns a 64-character hex string for 16 words", () => {
		const words = new Uint16Array(16);
		expect(hash.toHex(words)).toHaveLength(64);
	});

	it("converts known words correctly", () => {
		const words = new Uint16Array(16);
		words[0] = 0x00ab;
		words[15] = 0xcd00;
		const hex = hash.toHex(words);
		// toHex iterates from words[15] to words[0], 4 chars each
		expect(hex.startsWith("cd00")).toBe(true);
		expect(hex.endsWith("00ab")).toBe(true);
	});

	it("pads short hex values with zeroes", () => {
		const words = new Uint16Array(16);
		words[0] = 0x0001;
		const hex = hash.toHex(words);
		expect(hex.endsWith("0001")).toBe(true);
	});

	it("produces lowercase hex", () => {
		const words = new Uint16Array(16).fill(0xffff);
		const hex = hash.toHex(words);
		expect(hex).toBe("f".repeat(64));
	});
});
