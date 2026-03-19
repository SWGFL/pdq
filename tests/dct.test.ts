import { describe, it, expect } from "vitest";
import dct from "../src/dct";
import { makeUniformBlock } from "./helpers";

describe("dct", () => {
	it("returns 256 elements from a 4096-element input", () => {
		const data = makeUniformBlock(64, 128);
		const result = dct(data);
		expect(result).toHaveLength(256);
	});

	it("is deterministic", () => {
		const data = Array.from({ length: 4096 }, (_, i) => Math.sin(i) * 128 + 128);
		expect(dct(data)).toEqual(dct([...data]));
	});

	it("uniform input produces near-zero output", () => {
		const data = makeUniformBlock(64, 200);
		const result = dct(data);
		// DCT uses cos((i+1)*...) so uniform input maps to near-zero across all coefficients
		const maxMagnitude = Math.max(...result.map(Math.abs));
		expect(maxMagnitude).toBeLessThan(1);
	});

	it("works with Uint8Array input", () => {
		const data = new Uint8Array(4096).fill(100);
		const result = dct(data);
		expect(result).toHaveLength(256);
	});

	it("different inputs produce different outputs", () => {
		const a = Array.from({ length: 4096 }, (_, i) => Math.sin(i) * 100 + 128);
		const b = Array.from({ length: 4096 }, (_, i) => Math.cos(i * 3) * 100 + 128);
		const resultA = dct(a);
		const resultB = dct(b);
		const same = resultA.every((v, i) => Math.abs(v - resultB[i]) < 1e-10);
		expect(same).toBe(false);
	});
});
