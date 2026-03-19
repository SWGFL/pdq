import { describe, it, expect } from "vitest";
import { hashFrames, pruneFrames } from "../../src/vpdq/vpdqHasher";
import { VpdqFeature } from "../../src/vpdq/vpdqTypes";
import { Hash256 } from "../../src/vpdq/hash256";
import { makeUniformRGBA, makeGradientRGBA } from "../helpers";
import type { FrameData } from "../../src/vpdq/vpdqHasher";

describe("hashFrames", () => {
	it("returns VpdqFeature array", () => {
		const frames: FrameData[] = [
			{ data: makeGradientRGBA(64, 64), width: 64, height: 64, timestamp: 0.0 },
		];
		const features = hashFrames(frames);
		expect(features).toHaveLength(1);
		expect(features[0]).toBeInstanceOf(VpdqFeature);
		expect(features[0].pdqHash).toBeInstanceOf(Hash256);
	});

	it("assigns sequential frame numbers", () => {
		const frames: FrameData[] = [
			{ data: makeGradientRGBA(64, 64), width: 64, height: 64, timestamp: 0.0 },
			{ data: makeGradientRGBA(64, 64), width: 64, height: 64, timestamp: 1.0 },
			{ data: makeGradientRGBA(64, 64), width: 64, height: 64, timestamp: 2.0 },
		];
		const features = hashFrames(frames);
		expect(features[0].frameNumber).toBe(0);
		expect(features[1].frameNumber).toBe(1);
		expect(features[2].frameNumber).toBe(2);
	});

	it("passes through timestamps", () => {
		const frames: FrameData[] = [
			{ data: makeGradientRGBA(64, 64), width: 64, height: 64, timestamp: 1.5 },
			{ data: makeGradientRGBA(64, 64), width: 64, height: 64, timestamp: 3.0 },
		];
		const features = hashFrames(frames);
		expect(features[0].timeStamp).toBe(1.5);
		expect(features[1].timeStamp).toBe(3.0);
	});

	it("returns empty array for empty input", () => {
		expect(hashFrames([])).toEqual([]);
	});
});

describe("pruneFrames", () => {
	it("always keeps the first frame", () => {
		const hash = Hash256.fromHexString("a".repeat(64));
		const features = [new VpdqFeature(hash, 0, 80, 0.0)];
		const result = pruneFrames(features, 10);
		expect(result).toHaveLength(1);
	});

	it("prunes identical consecutive frames", () => {
		const hash = Hash256.fromHexString("a".repeat(64));
		const features = [
			new VpdqFeature(hash.clone(), 0, 80, 0.0),
			new VpdqFeature(hash.clone(), 1, 80, 1.0),
			new VpdqFeature(hash.clone(), 2, 80, 2.0),
		];
		const result = pruneFrames(features, 10);
		expect(result).toHaveLength(1); // all identical, only first kept
	});

	it("keeps frames with large Hamming distance", () => {
		const a = Hash256.fromHexString("0".repeat(64));
		const b = Hash256.fromHexString("f".repeat(64));
		const features = [
			new VpdqFeature(a, 0, 80, 0.0),
			new VpdqFeature(b, 1, 80, 1.0),
		];
		const result = pruneFrames(features, 10);
		expect(result).toHaveLength(2);
	});

	it("returns empty for empty input", () => {
		expect(pruneFrames([], 10)).toEqual([]);
	});
});
