import { describe, it, expect } from "vitest";
import {
	featuresToCppFormat,
	featuresFromCppFormat,
	featuresToJson,
	featuresFromJson,
	dedupeFeatures,
	qualityFilterFeatures,
	prepareFeatures,
} from "../../src/vpdq/vpdqio";
import { VpdqFeature } from "../../src/vpdq/vpdqTypes";
import { Hash256 } from "../../src/vpdq/hash256";

function makeFeature(hexChar: string, frameNumber: number, quality: number, timeStamp: number): VpdqFeature {
	return new VpdqFeature(
		Hash256.fromHexString(hexChar.repeat(64)),
		frameNumber,
		quality,
		timeStamp
	);
}

describe("C++ format", () => {
	it("roundtrips features", () => {
		const features = [
			makeFeature("a", 0, 80, 0.0),
			makeFeature("b", 1, 90, 1.0),
		];
		const text = featuresToCppFormat(features);
		const loaded = featuresFromCppFormat(text);

		expect(loaded).toHaveLength(2);
		expect(loaded[0].pdqHash.equals(features[0].pdqHash)).toBe(true);
		expect(loaded[0].frameNumber).toBe(0);
		expect(loaded[0].quality).toBe(80);
		expect(loaded[0].timeStamp).toBeCloseTo(0.0, 3);
		expect(loaded[1].frameNumber).toBe(1);
	});

	it("rejects malformed lines", () => {
		expect(() => featuresFromCppFormat("invalid")).toThrow();
	});

	it("handles empty input", () => {
		const text = featuresToCppFormat([]);
		expect(text).toBe("");
	});
});

describe("JSON format", () => {
	it("roundtrips features", () => {
		const features = [
			makeFeature("c", 0, 75, 2.5),
			makeFeature("d", 1, 85, 3.5),
		];
		const json = featuresToJson(features);
		const loaded = featuresFromJson(json);

		expect(loaded).toHaveLength(2);
		expect(loaded[0].pdqHash.equals(features[0].pdqHash)).toBe(true);
		expect(loaded[0].quality).toBe(75);
		expect(loaded[0].timeStamp).toBeCloseTo(2.5, 3);
	});

	it("returns empty array for empty string", () => {
		expect(featuresFromJson("")).toEqual([]);
	});

	it("rejects invalid hash length", () => {
		const badJson = JSON.stringify(["abc,50,1.000"]);
		expect(() => featuresFromJson(badJson)).toThrow();
	});

	it("rejects wrong number of fields", () => {
		const badJson = JSON.stringify(["a".repeat(64) + ",50"]);
		expect(() => featuresFromJson(badJson)).toThrow();
	});
});

describe("dedupeFeatures", () => {
	it("removes duplicate hashes, keeps first", () => {
		const features = [
			makeFeature("a", 0, 80, 0.0),
			makeFeature("a", 1, 90, 1.0),
			makeFeature("b", 2, 70, 2.0),
		];
		const result = dedupeFeatures(features);
		expect(result).toHaveLength(2);
		expect(result[0].frameNumber).toBe(0);
		expect(result[1].frameNumber).toBe(2);
	});

	it("returns empty for empty input", () => {
		expect(dedupeFeatures([])).toEqual([]);
	});
});

describe("qualityFilterFeatures", () => {
	it("filters out features below threshold", () => {
		const features = [
			makeFeature("a", 0, 30, 0.0),
			makeFeature("b", 1, 60, 1.0),
			makeFeature("c", 2, 90, 2.0),
		];
		const result = qualityFilterFeatures(features, 50);
		expect(result).toHaveLength(2);
		expect(result[0].quality).toBe(60);
		expect(result[1].quality).toBe(90);
	});
});

describe("prepareFeatures", () => {
	it("deduplicates and filters by quality", () => {
		const features = [
			makeFeature("a", 0, 30, 0.0),  // below quality
			makeFeature("b", 1, 80, 1.0),
			makeFeature("b", 2, 90, 2.0),  // duplicate of above
			makeFeature("c", 3, 70, 3.0),
		];
		const result = prepareFeatures(features, 50);
		expect(result).toHaveLength(2);
	});
});
