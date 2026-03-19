import { describe, it, expect } from "vitest";
import { decimateFloat } from "../src/rescale";

describe("rescale (decimateFloat)", () => {
	it("returns Float32Array of correct length", () => {
		const data = new Float32Array(128 * 128).fill(100);
		const result = decimateFloat(data, 128, 128, 8, 8);
		expect(result).toBeInstanceOf(Float32Array);
		expect(result).toHaveLength(64); // 8 * 8
	});

	it("preserves uniform value", () => {
		const data = new Float32Array(128 * 128).fill(200);
		const result = decimateFloat(data, 128, 128, 8, 8);
		result.forEach(val => {
			expect(val).toBeCloseTo(200, 5);
		});
	});

	it("downscales from 128x128 to 64x64", () => {
		const data = new Float32Array(128 * 128).fill(150);
		const result = decimateFloat(data, 128, 128, 64, 64);
		expect(result).toHaveLength(4096);
	});

	it("works with small input", () => {
		const data = new Float32Array(16 * 16).fill(100);
		const result = decimateFloat(data, 16, 16, 4, 4);
		expect(result).toHaveLength(16);
	});

	it("samples center pixels from blocks", () => {
		const data = new Float32Array(16);
		for (let i = 0; i < 16; i++) data[i] = i;
		const result = decimateFloat(data, 4, 4, 2, 2);
		expect(result).toHaveLength(4);
	});
});
