export interface TmkDescriptor {
	pureAverage: Float32Array;  // 256
	cosFeatures: Float32Array;  // 4 × 32 × 256, flat row-major
	sinFeatures: Float32Array;  // 4 × 32 × 256
	frameCount: number;
}


// Exact Poullot/Bessel coefficients — ThreatExchange tmk/cpp/algo/tmkfv.cpp lines 333-344
export const FOURIER_COEFFS = new Float32Array([
	0.0708041893112,   0.13937789309,    0.132897260304,   0.122765735552,
	0.109878684888,    0.09529606433,    0.0800986647852,  0.0652590650356,
	0.0515478238322,   0.0394851531195,  0.0293374252025,  0.0211492623679,
	0.0147973073245,   0.0100512818746,  0.0066306408014,  0.00424947117334,
	0.0026467615764,   0.00160270959695, 0.000943882629639,0.000540841638603,
	0.000301633183798, 0.000163800158855,8.66454753015e-5, 4.46626303151e-5,
	2.24429442235e-5,  1.09982139799e-5, 5.25823487999e-6, 2.45358229988e-6,
	1.11781474895e-6,  4.97406489221e-7, 2.16265487234e-7, 9.19087006565e-8,
]);

export const TMK_PERIODS = [2731, 4391, 9767, 14653] as const;

// Normalise a 256-element slice of arr to unit length in-place
function l2norm(arr: Float32Array, offset: number): void {
	let lenSq = 0;
	for (let k = 0; k < 256; k++) {
		lenSq += arr[offset + k] * arr[offset + k];
	}
	if (lenSq > 0) {
		const invLen = 1 / Math.sqrt(lenSq);
		for (let k = 0; k < 256; k++) {
			arr[offset + k] *= invLen;
		}
	}
}

export default class tmk {
	pureAverage = new Float32Array(256);
	cosFeatures = new Float32Array(4 * 32 * 256);
	sinFeatures = new Float32Array(4 * 32 * 256);
	frameCount  = 0;

	addFrame(rawDct: Float32Array, t: number): void {
		// L2-normalise raw DCT inline — TMK accumulates unit-length feature vectors
		let lenSq = 0;
		for (let k = 0; k < 256; k++) {
			lenSq += rawDct[k] * rawDct[k];
		}
		const invLen = lenSq > 0 ? 1 / Math.sqrt(lenSq) : 0;

		// Accumulate into the unweighted average — raw DCT, not L2-normalised
		for (let k = 0; k < 256; k++) {
			this.pureAverage[k] += rawDct[k];
		}

		// Accumulate Fourier features for each of the 4 periods
		for (let i = 0; i < 4; i++) {
			const T = TMK_PERIODS[i],
				base0 = i * 32 * 256;

			// j=0 harmonic is the unweighted frame sum (cos(0)=1, sin(0)=0)
			for (let k = 0; k < 256; k++) {
				this.cosFeatures[base0 + k] += rawDct[k] * invLen;
			}

			// Chebyshev recurrence — 2 trig calls per period instead of 62
			const theta = (2 * Math.PI * t) / T,
				cosT = Math.cos(theta),
				sinT = Math.sin(theta);
			let cosPrev = 1, sinPrev = 0,
				cosJ   = cosT, sinJ   = sinT;
			for (let j = 1; j < 32; j++) {
				const baseJ = (i * 32 + j) * 256;
				for (let k = 0; k < 256; k++) {
					this.cosFeatures[baseJ + k] += rawDct[k] * invLen * cosJ;
					this.sinFeatures[baseJ + k] += rawDct[k] * invLen * sinJ;
				}
				// Advance cos/sin angle by one step using the recurrence
				const cosNext = 2 * cosT * cosJ - cosPrev,
					sinNext   = 2 * cosT * sinJ - sinPrev;
				cosPrev = cosJ;  sinPrev = sinJ;
				cosJ    = cosNext; sinJ  = sinNext;
			}
		}

		this.frameCount++;
	}

	static merge(partials: Array<{pureAverage: Float32Array; cosFeatures: Float32Array; sinFeatures: Float32Array; frameCount: number}>): tmk {
		const out = new tmk();
		for (const p of partials) {
			for (let k = 0; k < 256; k++) {
				out.pureAverage[k] += p.pureAverage[k];
			}
			for (let k = 0; k < 4 * 32 * 256; k++) {
				out.cosFeatures[k] += p.cosFeatures[k];
				out.sinFeatures[k] += p.sinFeatures[k];
			}
			out.frameCount += p.frameCount;
		}
		return out;
	}

	compile(): TmkDescriptor {
		// Average the pure-average vector across all frames
		const invN = 1 / this.frameCount;
		for (let k = 0; k < 256; k++) {
			this.pureAverage[k] *= invN;
		}

		// L2-normalise each feature slice then apply the Fourier coefficient scale
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 32; j++) {
				const offset = (i * 32 + j) * 256,
					scale  = Math.sqrt(FOURIER_COEFFS[j]);
				l2norm(this.cosFeatures, offset);
				for (let k = 0; k < 256; k++) {
					this.cosFeatures[offset + k] *= scale;
				}
				if (j > 0) {
					l2norm(this.sinFeatures, offset);
					for (let k = 0; k < 256; k++) {
						this.sinFeatures[offset + k] *= scale;
					}
				}
			}
		}

		return this;
	}
}
