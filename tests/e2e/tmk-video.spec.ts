import { test, expect } from "@playwright/test";

const HARNESS = "/tests/e2e/tmk-harness.html";
const ASSETS  = "/tests/assets";

test.beforeEach(async ({ page }) => {
	await page.goto(HARNESS);
	await page.waitForFunction(() => (window as any).__ready === true);
});

// ---------------------------------------------------------------------------
// Descriptor structure
// ---------------------------------------------------------------------------

test.describe("TMK descriptor structure", () => {
	test("returns correct array lengths and a positive frameCount", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const buf = await fetch(src).then(r => r.arrayBuffer()),
				d   = (await (window as any).__video(buf, {vpdq: false})).tmk;
			return {
				frameCount:        d.frameCount,
				pureAverageLength: d.pureAverage.length,
				cosFeaturesLength: d.cosFeatures.length,
				sinFeaturesLength: d.sinFeatures.length,
			};
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(result.frameCount).toBeGreaterThan(0);
		expect(result.pureAverageLength).toBe(256);
		expect(result.cosFeaturesLength).toBe(4 * 32 * 256);
		expect(result.sinFeaturesLength).toBe(4 * 32 * 256);
	});

	test("pureAverage values are in [-1, 1]", async ({ page }) => {
		const { min, max } = await page.evaluate(async (src) => {
			const buf  = await fetch(src).then(r => r.arrayBuffer()),
				d    = (await (window as any).__video(buf, {vpdq: false})).tmk,
				vals = Array.from(d.pureAverage) as number[];
			return {min: Math.min(...vals), max: Math.max(...vals)};
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(min).toBeGreaterThanOrEqual(-1.0);
		expect(max).toBeLessThanOrEqual(1.0);
	});
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test.describe("TMK determinism", () => {
	test("hashing the same video twice produces identical pureAverage", async ({ page }) => {
		const [avg1, avg2] = await page.evaluate(async (src) => {
			const buf     = await fetch(src).then(r => r.arrayBuffer()),
				[r1, r2] = await Promise.all([
					(window as any).__video(buf.slice(0), {vpdq: false}),
					(window as any).__video(buf.slice(0), {vpdq: false}),
				]);
			return [Array.from(r1.tmk.pureAverage), Array.from(r2.tmk.pureAverage)];
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(avg1).toEqual(avg2);
	});
});

// ---------------------------------------------------------------------------
// Self-similarity
// ---------------------------------------------------------------------------

test.describe("TMK self-similarity", () => {
	test("self-comparison gives level1 ≈ 1 and level2 ≈ 1", async ({ page }) => {
		const { level1, level2 } = await page.evaluate(async (src) => {
			const buf    = await fetch(src).then(r => r.arrayBuffer()),
				result = (await (window as any).__video(buf, {vpdq: false})).tmk,
				cmp    = (window as any).__compareTmk(result, result);
			return {level1: cmp.level1, level2: cmp.level2};
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		console.log(`TMK self: level1=${level1.toFixed(4)}  level2=${level2.toFixed(4)}`);
		expect(level1).toBeCloseTo(1.0, 3);
		expect(level2).toBeCloseTo(1.0, 2);
	});
});

// ---------------------------------------------------------------------------
// Cross-video comparison
// ---------------------------------------------------------------------------

test.describe("TMK cross-video comparison", () => {
	test("similar videos (chair-19 vs chair-20) score ≥ 0.7 on both levels", async ({ page }) => {
		const { level1, level2 } = await page.evaluate(async ([a, b]) => {
			const [bufA, bufB] = await Promise.all([
				fetch(a).then(r => r.arrayBuffer()),
				fetch(b).then(r => r.arrayBuffer()),
			]),
				[rA, rB] = await Promise.all([
					(window as any).__video(bufA, {vpdq: false}),
					(window as any).__video(bufB, {vpdq: false}),
				]),
				cmp = (window as any).__compareTmk(rA.tmk, rB.tmk);
			return {level1: cmp.level1, level2: cmp.level2};
		}, [`${ASSETS}/chair-19-sd-bar.mp4`, `${ASSETS}/chair-20-sd-bar.mp4`]);

		console.log(`chair-19 vs chair-20: level1=${level1.toFixed(4)}  level2=${level2.toFixed(4)}`);
		expect(level1).toBeGreaterThanOrEqual(0.7);
		expect(level2).toBeGreaterThanOrEqual(0.7);
	});

	test("different scenes (chair vs doorknob) score below 0.7 on level1", async ({ page }) => {
		const { level1, level2 } = await page.evaluate(async ([a, b]) => {
			const [bufA, bufB] = await Promise.all([
				fetch(a).then(r => r.arrayBuffer()),
				fetch(b).then(r => r.arrayBuffer()),
			]),
				[rA, rB] = await Promise.all([
					(window as any).__video(bufA, {vpdq: false}),
					(window as any).__video(bufB, {vpdq: false}),
				]),
				cmp = (window as any).__compareTmk(rA.tmk, rB.tmk);
			return {level1: cmp.level1, level2: cmp.level2};
		}, [`${ASSETS}/chair-19-sd-bar.mp4`, `${ASSETS}/doorknob-hd-no-bar.mp4`]);

		console.log(`chair-19 vs doorknob: level1=${level1.toFixed(4)}  level2=${level2.toFixed(4)}`);
		expect(level1).toBeLessThan(0.7);
	});
});
