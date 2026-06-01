// Thresholds 256 DCT floats against their global median, returning a 256-bit hash as Uint16Array(16).
// Bit k is set when dct[k] > median; global median matches the C++ reference (torben over all 256 values).
export function computeDct(dct: Float32Array): Uint16Array {
	const median = [...dct].sort((a, b) => a - b)[127],
		words = new Uint16Array(16);
	for (let k = 0; k < 256; k++) {
		if (dct[k] > median) {
			words[k >> 4] |= 1 << (k & 15);
		}
	}
	return words;
}

export function toHex(words: Uint16Array): string {
	let hex = "";
	for (let i = words.length - 1; i >= 0; i--) {
		hex += words[i].toString(16).padStart(4, "0");
	}
	return hex;
}

export default {computeDct, toHex};