import { test, expect } from "@playwright/test";

const HARNESS = "/tests/e2e/harness.html";
const ASSETS = "/tests/assets";

test.beforeEach(async ({ page }) => {
	await page.goto(HARNESS);
	await page.waitForFunction(() => (window as any).__ready === true);
});

test.describe("vPDQ video hashing", () => {
	test("hashes a real video and returns features", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const { hashVideoUrl } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			return features.map((f: any) => ({
				frameNumber: f.frameNumber,
				quality: f.quality,
				timeStamp: f.timeStamp,
				hex: f.pdqHash.toHexString(),
			}));
		}, `${ASSETS}/cat.mp4`);

		expect(result.length).toBeGreaterThan(0);
		for (const f of result) {
			expect(typeof f.frameNumber).toBe("number");
			expect(f.quality).toBeGreaterThanOrEqual(0);
			expect(f.quality).toBeLessThanOrEqual(100);
			expect(f.hex).toHaveLength(64);
			expect(f.timeStamp).toBeGreaterThanOrEqual(0);
		}
	});

	test("frame numbers are sequential", async ({ page }) => {
		const frameNumbers = await page.evaluate(async (src) => {
			const { hashVideoUrl } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			return features.map((f: any) => f.frameNumber);
		}, `${ASSETS}/cat.mp4`);

		for (let i = 0; i < frameNumbers.length; i++) {
			expect(frameNumbers[i]).toBe(i);
		}
	});

	test("timestamps increment by secondsPerHash", async ({ page }) => {
		const timestamps = await page.evaluate(async (src) => {
			const { hashVideoUrl } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 2.0 });
			return features.map((f: any) => f.timeStamp);
		}, `${ASSETS}/plane.mp4`);

		expect(timestamps.length).toBeGreaterThan(0);
		for (let i = 0; i < timestamps.length; i++) {
			expect(timestamps[i]).toBeCloseTo(i * 2.0, 1);
		}
	});

	test("produces deterministic hashes for the same video", async ({ page }) => {
		const [hashes1, hashes2] = await page.evaluate(async (src) => {
			const { hashVideoUrl } = (window as any).__vpdq;
			const f1 = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			const f2 = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			return [
				f1.map((f: any) => f.pdqHash.toHexString()),
				f2.map((f: any) => f.pdqHash.toHexString()),
			];
		}, `${ASSETS}/cat.mp4`);

		expect(hashes1).toEqual(hashes2);
	});

	test("different videos produce different hashes", async ({ page }) => {
		const [catHashes, planeHashes] = await page.evaluate(async (assets) => {
			const { hashVideoUrl } = (window as any).__vpdq;
			const cat = await hashVideoUrl(`${assets}/cat.mp4`, { secondsPerHash: 1.0 });
			const plane = await hashVideoUrl(`${assets}/plane.mp4`, { secondsPerHash: 1.0 });
			return [
				cat.map((f: any) => f.pdqHash.toHexString()),
				plane.map((f: any) => f.pdqHash.toHexString()),
			];
		}, ASSETS);

		// at least the first frame should differ
		expect(catHashes[0]).not.toBe(planeHashes[0]);
	});

	test("pruneFrames reduces identical consecutive frames", async ({ page }) => {
		const [totalFrames, prunedFrames] = await page.evaluate(async (src) => {
			const { hashVideoUrl, pruneFrames } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 0.5 });
			const pruned = pruneFrames(features, 10);
			return [features.length, pruned.length];
		}, `${ASSETS}/cat.mp4`);

		expect(totalFrames).toBeGreaterThan(0);
		expect(prunedFrames).toBeLessThanOrEqual(totalFrames);
		expect(prunedFrames).toBeGreaterThan(0);
	});

	test("pruneDistance option skips similar frames during hashing", async ({ page }) => {
		const [allFrames, prunedFrames] = await page.evaluate(async (src) => {
			const { hashVideoUrl } = (window as any).__vpdq;
			const all = await hashVideoUrl(src, { secondsPerHash: 0.5 });
			const pruned = await hashVideoUrl(src, { secondsPerHash: 0.5, pruneDistance: 10 });
			return [all.length, pruned.length];
		}, `${ASSETS}/cat.mp4`);

		expect(allFrames).toBeGreaterThan(0);
		expect(prunedFrames).toBeLessThanOrEqual(allFrames);
		expect(prunedFrames).toBeGreaterThan(0);
	});
});

test.describe("vPDQ video matching", () => {
	test("same video matches itself at 100%", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const { hashVideoUrl, matchTwoHashBrute } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			const match = matchTwoHashBrute(features, features, 31, 50);
			return {
				queryMatchPercent: match.queryMatchPercent,
				comparedMatchPercent: match.comparedMatchPercent,
			};
		}, `${ASSETS}/cat.mp4`);

		expect(result.queryMatchPercent).toBe(100);
		expect(result.comparedMatchPercent).toBe(100);
	});

	test("different videos have low match percentage", async ({ page }) => {
		const result = await page.evaluate(async (assets) => {
			const { hashVideoUrl, matchTwoHashBrute } = (window as any).__vpdq;
			const cat = await hashVideoUrl(`${assets}/cat.mp4`, { secondsPerHash: 1.0 });
			const plane = await hashVideoUrl(`${assets}/plane.mp4`, { secondsPerHash: 1.0 });
			const match = matchTwoHashBrute(cat, plane, 31, 50);
			return {
				queryMatchPercent: match.queryMatchPercent,
				comparedMatchPercent: match.comparedMatchPercent,
			};
		}, ASSETS);

		expect(result.queryMatchPercent).toBeLessThan(50);
		expect(result.comparedMatchPercent).toBeLessThan(50);
	});

	test("isMatch returns false for different videos", async ({ page }) => {
		const matched = await page.evaluate(async (assets) => {
			const { hashVideoUrl, isMatch } = (window as any).__vpdq;
			const cat = await hashVideoUrl(`${assets}/cat.mp4`, { secondsPerHash: 1.0 });
			const plane = await hashVideoUrl(`${assets}/plane.mp4`, { secondsPerHash: 1.0 });
			return isMatch(cat, plane).isMatch;
		}, ASSETS);

		expect(matched).toBe(false);
	});

	test("isMatch returns true for same video", async ({ page }) => {
		const matched = await page.evaluate(async (src) => {
			const { hashVideoUrl, isMatch } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			return isMatch(features, features).isMatch;
		}, `${ASSETS}/friends.mp4`);

		expect(matched).toBe(true);
	});
});

test.describe("vPDQ serialization with real data", () => {
	test("C++ format roundtrip preserves video hashes", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const { hashVideoUrl, featuresToCppFormat, featuresFromCppFormat } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			const text = featuresToCppFormat(features);
			const loaded = featuresFromCppFormat(text);
			return {
				originalCount: features.length,
				loadedCount: loaded.length,
				hashesMatch: features.every((f: any, i: number) =>
					f.pdqHash.toHexString() === loaded[i].pdqHash.toHexString()
				),
				qualitiesMatch: features.every((f: any, i: number) =>
					f.quality === loaded[i].quality
				),
			};
		}, `${ASSETS}/cat.mp4`);

		expect(result.loadedCount).toBe(result.originalCount);
		expect(result.hashesMatch).toBe(true);
		expect(result.qualitiesMatch).toBe(true);
	});

	test("JSON format roundtrip preserves video hashes", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const { hashVideoUrl, featuresToJson, featuresFromJson } = (window as any).__vpdq;
			const features = await hashVideoUrl(src, { secondsPerHash: 1.0 });
			const json = featuresToJson(features);
			const loaded = featuresFromJson(json);
			return {
				originalCount: features.length,
				loadedCount: loaded.length,
				hashesMatch: features.every((f: any, i: number) =>
					f.pdqHash.toHexString() === loaded[i].pdqHash.toHexString()
				),
			};
		}, `${ASSETS}/plane.mp4`);

		expect(result.loadedCount).toBe(result.originalCount);
		expect(result.hashesMatch).toBe(true);
	});
});
