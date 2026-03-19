import { describe, it, expect } from "vitest";
import matrix from "../src/matrix";

describe("matrix.rotate", () => {
	it("rotates a 2x2 matrix 90 degrees clockwise", () => {
		const input = [1, 2, 3, 4];
		expect(Array.from(matrix.rotate(input))).toEqual([3, 1, 4, 2]);
	});

	it("rotates a 3x3 matrix", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		expect(Array.from(matrix.rotate(input))).toEqual([7, 4, 1, 8, 5, 2, 9, 6, 3]);
	});

	it("four rotations return the original", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		let result: Float64Array | number[] = input;
		for (let i = 0; i < 4; i++) {
			result = matrix.rotate(result);
		}
		expect(Array.from(result)).toEqual(input);
	});

	it("preserves array length", () => {
		const input = Array.from({ length: 256 }, (_, i) => i);
		expect(matrix.rotate(input)).toHaveLength(256);
	});

	it("works with Float64Array", () => {
		const input = new Float64Array([1, 2, 3, 4]);
		const result = matrix.rotate(input);
		expect(result).toBeInstanceOf(Float64Array);
		expect(Array.from(result)).toEqual([3, 1, 4, 2]);
	});
});

describe("matrix.flip", () => {
	it("flips a 2x2 matrix horizontally", () => {
		const input = [1, 2, 3, 4];
		expect(Array.from(matrix.flip(input))).toEqual([2, 1, 4, 3]);
	});

	it("flips a 3x3 matrix horizontally", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		expect(Array.from(matrix.flip(input))).toEqual([3, 2, 1, 6, 5, 4, 9, 8, 7]);
	});

	it("double flip returns the original", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		expect(Array.from(matrix.flip(matrix.flip(input)))).toEqual(input);
	});

	it("works with Float64Array", () => {
		const input = new Float64Array([1, 2, 3, 4]);
		const result = matrix.flip(input);
		expect(result).toBeInstanceOf(Float64Array);
		expect(Array.from(result)).toEqual([2, 1, 4, 3]);
	});
});

describe("dihedral transformations", () => {
	it("produces 8 distinct results for asymmetric input", () => {
		const input = Array.from({ length: 256 }, (_, i) => i);
		const transforms = new Set<string>();

		const rot90 = matrix.rotate(input);
		const rot180 = matrix.rotate(rot90);
		const rot270 = matrix.rotate(rot180);
		const flip = matrix.flip(input);
		const fliprot90 = matrix.rotate(flip);
		const fliprot180 = matrix.rotate(fliprot90);
		const fliprot270 = matrix.rotate(fliprot180);

		transforms.add(JSON.stringify(Array.from(input)));
		transforms.add(JSON.stringify(Array.from(rot90)));
		transforms.add(JSON.stringify(Array.from(rot180)));
		transforms.add(JSON.stringify(Array.from(rot270)));
		transforms.add(JSON.stringify(Array.from(flip)));
		transforms.add(JSON.stringify(Array.from(fliprot90)));
		transforms.add(JSON.stringify(Array.from(fliprot180)));
		transforms.add(JSON.stringify(Array.from(fliprot270)));

		expect(transforms.size).toBe(8);
	});
});
