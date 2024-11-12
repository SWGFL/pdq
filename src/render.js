const render = (width, height, data) => {
	const canvas = document.createElement("canvas"),
		context = canvas.getContext("2d"),
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

export function renderHash(data) {
	const bits = [];
	for (const byte of data) {
		for (let i = 7; i >= 0; i--) {
			bits.push((byte >> i) & 1 ? 0 : 255);
		}
	}
	const dim = Math.sqrt(bits.length);
	return render(dim, dim, bits);
};