/**
 * Rendering functions for visualising pixel data.
 */
import { Hash256 } from "./hash256";

const render = (width: number, height: number, data: Float32Array | Float64Array | number[] | Uint8Array): HTMLCanvasElement => {
	const canvas = document.createElement("canvas"),
		context = canvas.getContext("2d")!,
		img = new ImageData(width, height),
		imgdata = img.data;
	canvas.width = width;
	canvas.height = height;
	for (let i = 0; i < data.length; i++) {
		imgdata[i * 4] = data[i];
		imgdata[i * 4 + 1] = data[i];
		imgdata[i * 4 + 2] = data[i];
		imgdata[i * 4 + 3] = 255;
	}
	context.putImageData(img, 0, 0);
	document.body.appendChild(canvas);
	return canvas;
};

export default render;

export function renderHash(hash: Hash256): HTMLCanvasElement {
	const bits: number[] = [];
	for (let i = 0; i < 256; i++) {
		bits.push(hash.getBit(i) ? 0 : 255);
	}
	const dim = Math.sqrt(bits.length);
	return render(dim, dim, bits);
}
