import { describe, it, expect } from "vitest";
import dct from "../src/dct";
import { makeUniformBlock } from "./helpers";

describe("dct", () => {
	it("returns 256 elements from a 4096-element input", () => {
		const data = new Float32Array(makeUniformBlock(64, 128));
		const result = dct(data);
		expect(result).toHaveLength(256);
	});

	it("is deterministic", () => {
		const data = Float32Array.from({ length: 4096 }, (_, i) => Math.sin(i) * 128 + 128);
		expect(dct(data)).toEqual(dct(new Float32Array(data)));
	});

	it("uniform input produces near-zero output", () => {
		const data = new Float32Array(makeUniformBlock(64, 200));
		const result = dct(data);
		// DCT uses cos((i+1)*...) so uniform input maps to near-zero across all coefficients
		const maxMagnitude = Math.max(...result.map(Math.abs));
		expect(maxMagnitude).toBeLessThan(1);
	});

	it("works with Float32Array input", () => {
		const data = new Float32Array(4096).fill(100);
		const result = dct(data);
		expect(result).toHaveLength(256);
	});

	it("different inputs produce different outputs", () => {
		const a = Float32Array.from({ length: 4096 }, (_, i) => Math.sin(i) * 100 + 128);
		const b = Float32Array.from({ length: 4096 }, (_, i) => Math.cos(i * 3) * 100 + 128);
		const resultA = dct(a);
		const resultB = dct(b);
		const same = resultA.every((v, i) => Math.abs(v - resultB[i]) < 1e-10);
		expect(same).toBe(false);
	});
});
