import { describe, it, expect } from "vitest";
import { jaroszFilterFloat, computeJaroszFilterWindowSize } from "../src/jarosz-filter";

function variance(data: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < data.length; i++) sum += data[i];
	const mean = sum / data.length;
	let v = 0;
	for (let i = 0; i < data.length; i++) v += (data[i] - mean) ** 2;
	return v / data.length;
}

describe("jarosz filter", () => {
	it("leaves uniform data approximately unchanged", () => {
		const size = 256;
		const data = new Float32Array(size * size).fill(128);
		const buffer2 = new Float32Array(size * size);
		const win = computeJaroszFilterWindowSize(size, 64);
		jaroszFilterFloat(data, buffer2, size, size, win, win, 2);
		for (let i = 0; i < data.length; i++) {
			expect(data[i]).toBeCloseTo(128, 0);
		}
	});

	it("mutates buffer1 in-place", () => {
		const size = 256;
		const data = new Float32Array(size * size).fill(128);
		const buffer2 = new Float32Array(size * size);
		const win = computeJaroszFilterWindowSize(size, 64);
		jaroszFilterFloat(data, buffer2, size, size, win, win, 2);
		expect(data).toBeInstanceOf(Float32Array);
	});

	it("reduces variance of noisy data", () => {
		const size = 256;
		const data = new Float32Array(size * size);
		for (let i = 0; i < data.length; i++) data[i] = (i % 2 === 0) ? 200 : 50;
		const originalVariance = variance(new Float32Array(data));
		const buffer2 = new Float32Array(size * size);
		const win = computeJaroszFilterWindowSize(size, 64);
		jaroszFilterFloat(data, buffer2, size, size, win, win, 2);
		expect(variance(data)).toBeLessThan(originalVariance);
	});

	it("more passes produces smoother output", () => {
		const size = 512;
		const data1 = new Float32Array(size * size);
		for (let i = 0; i < data1.length; i++) data1[i] = (i % 2 === 0) ? 200 : 50;
		const data2 = new Float32Array(data1);
		const buf1 = new Float32Array(size * size);
		const buf2 = new Float32Array(size * size);
		const win = computeJaroszFilterWindowSize(size, 64);
		jaroszFilterFloat(data1, buf1, size, size, win, win, 1);
		jaroszFilterFloat(data2, buf2, size, size, win, win, 2);
		expect(variance(data2)).toBeLessThan(variance(data1));
	});

	it("works with realistic large image data", () => {
		const size = 256;
		const data = new Float32Array(size * size);
		for (let i = 0; i < data.length; i++) data[i] = Math.sin(i / 100) * 100 + 128;
		const originalVariance = variance(new Float32Array(data));
		const buffer2 = new Float32Array(size * size);
		const win = computeJaroszFilterWindowSize(size, 64);
		jaroszFilterFloat(data, buffer2, size, size, win, win, 2);
		expect(variance(data)).toBeLessThan(originalVariance);
	});
});
