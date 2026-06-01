import { describe, it, expect } from "vitest";
import { type TmkDescriptor } from "../src/tmk";
import compareTmk from "../src/tmk-compare";

// Fourier coefficients duplicated here to verify level-2 score bounds without importing internals
const FOURIER_COEFFS = new Float32Array([
	0.0708041893112,   0.13937789309,    0.132897260304,   0.122765735552,
	0.109878684888,    0.09529606433,    0.0800986647852,  0.0652590650356,
	0.0515478238322,   0.0394851531195,  0.0293374252025,  0.0211492623679,
	0.0147973073245,   0.0100512818746,  0.0066306408014,  0.00424947117334,
	0.0026467615764,   0.00160270959695, 0.000943882629639,0.000540841638603,
	0.000301633183798, 0.000163800158855,8.66454753015e-5, 4.46626303151e-5,
	2.24429442235e-5,  1.09982139799e-5, 5.25823487999e-6, 2.45358229988e-6,
	1.11781474895e-6,  4.97406489221e-7, 2.16265487234e-7, 9.19087006565e-8,
]);

function makeDescriptor(overrides?: Partial<TmkDescriptor>): TmkDescriptor {
	return {
		pureAverage: new Float32Array(256),
		cosFeatures: new Float32Array(4 * 32 * 256),
		sinFeatures: new Float32Array(4 * 32 * 256),
		frameCount: 0,
		...overrides,
	};
}

// Build a descriptor whose feature slices are exactly L2-normalised and Fourier-scaled,
// so self-comparison yields level2 = 1.0 analytically.
function makeIdealDescriptor(): TmkDescriptor {
	const cos = new Float32Array(4 * 32 * 256),
		sin = new Float32Array(4 * 32 * 256),
		invSqrt256 = 1 / Math.sqrt(256);
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 32; j++) {
			const scale = Math.sqrt(FOURIER_COEFFS[j]) * invSqrt256,
				base  = (i * 32 + j) * 256;
			for (let k = 0; k < 256; k++) {
				cos[base + k] = scale;
				if (j > 0) sin[base + k] = scale;
			}
		}
	}
	const avg = new Float32Array(256).fill(invSqrt256);
	return makeDescriptor({pureAverage: avg, cosFeatures: cos, sinFeatures: sin, frameCount: 1});
}

describe("tmk.compare", () => {
	describe("result shape", () => {
		it("returns an object with level1 and level2 number properties", () => {
			const d = makeDescriptor(),
				result = compareTmk(d, d);
			expect(result).toHaveProperty("level1");
			expect(result).toHaveProperty("level2");
			expect(typeof result.level1).toBe("number");
			expect(typeof result.level2).toBe("number");
		});
	});

	describe("level1 — cosine similarity of pureAverage", () => {
		it("returns 0 for zero pureAverage on both sides", () => {
			const d = makeDescriptor();
			expect(compareTmk(d, d).level1).toBe(0);
		});

		it("returns 0 when one side has zero pureAverage", () => {
			const d1 = makeDescriptor({pureAverage: new Float32Array(256).fill(1)}),
				d2 = makeDescriptor();
			expect(compareTmk(d1, d2).level1).toBe(0);
		});

		it("returns 1 for self-comparison with a non-zero pureAverage", () => {
			const avg = Float32Array.from({length: 256}, (_, i) => Math.sin(i * 0.3));
			expect(compareTmk(makeDescriptor({pureAverage: avg}), makeDescriptor({pureAverage: avg})).level1)
				.toBeCloseTo(1.0, 10);
		});

		it("returns -1 for negated pureAverage vectors", () => {
			const pos = new Float32Array(256).fill(1),
				neg = new Float32Array(256).fill(-1);
			expect(compareTmk(makeDescriptor({pureAverage: pos}), makeDescriptor({pureAverage: neg})).level1)
				.toBeCloseTo(-1.0, 10);
		});

		it("returns a value in [-1, 1] for arbitrary vectors", () => {
			const avg1 = Float32Array.from({length: 256}, (_, i) => Math.sin(i * 0.1)),
				avg2 = Float32Array.from({length: 256}, (_, i) => Math.cos(i * 0.3));
			const {level1} = compareTmk(makeDescriptor({pureAverage: avg1}), makeDescriptor({pureAverage: avg2}));
			expect(level1).toBeGreaterThanOrEqual(-1.0);
			expect(level1).toBeLessThanOrEqual(1.0);
		});

		it("is commutative: compare(a,b).level1 === compare(b,a).level1", () => {
			const avg1 = Float32Array.from({length: 256}, (_, i) => Math.sin(i * 0.2)),
				avg2 = Float32Array.from({length: 256}, (_, i) => Math.cos(i * 0.5));
			const d1 = makeDescriptor({pureAverage: avg1}),
				d2 = makeDescriptor({pureAverage: avg2});
			expect(compareTmk(d1, d2).level1).toBeCloseTo(compareTmk(d2, d1).level1, 10);
		});

		it("self-comparison level1 >= cross-comparison level1", () => {
			const avg1 = Float32Array.from({length: 256}, (_, i) => Math.sin(i * 0.5)),
				avg2 = Float32Array.from({length: 256}, (_, i) => Math.cos(i * 0.7));
			const d1 = makeDescriptor({pureAverage: avg1}),
				d2 = makeDescriptor({pureAverage: avg2});
			expect(compareTmk(d1, d1).level1).toBeGreaterThanOrEqual(compareTmk(d1, d2).level1);
		});

		it("uniform pureAverage gives level1 = 1 for self-comparison", () => {
			const avg = new Float32Array(256).fill(0.5);
			expect(compareTmk(makeDescriptor({pureAverage: avg}), makeDescriptor({pureAverage: avg})).level1)
				.toBeCloseTo(1.0, 10);
		});
	});

	describe("level2 — TMK temporal score", () => {
		it("returns 0 for all-zero descriptors", () => {
			expect(compareTmk(makeDescriptor(), makeDescriptor()).level2).toBe(0);
		});

		it("returns positive level2 for self-comparison with non-zero cosFeatures", () => {
			const cos = new Float32Array(4 * 32 * 256),
				scale = 1 / Math.sqrt(256);
			// Fill the j=0 slice for all 4 periods with a unit vector
			for (let i = 0; i < 4; i++) {
				for (let k = 0; k < 256; k++) cos[i * 32 * 256 + k] = scale;
			}
			const d = makeDescriptor({cosFeatures: cos});
			expect(compareTmk(d, d).level2).toBeGreaterThan(0);
		});

		it("returns level2 ≈ 1.0 for an ideally-scaled self-comparison", () => {
			const d = makeIdealDescriptor();
			expect(compareTmk(d, d).level2).toBeCloseTo(1.0, 2);
		});

		it("level2 is within 0.01 of 1.0 for an ideally-scaled self-comparison", () => {
			// Float32 accumulation can push the score fractionally above 1.0; it is not clamped.
			const d = makeIdealDescriptor();
			expect(Math.abs(compareTmk(d, d).level2 - 1.0)).toBeLessThan(0.01);
		});

		it("level2 = 0 when cosFeatures are zero even if pureAverage is non-zero", () => {
			const avg = new Float32Array(256).fill(1);
			const d = makeDescriptor({pureAverage: avg});
			expect(compareTmk(d, d).level2).toBe(0);
		});
	});

	describe("match threshold behaviour", () => {
		it("identical ideal descriptors score above the 0.7 match threshold on both levels", () => {
			const d = makeIdealDescriptor();
			const {level1, level2} = compareTmk(d, d);
			expect(level1).toBeGreaterThanOrEqual(0.7);
			expect(level2).toBeGreaterThanOrEqual(0.7);
		});

		it("zero descriptors score below the 0.7 match threshold on both levels", () => {
			const d = makeDescriptor();
			const {level1, level2} = compareTmk(d, d);
			expect(level1).toBeLessThan(0.7);
			expect(level2).toBeLessThan(0.7);
		});
	});
});
