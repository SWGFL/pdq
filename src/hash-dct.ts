/**
 * Hashing functions for perceptual hashing.
 * The computeDct function computes the discrete cosine transform (DCT) of a block of pixel data and generates a hash based on the DCT values.
 * The toHex function converts a Uint8Array of bytes into a hexadecimal string representation.
 * The computeDct function works by first calculating the median value of the DCT coefficients, and then creating a hash where each bit is set based on whether the corresponding DCT coefficient is greater than the median.
 * The resulting hash is a 32-byte (256-bit) value that can be used for comparing images based on their perceptual similarity.
 */
export default {
	computeDct: (dct: number[]): Uint8Array => {

		// get the middle value
		const median = [...dct].sort((a, b) => a - b)[127];

		// extract bits
		const hash = new Uint8Array(32);
		dct.forEach((value, i) => {
			hash[Math.floor(i / 8)] |= (value > median ? 1 : 0) << (i % 8);
		});
		return hash;
	},
	toHex: (bytes: Uint8Array): string => Array.from(bytes, byte => ("0" + (byte & 0xFF).toString(16)).slice(-2)).reverse().join(""),
};
