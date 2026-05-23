import { test, expect } from "@playwright/test";

const HARNESS = "/tests/e2e/harness.html";
const ASSETS  = "/tests/assets";

test.beforeEach(async ({ page }) => {
	await page.goto(HARNESS);
	await page.waitForFunction(() => (window as any).__ready === true);
});

// ---------------------------------------------------------------------------
// Basic structure
// ---------------------------------------------------------------------------

test.describe("vPDQ basic structure", () => {
	test("returns features with valid fields", async ({ page }) => {
		const features = await page.evaluate(async (src) => {
			const buf    = await fetch(src).then(r => r.arrayBuffer()),
				result = await (window as any).__video(buf, {tmk: false});
			return result.vpdq.map((f: any) => ({
				frameNumber: f.frameNumber,
				quality:     f.quality,
				hex:         f.hex,
				timeStamp:   f.timeStamp,
			}));
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(features.length).toBeGreaterThan(0);
		for (const f of features) {
			expect(typeof f.frameNumber).toBe("number");
			expect(f.quality).toBeGreaterThanOrEqual(0);
			expect(f.quality).toBeLessThanOrEqual(100);
			expect(f.hex).toMatch(/^[0-9a-f]{64}$/);
			expect(f.timeStamp).toBeGreaterThanOrEqual(0);
		}
	});

	test("produces deterministic hashes for the same video", async ({ page }) => {
		const [hashes1, hashes2] = await page.evaluate(async (src) => {
			const buf = await fetch(src).then(r => r.arrayBuffer()),
				r1  = await (window as any).__video(buf.slice(0), {tmk: false}),
				r2  = await (window as any).__video(buf.slice(0), {tmk: false});
			return [
				r1.vpdq.map((f: any) => f.hex),
				r2.vpdq.map((f: any) => f.hex),
			];
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(hashes1).toEqual(hashes2);
	});
});

// ---------------------------------------------------------------------------
// C++ reference comparison
// ---------------------------------------------------------------------------

test.describe("vPDQ C++ reference comparison", () => {
	test("feature count matches reference at 30 fps", async ({ page }) => {
		const { featureCount, refCount } = await page.evaluate(async ([src, ref]) => {
			const [buf, refText] = await Promise.all([
				fetch(src).then(r => r.arrayBuffer()),
				fetch(ref).then(r => r.text()),
			]),
				result   = await (window as any).__video(buf, {
					tmk:  false,
					fps:  30,
					vpdq: {fps: 30, qualityTolerance: 0},
				}),
				refLines = refText.trim().split("\n").filter((l: string) => l).length;
			return {featureCount: result.vpdq.length, refCount: refLines};
		}, [`${ASSETS}/doorknob-hd-no-bar.mp4`, `${ASSETS}/doorknob-hd-no-bar.txt`]);

		console.log(`Feature count: ours=${featureCount}  reference=${refCount}`);
		expect(featureCount).toBe(refCount);
	});

	test("high-quality frame hashes are within 20 bits of C++ reference", async ({ page }) => {
		const distances = await page.evaluate(async ([src, ref]) => {
			function hammingDistance(h1: string, h2: string) {
				let dist = 0;
				for (let i = 0; i < 64; i += 4) {
					let x = parseInt(h1.slice(i, i + 4), 16) ^ parseInt(h2.slice(i, i + 4), 16);
					while (x) { dist += x & 1; x >>>= 1; }
				}
				return dist;
			}

			const [buf, refText] = await Promise.all([
				fetch(src).then(r => r.arrayBuffer()),
				fetch(ref).then(r => r.text()),
			]),
				result      = await (window as any).__video(buf, {
					tmk:  false,
					fps:  30,
					vpdq: {fps: 30, qualityTolerance: 0},
				}),
				refFeatures = refText.trim().split("\n").filter((l: string) => l).map((line: string) => {
					const [, q, hash] = line.split(",");
					return {quality: parseInt(q), hash: hash.trim()};
				});

			return result.vpdq.map((f: any, i: number) => {
				const r = refFeatures[i];
				return r ? {quality: r.quality, dist: hammingDistance(f.hex, r.hash)} : null;
			}).filter((x: any) => x && x.quality >= 50).map((x: any) => x.dist);
		}, [`${ASSETS}/doorknob-hd-no-bar.mp4`, `${ASSETS}/doorknob-hd-no-bar.txt`]);

		expect(distances.length).toBeGreaterThan(0);
		const avg = (distances as number[]).reduce((a, b) => a + b, 0) / distances.length,
			max = Math.max(...distances as number[]);
		console.log(`Hamming distances (quality ≥ 50): avg=${avg.toFixed(1)}  max=${max}  frames=${distances.length}`);
		expect(max).toBeLessThanOrEqual(20);
	});
});

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

test.describe("vPDQ matching", () => {
	test("self-comparison returns 100% on both sides", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const buf   = await fetch(src).then(r => r.arrayBuffer()),
				{vpdq} = await (window as any).__video(buf, {tmk: false}),
				match  = (window as any).__compareVpdq(vpdq, vpdq);
			return {q: match.queryMatchPercent, c: match.comparedMatchPercent};
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(result.q).toBe(100);
		expect(result.c).toBe(100);
	});

	test("different videos have low match percentage", async ({ page }) => {
		const result = await page.evaluate(async ([a, b]) => {
			const [bufA, bufB] = await Promise.all([
				fetch(a).then(r => r.arrayBuffer()),
				fetch(b).then(r => r.arrayBuffer()),
			]),
				[rA, rB] = await Promise.all([
					(window as any).__video(bufA, {tmk: false}),
					(window as any).__video(bufB, {tmk: false}),
				]),
				match = (window as any).__compareVpdq(rA.vpdq, rB.vpdq);
			return {q: match.queryMatchPercent, c: match.comparedMatchPercent};
		}, [`${ASSETS}/doorknob-hd-no-bar.mp4`, `${ASSETS}/chair-19-sd-bar.mp4`]);

		expect(result.q).toBeLessThan(50);
		expect(result.c).toBeLessThan(50);
	});

	test("isMatch returns true for same video", async ({ page }) => {
		const matched = await page.evaluate(async (src) => {
			const buf   = await fetch(src).then(r => r.arrayBuffer()),
				{vpdq} = await (window as any).__video(buf, {tmk: false});
			return (window as any).__isMatchVpdq(vpdq, vpdq).isMatch;
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(matched).toBe(true);
	});

	test("isMatch returns false for different videos", async ({ page }) => {
		const matched = await page.evaluate(async ([a, b]) => {
			const [bufA, bufB] = await Promise.all([
				fetch(a).then(r => r.arrayBuffer()),
				fetch(b).then(r => r.arrayBuffer()),
			]),
				[rA, rB] = await Promise.all([
					(window as any).__video(bufA, {tmk: false}),
					(window as any).__video(bufB, {tmk: false}),
				]);
			return (window as any).__isMatchVpdq(rA.vpdq, rB.vpdq).isMatch;
		}, [`${ASSETS}/doorknob-hd-no-bar.mp4`, `${ASSETS}/chair-19-sd-bar.mp4`]);

		expect(matched).toBe(false);
	});
});
