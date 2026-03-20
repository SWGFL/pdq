/**
 * PDQ perceptual image hashing algorithm.
 *
 * Produces a 256-bit hash from an image by:
 * 1. Converting to luminance
 * 2. Downsampling to 64x64 via Jarosz tent filter
 * 3. Computing quality metric from image gradients
 * 4. Applying 2D DCT to get 16x16 frequency coefficients
 * 5. Thresholding at the median to produce 256 bits
 */

import { Hash256 } from "./hash256";
import {
  fillFloatLumaFromRGBA,
  computeJaroszFilterWindowSize,
  jaroszFilterFloat,
  decimateFloat,
} from "./downscaling";

const PDQ_NUM_JAROSZ_XY_PASSES = 2;
const MIN_HASHABLE_DIM = 5;

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

const DCT_MATRIX = buildDCTMatrix();

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

function pdqImageDomainQualityMetric(buffer64x64: Float32Array): number {
  let gradientSum = 0;

  for (let i = 0; i < 63; i++) {
    for (let j = 0; j < 64; j++) {
      const u = buffer64x64[i * 64 + j];
      const v = buffer64x64[(i + 1) * 64 + j];
      const d = Math.trunc(((u - v) * 100) / 255);
      gradientSum += Math.abs(d);
    }
  }

  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 63; j++) {
      const u = buffer64x64[i * 64 + j];
      const v = buffer64x64[i * 64 + j + 1];
      const d = Math.trunc(((u - v) * 100) / 255);
      gradientSum += Math.abs(d);
    }
  }

  let quality = Math.trunc(gradientSum / 90);
  if (quality > 100) quality = 100;
  return quality;
}

function dct64To16(A: Float32Array): Float64Array {
  const D = DCT_MATRIX;
  const T = new Float64Array(16 * 64);
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 64; j++) {
      let sumk = 0.0;
      for (let k = 0; k < 64; k++) {
        sumk += D[i * 64 + k] * A[k * 64 + j];
      }
      T[i * 64 + j] = sumk;
    }
  }

  const B = new Float64Array(16 * 16);
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      let sumk = 0.0;
      for (let k = 0; k < 64; k++) {
        sumk += T[i * 64 + k] * D[j * 64 + k];
      }
      B[i * 16 + j] = sumk;
    }
  }

  return B;
}

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

export interface PdqHashResult {
  hash: Hash256;
  quality: number;
}

function pdqHashFromRGBA(rgbaData: Uint8Array | Uint8ClampedArray, numRows: number, numCols: number): PdqHashResult {
  if (numRows < MIN_HASHABLE_DIM || numCols < MIN_HASHABLE_DIM) {
    return { hash: new Hash256(), quality: 0 };
  }

  const luma = fillFloatLumaFromRGBA(rgbaData, numRows, numCols);
  return pdqHash256FromFloatLuma(luma, numRows, numCols);
}

function pdqHash256FromFloatLuma(lumaBuffer: Float32Array, numRows: number, numCols: number): PdqHashResult {
  if (numRows < MIN_HASHABLE_DIM || numCols < MIN_HASHABLE_DIM) {
    return { hash: new Hash256(), quality: 0 };
  }

  let buffer64x64: Float32Array;

  if (numRows === 64 && numCols === 64) {
    buffer64x64 = new Float32Array(lumaBuffer);
  } else {
    const buffer1 = new Float32Array(lumaBuffer);
    const buffer2 = new Float32Array(numRows * numCols);

    const windowSizeAlongRows = computeJaroszFilterWindowSize(numCols, 64);
    const windowSizeAlongCols = computeJaroszFilterWindowSize(numRows, 64);

    jaroszFilterFloat(
      buffer1,
      buffer2,
      numRows,
      numCols,
      windowSizeAlongRows,
      windowSizeAlongCols,
      PDQ_NUM_JAROSZ_XY_PASSES
    );

    buffer64x64 = decimateFloat(buffer1, numRows, numCols, 64, 64);
  }

  const quality = pdqImageDomainQualityMetric(buffer64x64);
  const dctOutput = dct64To16(buffer64x64);
  const hash = pdqBuffer16x16ToBits(dctOutput);

  return { hash, quality };
}

export {
  pdqHashFromRGBA,
  pdqHash256FromFloatLuma,
  pdqImageDomainQualityMetric,
  dct64To16,
  pdqBuffer16x16ToBits,
  torben,
  MIN_HASHABLE_DIM,
};
