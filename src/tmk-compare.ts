import {FOURIER_COEFFS, TMK_PERIODS, type TmkDescriptor} from "./tmk";

export interface TmkCompareResult {
	level1: number;  // cosine similarity of pureAverage  [-1, 1]
	level2: number;  // full TMK temporal score            [ 0, 1]
}

// a[0] + 2·Σa[1..31] — normalises level-2 score to [0, 1]
const PAIR_SCORE_NORMALIZER = FOURIER_COEFFS[0] + 2 * Array.from(FOURIER_COEFFS.subarray(1)).reduce((s, v) => s + v, 0);

// Dot product of two 256-element slices at the given offsets
function dot256(a: Float32Array, aOff: number, b: Float32Array, bOff: number): number {
	let s = 0;
	for (let i = 0; i < 256; i++) {
		s += a[aOff + i] * b[bOff + i];
	}
	return s;
}

export default function compareTmk(a: TmkDescriptor, b: TmkDescriptor): TmkCompareResult {
	// Level 1: cosine similarity of the unweighted frame averages
	const dotAB = dot256(a.pureAverage, 0, b.pureAverage, 0);
	let normA = 0, normB = 0;
	for (let k = 0; k < 256; k++) {
		normA += a.pureAverage[k] * a.pureAverage[k];
		normB += b.pureAverage[k] * b.pureAverage[k];
	}
	const level1 = (normA > 0 && normB > 0) ? dotAB / Math.sqrt(normA * normB) : 0;

	// Pre-compute the four dot-product matrices (cc, ss, sc, cs) across all periods × harmonics
	const n = 4 * 32,
		cc = new Float32Array(n),
		ss = new Float32Array(n),
		sc = new Float32Array(n),
		cs = new Float32Array(n);

	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 32; j++) {
			const idx = i * 32 + j,
				off  = idx * 256;
			cc[idx] = dot256(a.cosFeatures, off, b.cosFeatures, off);
			ss[idx] = dot256(a.sinFeatures, off, b.sinFeatures, off);
			sc[idx] = dot256(a.sinFeatures, off, b.cosFeatures, off);
			cs[idx] = dot256(a.cosFeatures, off, b.sinFeatures, off);
		}
	}

	let maxk = -Infinity;

	// Level 2: find the time-shift delta that maximises the Fourier score across all periods
	for (let i = 0; i < 4; i++) {
		const t = TMK_PERIODS[i],
			cosStep = new Float32Array(32),
			sinStep  = new Float32Array(32);

		// Per-harmonic angle increments for stepping through one period
		for (let j = 1; j < 32; j++) {
			const step = (2 * Math.PI * j) / t;
			cosStep[j] = Math.cos(step);
			sinStep[j] = Math.sin(step);
		}

		const cosAng = new Float32Array(32).fill(1),
			sinAng   = new Float32Array(32);

		// Evaluate the score at each candidate shift delta and track the maximum
		for (let delta = 0; delta < t; delta++) {
			let k = cc[i * 32];
			for (let j = 1; j < 32; j++) {
				const idx = i * 32 + j;
				k += cosAng[j] * (cc[idx] + ss[idx]) + sinAng[j] * (sc[idx] - cs[idx]);
			}
			if (k > maxk) {
				maxk = k;
			}

			// Advance all harmonic angles by one step using rotation
			for (let j = 1; j < 32; j++) {
				const c = cosAng[j] * cosStep[j] - sinAng[j] * sinStep[j],
					s = cosAng[j] * sinStep[j] + sinAng[j] * cosStep[j];
				cosAng[j] = c;
				sinAng[j] = s;
			}
		}

		if (maxk < -Infinity) {
			maxk = 0;
		}
	}

	return {
		level1,
		level2: maxk / PAIR_SCORE_NORMALIZER,
	};
}
