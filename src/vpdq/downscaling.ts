/**
 * Image downscaling using Jarosz box filtering.
 *
 * Implements the blur-and-decimate approach from:
 * Wojciech Jarosz 'Fast Image Convolutions' ACM SIGGRAPH 2001
 *
 * X,Y,X,Y passes of 1-D box filters produce a 2D tent filter.
 */

const LUMA_FROM_R_COEFF = 0.299;
const LUMA_FROM_G_COEFF = 0.587;
const LUMA_FROM_B_COEFF = 0.114;

function fillFloatLumaFromRGBA(rgba: Uint8Array | Uint8ClampedArray, numRows: number, numCols: number): Float32Array {
  const luma = new Float32Array(numRows * numCols);
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const pixelIdx = (i * numCols + j) * 4;
      luma[i * numCols + j] =
        LUMA_FROM_R_COEFF * rgba[pixelIdx] +
        LUMA_FROM_G_COEFF * rgba[pixelIdx + 1] +
        LUMA_FROM_B_COEFF * rgba[pixelIdx + 2];
    }
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

function computeJaroszFilterWindowSize(oldDimension: number, newDimension: number): number {
  return Math.floor(
    (oldDimension + 2 * newDimension - 1) / (2 * newDimension)
  );
}

function box1DFloat(
  invec: Float32Array,
  outvec: Float32Array,
  inOffset: number,
  outOffset: number,
  vectorLength: number,
  stride: number,
  fullWindowSize: number
): void {
  const halfWindowSize = Math.floor((fullWindowSize + 2) / 2);

  const phase1Nreps = halfWindowSize - 1;
  const phase2Nreps = fullWindowSize - halfWindowSize + 1;
  const phase3Nreps = vectorLength - fullWindowSize;
  const phase4Nreps = halfWindowSize - 1;

  let li = inOffset;
  let ri = inOffset;
  let oi = outOffset;
  let sum = 0.0;
  let currentWindowSize = 0;

  for (let i = 0; i < phase1Nreps; i++) {
    sum += invec[ri];
    currentWindowSize++;
    ri += stride;
  }

  for (let i = 0; i < phase2Nreps; i++) {
    sum += invec[ri];
    currentWindowSize++;
    outvec[oi] = sum / currentWindowSize;
    ri += stride;
    oi += stride;
  }

  for (let i = 0; i < phase3Nreps; i++) {
    sum += invec[ri];
    sum -= invec[li];
    outvec[oi] = sum / currentWindowSize;
    li += stride;
    ri += stride;
    oi += stride;
  }

  for (let i = 0; i < phase4Nreps; i++) {
    sum -= invec[li];
    currentWindowSize--;
    outvec[oi] = sum / currentWindowSize;
    li += stride;
    oi += stride;
  }
}

function boxAlongRowsFloat(input: Float32Array, output: Float32Array, numRows: number, numCols: number, windowSize: number): void {
  for (let i = 0; i < numRows; i++) {
    const offset = i * numCols;
    box1DFloat(input, output, offset, offset, numCols, 1, windowSize);
  }
}

function boxAlongColsFloat(input: Float32Array, output: Float32Array, numRows: number, numCols: number, windowSize: number): void {
  for (let j = 0; j < numCols; j++) {
    box1DFloat(input, output, j, j, numRows, numCols, windowSize);
  }
}

function jaroszFilterFloat(
  buffer1: Float32Array,
  buffer2: Float32Array,
  numRows: number,
  numCols: number,
  windowSizeAlongRows: number,
  windowSizeAlongCols: number,
  nreps: number
): void {
  for (let i = 0; i < nreps; i++) {
    boxAlongRowsFloat(buffer1, buffer2, numRows, numCols, windowSizeAlongRows);
    boxAlongColsFloat(buffer2, buffer1, numRows, numCols, windowSizeAlongCols);
  }
}

function decimateFloat(input: Float32Array, inNumRows: number, inNumCols: number, outNumRows: number, outNumCols: number): Float32Array {
  const output = new Float32Array(outNumRows * outNumCols);
  for (let outi = 0; outi < outNumRows; outi++) {
    const ini = Math.floor(((outi + 0.5) * inNumRows) / outNumRows);
    for (let outj = 0; outj < outNumCols; outj++) {
      const inj = Math.floor(((outj + 0.5) * inNumCols) / outNumCols);
      output[outi * outNumCols + outj] = input[ini * inNumCols + inj];
    }
  }
  return output;
}

export {
  fillFloatLumaFromRGBA,
  fillFloatLumaFromRGB,
  fillFloatLumaFromGrey,
  computeJaroszFilterWindowSize,
  jaroszFilterFloat,
  decimateFloat,
  box1DFloat,
  boxAlongRowsFloat,
  boxAlongColsFloat,
};
