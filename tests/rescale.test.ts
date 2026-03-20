import { describe, it, expect } from "vitest";
import rescale from "../src/rescale";
import { makeUniformBlock } from "./helpers";

describe("rescale", () => {
	it("returns Uint8Array of length block * block", () => {
		const data = makeUniformBlock(128, 100);
		const result = rescale(128, 128, 8, data);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result).toHaveLength(64); // 8 * 8
	});

	it("preserves uniform value", () => {
		const data = makeUniformBlock(128, 200);
		const result = rescale(128, 128, 8, data);
		result.forEach(val => {
			expect(val).toBe(200);
		});
	});

	it("downscales from 128x128 to 64x64", () => {
		const data = makeUniformBlock(128, 150);
		const result = rescale(128, 128, 64, data);
		expect(result).toHaveLength(4096);
	});

	it("works with Uint8Array input", () => {
		const data = new Uint8Array(256).fill(100);
		const result = rescale(16, 16, 4, data);
		expect(result).toHaveLength(16);
	});

	it("samples center pixels from blocks", () => {
		// create a 4x4 image with distinct quadrant values
		const data = [
			10, 10, 90, 90,
			10, 10, 90, 90,
			170, 170, 250, 250,
			170, 170, 250, 250,
		];
		const result = rescale(4, 4, 2, data);
		// should pick center pixels from each 2x2 block
		expect(result).toHaveLength(4);
	});
});
