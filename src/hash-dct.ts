/**
 * Hashing functions for perceptual hashing.
 * Converts DCT coefficients to a 256-bit hash using median thresholding.
 */
import { Hash256 } from "./hash256";

/**
 * Torben's O(n) median finder — does not modify the input array.
 */
function torben(m: Float32Array | Float64Array | number[], n: number): number {
	let min = m[0];
	let max = m[0];
	for (let i = 1; i < n; i++) {
		if (m[i] < min) min = m[i];
		if (m[i] > max) max = m[i];
	}

	while (true) {
		const guess = (min + max) / 2;
		let less = 0;
		let greater = 0;
		let equal = 0;
		let maxltguess = min;
		let mingtguess = max;

		for (let i = 0; i < n; i++) {
			if (m[i] < guess) {
				less++;
				if (m[i] > maxltguess) maxltguess = m[i];
			} else if (m[i] > guess) {
				greater++;
				if (m[i] < mingtguess) mingtguess = m[i];
			} else {
				equal++;
			}
		}

		if (less <= (n + 1) / 2 && greater <= (n + 1) / 2) {
			if (less >= (n + 1) / 2) return maxltguess;
			if (less + equal >= (n + 1) / 2) return guess;
			return mingtguess;
		} else if (less > greater) {
			max = maxltguess;
		} else {
			min = mingtguess;
		}
	}
}

/**
 * Convert DCT coefficients to a 256-bit Hash256 by thresholding at the median.
 */
function pdqBuffer16x16ToBits(dctOutput16x16: Float64Array): Hash256 {
	const dctMedian = torben(dctOutput16x16, 256);
	const hash = new Hash256();
	for (let i = 0; i < 16; i++) {
		for (let j = 0; j < 16; j++) {
			if (dctOutput16x16[i * 16 + j] > dctMedian) {
				hash.setBit(i * 16 + j);
			}
		}
	}
	return hash;
}

export default { pdqBuffer16x16ToBits, torben };

export { pdqBuffer16x16ToBits, torben };
