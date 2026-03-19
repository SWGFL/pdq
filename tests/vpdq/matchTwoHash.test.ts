import { describe, it, expect } from "vitest";
import { matchTwoHashBrute, isMatch } from "../../src/vpdq/matchTwoHash";
import { VpdqFeature, VpdqMatchResult } from "../../src/vpdq/vpdqTypes";
import { Hash256 } from "../../src/hash256";

function makeFeature(hexChar: string, quality: number): VpdqFeature {
	return new VpdqFeature(
		Hash256.fromHexString(hexChar.repeat(64)),
		0,
		quality,
		0.0
	);
}

describe("matchTwoHashBrute", () => {
	it("returns 100% for identical features", () => {
		const features = [makeFeature("a", 80), makeFeature("b", 80)];
		const result = matchTwoHashBrute(features, features, 31, 50);
		expect(result.queryMatchPercent).toBe(100);
		expect(result.comparedMatchPercent).toBe(100);
	});

	it("returns 0% for completely different features", () => {
		const query = [makeFeature("0", 80)];
		const target = [makeFeature("f", 80)];
		// hamming distance between all-0 and all-f is 256, way above 31
		const result = matchTwoHashBrute(query, target, 31, 50);
		expect(result.queryMatchPercent).toBe(0);
		expect(result.comparedMatchPercent).toBe(0);
	});

	it("returns 0 for empty inputs", () => {
		const result = matchTwoHashBrute([], [], 31, 50);
		expect(result.queryMatchPercent).toBe(0);
		expect(result.comparedMatchPercent).toBe(0);
	});

	it("filters out low quality features", () => {
		const query = [makeFeature("a", 30)]; // below threshold
		const target = [makeFeature("a", 80)];
		const result = matchTwoHashBrute(query, target, 31, 50);
		// query filtered to empty
		expect(result.queryMatchPercent).toBe(0);
	});

	it("handles asymmetric match percentages", () => {
		const query = [makeFeature("a", 80)];
		const target = [makeFeature("a", 80), makeFeature("b", 80)];
		const result = matchTwoHashBrute(query, target, 31, 50);
		expect(result.queryMatchPercent).toBe(100); // 1/1 query matched
		expect(result.comparedMatchPercent).toBe(50); // 1/2 target matched
	});
});

describe("isMatch", () => {
	it("returns true for identical features with default thresholds", () => {
		const features = [makeFeature("a", 80), makeFeature("b", 80)];
		const { isMatch: matched, result } = isMatch(features, features);
		expect(matched).toBe(true);
		expect(result).toBeInstanceOf(VpdqMatchResult);
	});

	it("returns false for completely different features", () => {
		const query = [makeFeature("0", 80)];
		const target = [makeFeature("f", 80)];
		const { isMatch: matched } = isMatch(query, target);
		expect(matched).toBe(false);
	});

	it("respects custom thresholds", () => {
		const query = [makeFeature("a", 80)];
		const target = [makeFeature("a", 80), makeFeature("f", 80)];
		// 50% target match, set threshold to 60%
		const { isMatch: matched } = isMatch(query, target, {
			queryMatchThreshold: 60,
		});
		expect(matched).toBe(false);
	});
});
