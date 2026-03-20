import { describe, it, expect } from "vitest";
import quality from "../src/quality";
import { makeUniformBlock, makeCheckerboard, makeGradientBlock } from "./helpers";

describe("quality", () => {
	it("returns 0 for a uniform block", () => {
		const data = makeUniformBlock(8, 128);
		expect(quality(8, data)).toBe(0);
	});

	it("returns high quality for a checkerboard pattern", () => {
		const data = makeCheckerboard(8, 0, 255);
		expect(quality(8, data)).toBeGreaterThan(50);
	});

	it("caps at 100", () => {
		const data = makeCheckerboard(64, 0, 255);
		expect(quality(64, data)).toBeLessThanOrEqual(100);
	});

	it("returns non-zero for a gradient", () => {
		const data = makeGradientBlock(8);
		expect(quality(8, data)).toBeGreaterThan(0);
	});

	it("works with a 64x64 block", () => {
		const data = makeGradientBlock(64);
		const q = quality(64, data);
		expect(q).toBeGreaterThan(0);
		expect(q).toBeLessThanOrEqual(100);
	});

	it("works with Uint8Array input", () => {
		const data = new Uint8Array(makeCheckerboard(8, 0, 255));
		expect(quality(8, data)).toBeGreaterThan(0);
	});
});
