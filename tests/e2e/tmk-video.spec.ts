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

	test("pureAverage values are finite raw DCT floats", async ({ page }) => {
		const { min, max } = await page.evaluate(async (src) => {
			const buf  = await fetch(src).then(r => r.arrayBuffer()),
				d    = (await (window as any).__video(buf, {vpdq: false})).tmk,
				vals = Array.from(d.pureAverage) as number[];
			return {min: Math.min(...vals), max: Math.max(...vals)};
		}, `${ASSETS}/doorknob-hd-no-bar.mp4`);

		expect(isFinite(min)).toBe(true);
		expect(isFinite(max)).toBe(true);
		expect(min).toBeLessThan(0);
		expect(max).toBeGreaterThan(0);
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
// C++ reference comparison
// ---------------------------------------------------------------------------

test.describe("TMK C++ reference comparison", () => {
	test("descriptor matches C++ reference within match threshold", async ({ page }) => {
		const { level1, level2 } = await page.evaluate(async ([src, ref]) => {
			const [buf, refBuf] = await Promise.all([
				fetch(src).then(r => r.arrayBuffer()),
				fetch(ref).then(r => r.arrayBuffer()),
			]),
				ours = (await (window as any).__video(buf, {vpdq: false})).tmk;

			// Parse binary .tmk format: 32-byte header, then periods, Fourier coeffs, pureAverage, cos/sin features
			const view = new DataView(refBuf),
				P    = view.getInt32(16, true),
				M    = view.getInt32(20, true),
				D    = view.getInt32(24, true);

			let offset = 32 + P * 4 + M * 4; // skip header, periods, Fourier coefficients
			const pureAverage  = new Float32Array(refBuf, offset, D);
			offset += D * 4;
			const cosFeatures  = new Float32Array(refBuf, offset, P * M * D);
			offset += P * M * D * 4;
			const sinFeatures  = new Float32Array(refBuf, offset, P * M * D);

			const reference = {pureAverage, cosFeatures, sinFeatures, frameCount: 0},
				cmp = (window as any).__compareTmk(ours, reference);
			return {level1: cmp.level1, level2: cmp.level2};
		}, [`${ASSETS}/doorknob-hd-no-bar.mp4`, `${ASSETS}/doorknob-hd-no-bar.tmk`]);

		console.log(`TMK vs C++ reference: level1=${level1.toFixed(4)}  level2=${level2.toFixed(4)}`);
		expect(level1).toBeGreaterThanOrEqual(0.9);
		expect(level2).toBeGreaterThanOrEqual(0.7);
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
