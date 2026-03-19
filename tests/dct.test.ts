import { describe, it, expect } from "vitest";
import dct from "../src/dct";

describe("dct", () => {
	it("returns 256 elements from a 4096-element input", () => {
		const data = new Float32Array(4096).fill(128);
		const result = dct(data);
		expect(result).toBeInstanceOf(Float64Array);
		expect(result).toHaveLength(256);
	});

	it("is deterministic", () => {
		const data = new Float32Array(4096);
		for (let i = 0; i < 4096; i++) data[i] = Math.sin(i) * 128 + 128;
		const a = dct(data);
		const b = dct(new Float32Array(data));
		expect(Array.from(a)).toEqual(Array.from(b));
	});

	it("uniform input produces near-zero output", () => {
		const data = new Float32Array(4096).fill(200);
		const result = dct(data);
		const maxMagnitude = Math.max(...Array.from(result).map(Math.abs));
		expect(maxMagnitude).toBeLessThan(1);
	});

	it("works with number[] input", () => {
		const data = Array.from({ length: 4096 }, () => 100);
		const result = dct(data);
		expect(result).toHaveLength(256);
	});

	it("different inputs produce different outputs", () => {
		const a = new Float32Array(4096);
		const b = new Float32Array(4096);
		for (let i = 0; i < 4096; i++) {
			a[i] = Math.sin(i) * 100 + 128;
			b[i] = Math.cos(i * 3) * 100 + 128;
		}
		const resultA = dct(a);
		const resultB = dct(b);
		const same = Array.from(resultA).every((v, i) => Math.abs(v - resultB[i]) < 1e-10);
		expect(same).toBe(false);
	});
});
