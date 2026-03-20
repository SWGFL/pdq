import { describe, it, expect } from "vitest";
import matrix from "../src/matrix";

describe("matrix.rotate", () => {
	it("rotates a 2x2 matrix 90 degrees clockwise", () => {
		// [1, 2]    [3, 1]
		// [3, 4] -> [4, 2]
		const input = [1, 2, 3, 4];
		expect(matrix.rotate(input)).toEqual([3, 1, 4, 2]);
	});

	it("rotates a 3x3 matrix", () => {
		// [1, 2, 3]    [7, 4, 1]
		// [4, 5, 6] -> [8, 5, 2]
		// [7, 8, 9]    [9, 6, 3]
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		expect(matrix.rotate(input)).toEqual([7, 4, 1, 8, 5, 2, 9, 6, 3]);
	});

	it("four rotations return the original", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		let result = input;
		for (let i = 0; i < 4; i++) {
			result = matrix.rotate(result);
		}
		expect(result).toEqual(input);
	});

	it("preserves array length", () => {
		const input = Array.from({ length: 256 }, (_, i) => i);
		expect(matrix.rotate(input)).toHaveLength(256);
	});
});

describe("matrix.flip", () => {
	it("flips a 2x2 matrix horizontally", () => {
		// [1, 2]    [2, 1]
		// [3, 4] -> [4, 3]
		const input = [1, 2, 3, 4];
		expect(matrix.flip(input)).toEqual([2, 1, 4, 3]);
	});

	it("flips a 3x3 matrix horizontally", () => {
		// [1, 2, 3]    [3, 2, 1]
		// [4, 5, 6] -> [6, 5, 4]
		// [7, 8, 9]    [9, 8, 7]
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		expect(matrix.flip(input)).toEqual([3, 2, 1, 6, 5, 4, 9, 8, 7]);
	});

	it("double flip returns the original", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		expect(matrix.flip(matrix.flip(input))).toEqual(input);
	});
});

describe("dihedral transformations", () => {
	it("produces 8 distinct results for asymmetric input", () => {
		const input = Array.from({ length: 256 }, (_, i) => i);
		const transforms = new Set<string>();
		transforms.add(JSON.stringify(input));
		transforms.add(JSON.stringify(matrix.rotate(input)));
		transforms.add(JSON.stringify(matrix.flip(input)));

		const rot90 = matrix.rotate(input);
		const rot180 = matrix.rotate(rot90);
		const rot270 = matrix.rotate(rot180);
		const flip = matrix.flip(input);
		const fliprot90 = matrix.rotate(flip);
		const fliprot180 = matrix.rotate(fliprot90);
		const fliprot270 = matrix.rotate(fliprot180);

		transforms.add(JSON.stringify(rot90));
		transforms.add(JSON.stringify(rot180));
		transforms.add(JSON.stringify(rot270));
		transforms.add(JSON.stringify(flip));
		transforms.add(JSON.stringify(fliprot90));
		transforms.add(JSON.stringify(fliprot180));
		transforms.add(JSON.stringify(fliprot270));

		expect(transforms.size).toBe(8);
	});
});
