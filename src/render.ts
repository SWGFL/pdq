/**
 * Rendering functions for visualising pixel data.
 * The render function takes the width, height, and pixel data (either as a number array or a Uint8Array) and creates an HTMLCanvasElement to display the image.
 * The pixel data is expected to be in the form of luminance values, where each number corresponds to the intensity of a pixel.
 * The renderHash function takes a Uint8Array representing a hash and converts it into a visual representation on a canvas, where each bit of the hash is represented as either black or white pixels.
 * Both functions append the created canvas to the document body for display.
 */
const render = (width: number, height: number, data: number[] | Uint8Array): HTMLCanvasElement => {
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

export function renderHash(data: Uint8Array): HTMLCanvasElement {
	const bits: number[] = [];
	for (const byte of data) {
		for (let i = 7; i >= 0; i--) {
			bits.push((byte >> i) & 1 ? 0 : 255);
		}
	}
	const dim = Math.sqrt(bits.length);
	return render(dim, dim, bits);
}
