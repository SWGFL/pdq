import { describe, it, expect } from "vitest";
import { fillFloatLumaFromRGBA } from "../src/luminance";

describe("luminance", () => {
	it("converts a white pixel to ~255", () => {
		const rgba = new Uint8ClampedArray([255, 255, 255, 255]);
		const result = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(result).toBeInstanceOf(Float32Array);
		expect(result).toHaveLength(1);
		expect(result[0]).toBeCloseTo(255, 0);
	});

	it("converts a black pixel to 0", () => {
		const rgba = new Uint8ClampedArray([0, 0, 0, 255]);
		const result = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(result[0]).toBe(0);
	});

	it("converts pure red using correct coefficient", () => {
		const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
		const result = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(result[0]).toBeCloseTo(0.299 * 255, 1);
	});

	it("converts pure green using correct coefficient", () => {
		const rgba = new Uint8ClampedArray([0, 255, 0, 255]);
		const result = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(result[0]).toBeCloseTo(0.587 * 255, 1);
	});

	it("converts pure blue using correct coefficient", () => {
		const rgba = new Uint8ClampedArray([0, 0, 255, 255]);
		const result = fillFloatLumaFromRGBA(rgba, 1, 1);
		expect(result[0]).toBeCloseTo(0.114 * 255, 1);
	});

	it("ignores the alpha channel", () => {
		const opaque = fillFloatLumaFromRGBA(new Uint8ClampedArray([100, 150, 200, 255]), 1, 1);
		const transparent = fillFloatLumaFromRGBA(new Uint8ClampedArray([100, 150, 200, 0]), 1, 1);
		expect(opaque[0]).toBe(transparent[0]);
	});

	it("handles multiple pixels", () => {
		const rgba = new Uint8ClampedArray([
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			128, 128, 128, 255,
		]);
		const result = fillFloatLumaFromRGBA(rgba, 2, 2);
		expect(result).toHaveLength(4);
	});

	it("returns empty array for empty input", () => {
		const rgba = new Uint8ClampedArray(0);
		const result = fillFloatLumaFromRGBA(rgba, 0, 0);
		expect(result).toHaveLength(0);
	});
});
