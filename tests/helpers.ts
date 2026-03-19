/**
 * Shared test utilities for PDQ test suite.
 */

export function makeUniformRGBA(width: number, height: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
		data[i + 3] = a;
	}
	return data;
}

export function makeGradientRGBA(width: number, height: number): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const val = Math.round((x / (width - 1)) * 255);
			data[i] = val;
			data[i + 1] = val;
			data[i + 2] = val;
			data[i + 3] = 255;
		}
	}
	return data;
}

export function makeUniformBlock(block: number, value: number): number[] {
	return Array(block * block).fill(value);
}

export function makeCheckerboard(block: number, val1: number, val2: number): number[] {
	const data = Array(block * block);
	for (let i = 0; i < block; i++) {
		for (let j = 0; j < block; j++) {
			data[i * block + j] = (i + j) % 2 === 0 ? val1 : val2;
		}
	}
	return data;
}

export function makeGradientBlock(block: number): number[] {
	const data = Array(block * block);
	for (let i = 0; i < block; i++) {
		for (let j = 0; j < block; j++) {
			data[i * block + j] = Math.round((j / (block - 1)) * 255);
		}
	}
	return data;
}

export function variance(data: number[]): number {
	const mean = data.reduce((a, b) => a + b, 0) / data.length;
	return data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;
}
