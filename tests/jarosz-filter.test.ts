import { describe, it, expect } from "vitest";
import jarosz from "../src/jarosz-filter";
import { variance } from "./helpers";

describe("jarosz filter", () => {
	it("leaves uniform data approximately unchanged", () => {
		const data = Array(64).fill(128);
		const result = jarosz(data, 8, 8, 2);
		result.forEach(val => {
			expect(val).toBeCloseTo(128, 0);
		});
	});

	it("returns the same array reference (mutates in-place)", () => {
		const data = Array(64).fill(128);
		const result = jarosz(data, 8, 8, 2);
		expect(result).toBe(data);
	});

	it("reduces variance of noisy data with large image", () => {
		// need large enough image for the window calc to produce a non-zero radius
		const size = 128;
		const data = Array.from({ length: size * size }, (_, i) => (i % 2 === 0) ? 200 : 50);
		const originalVariance = variance([...data]);
		jarosz(data, size, size, 2);
		const filteredVariance = variance(data);
		expect(filteredVariance).toBeLessThan(originalVariance);
	});

	it("more passes produces smoother output", () => {
		const size = 128;
		const data1 = Array.from({ length: size * size }, (_, i) => (i % 2 === 0) ? 200 : 50);
		const data2 = [...data1];
		jarosz(data1, size, size, 1);
		jarosz(data2, size, size, 2);
		expect(variance(data2)).toBeLessThan(variance(data1));
	});

	it("works with realistic large image data", () => {
		const size = 128;
		const data = Array.from({ length: size * size }, (_, i) => Math.round(Math.sin(i / 100) * 100 + 128));
		const originalVariance = variance([...data]);
		jarosz(data, size, size, 2);
		expect(variance(data)).toBeLessThan(originalVariance);
	});
});
