import { describe, it, expect } from "vitest";
import hash from "../src/hash-dct";

describe("hash.computeDct", () => {
	it("returns a 32-byte Uint8Array", () => {
		const dct = Array.from({ length: 256 }, (_, i) => i);
		const result = hash.computeDct(dct);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result).toHaveLength(32);
	});

	it("is deterministic", () => {
		const dct = Array.from({ length: 256 }, (_, i) => Math.sin(i));
		expect(hash.computeDct(dct)).toEqual(hash.computeDct(dct));
	});

	it("produces all-zero hash for uniform input", () => {
		const dct = Array(256).fill(42);
		const result = hash.computeDct(dct);
		// all values equal median, none > median, so all bits are 0
		expect(result.every(byte => byte === 0)).toBe(true);
	});

	it("sets bits where value exceeds median", () => {
		// values 0..255, median is value at index 127 after sort = 127
		const dct = Array.from({ length: 256 }, (_, i) => i);
		const result = hash.computeDct(dct);
		// values 128-255 should set bits, values 0-127 should not
		// bit i is set if dct[i] > median(127)
		for (let i = 0; i < 256; i++) {
			const byteIdx = Math.floor(i / 8);
			const bitIdx = i % 8;
			const bit = (result[byteIdx] >> bitIdx) & 1;
			if (i > 127) {
				expect(bit).toBe(1);
			} else {
				expect(bit).toBe(0);
			}
		}
	});
});

describe("hash.toHex", () => {
	it("returns a 64-character hex string for 32 bytes", () => {
		const bytes = new Uint8Array(32);
		expect(hash.toHex(bytes)).toHaveLength(64);
	});

	it("converts known bytes correctly", () => {
		const bytes = new Uint8Array(32);
		bytes[0] = 0xab;
		bytes[31] = 0xcd;
		const hex = hash.toHex(bytes);
		// toHex reverses byte order, so bytes[31] appears first
		expect(hex.startsWith("cd")).toBe(true);
		expect(hex.endsWith("ab")).toBe(true);
	});

	it("pads single-digit hex values with zero", () => {
		const bytes = new Uint8Array(32);
		bytes[0] = 0x01;
		const hex = hash.toHex(bytes);
		expect(hex.endsWith("01")).toBe(true);
	});

	it("produces lowercase hex", () => {
		const bytes = new Uint8Array(32).fill(0xff);
		const hex = hash.toHex(bytes);
		expect(hex).toBe("f".repeat(64));
	});
});
