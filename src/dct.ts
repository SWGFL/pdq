/**
 * 2D Discrete Cosine Transform: 64x64 spatial block to 16x16 frequency coefficients.
 *
 * B = D * A * D^T where D is a precomputed 16x64 cosine basis matrix.
 *
 * Optimised: precomputes D^T (64x16, column-major layout) so both matrix
 * multiplications access memory sequentially. Scratch buffer T is reused.
 */

function buildDCTMatrix(): Float64Array {
	const numRows = 16;
	const numCols = 64;
	const scaleFactor = Math.sqrt(2.0 / numCols);
	const matrix = new Float64Array(numRows * numCols);
	for (let i = 0; i < numRows; i++) {
		for (let j = 0; j < numCols; j++) {
			matrix[i * numCols + j] =
				scaleFactor *
				Math.cos((Math.PI / (2.0 * numCols)) * (i + 1) * (2 * j + 1));
		}
	}
	return matrix;
}

function buildDCTMatrixTransposed(D: Float64Array): Float64Array {
	// Transpose D (16x64) into Dt (64x16) so Dt[k*16+j] = D[j*64+k]
	const Dt = new Float64Array(64 * 16);
	for (let j = 0; j < 16; j++) {
		const jOff = j * 64;
		for (let k = 0; k < 64; k++) {
			Dt[k * 16 + j] = D[jOff + k];
		}
	}
	return Dt;
}

const DCT_MATRIX = buildDCTMatrix();
const DCT_MATRIX_T = buildDCTMatrixTransposed(DCT_MATRIX);

// Reusable scratch buffer for intermediate result T (16x64)
const T_SCRATCH = new Float64Array(16 * 64);

function dct64To16(A: Float32Array | Float64Array | number[] | Uint8Array): Float64Array {
	const D = DCT_MATRIX;
	const Dt = DCT_MATRIX_T;
	const T = T_SCRATCH;

	// T = D * A  (16x64 = 16x64 * 64x64)
	for (let i = 0; i < 16; i++) {
		const iOff = i * 64;
		for (let j = 0; j < 64; j++) {
			let sumk = 0.0;
			const jOff = j; // column j of A: A[k*64 + j]
			for (let k = 0; k < 64; k++) {
				sumk += D[iOff + k] * (A[k * 64 + jOff] as number);
			}
			T[iOff + j] = sumk;
		}
	}

	// B = T * D^T  (16x16 = 16x64 * 64x16)
	// Dt is stored as 64x16 so Dt[k*16+j] gives column j, sequential in k
	const B = new Float64Array(16 * 16);
	for (let i = 0; i < 16; i++) {
		const iOff = i * 64;
		const bOff = i * 16;
		for (let j = 0; j < 16; j++) {
			let sumk = 0.0;
			for (let k = 0; k < 64; k++) {
				sumk += T[iOff + k] * Dt[k * 16 + j];
			}
			B[bOff + j] = sumk;
		}
	}

	return B;
}

export default dct64To16;

export { dct64To16, DCT_MATRIX };
