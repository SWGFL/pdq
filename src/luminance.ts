/**
 * RGBA to luminance conversion using BT.601 luma coefficients.
 */
const LUMA_FROM_R_COEFF = 0.299;
const LUMA_FROM_G_COEFF = 0.587;
const LUMA_FROM_B_COEFF = 0.114;

function fillFloatLumaFromRGBA(rgba: Uint8Array | Uint8ClampedArray, numRows: number, numCols: number): Float32Array {
	const n = numRows * numCols;
	const luma = new Float32Array(n);
	for (let i = 0, p = 0; i < n; i++, p += 4) {
		luma[i] = LUMA_FROM_R_COEFF * rgba[p] +
			LUMA_FROM_G_COEFF * rgba[p + 1] +
			LUMA_FROM_B_COEFF * rgba[p + 2];
	}
	return luma;
}

function fillFloatLumaFromRGB(r: Uint8Array, g: Uint8Array, b: Uint8Array, numRows: number, numCols: number): Float32Array {
	const luma = new Float32Array(numRows * numCols);
	for (let i = 0; i < numRows * numCols; i++) {
		luma[i] =
			LUMA_FROM_R_COEFF * r[i] +
			LUMA_FROM_G_COEFF * g[i] +
			LUMA_FROM_B_COEFF * b[i];
	}
	return luma;
}

function fillFloatLumaFromGrey(grey: Uint8Array, numRows: number, numCols: number): Float32Array {
	const luma = new Float32Array(numRows * numCols);
	for (let i = 0; i < numRows * numCols; i++) {
		luma[i] = grey[i];
	}
	return luma;
}

export default fillFloatLumaFromRGBA;

export {
	fillFloatLumaFromRGBA,
	fillFloatLumaFromRGB,
	fillFloatLumaFromGrey,
	LUMA_FROM_R_COEFF,
	LUMA_FROM_G_COEFF,
	LUMA_FROM_B_COEFF,
};
