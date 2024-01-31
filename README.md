# Native Javascript PDQ Image Hashing

PDQ is a photo hashing algorithm that can turn photos into 256 bit signatures which can then be used to match other photos.

This project is an attempt to generate hashes natively in the browser, over using the WASM version which although works and is fast, has to have a lot of auxiliary code bundled with it to enable the C++ code to work in a browser environment.

## Usage

To use the code, clone the repo and do something like the following:

```javascript
import pdq from "pdq/src/pdq.js"; // point to wherever the repository is

// the URL of the image
const img = "/testimage.jpg";

const config = {
	resize: 512, // target dimension (px) for the image, should be scaled down to make PDQ faster
	debug: false // dump the process results in the console
};

// create an image object
const prom = new Promise(success => {
	const img = new Image();
	img.onload = () => success(img);
	img.src = URL.createObjectURL(file);
})

	// put the image on a canvas
	.then(img => {
		const canvas = document.createElement("canvas"),
			context = canvas.getContext("2d");
		canvas.imageSmoothingQuality = "high";
		canvas.width = config.resize;
		canvas.height = config.resize;
		context.drawImage(img, 0, 0, img.width, img.height, 0, 0, config.resize, config.resize); // scale the image down
		return canvas;
	})

	// run PDQ
	.then(canvas => pdq(canvas, config))

	// get the resuilts
	.then(results => {
		console.log(results); // returns 8 hashes, one for each rotation + flipped and each rotation
	});
```

## Build From Source

To build the code from source, run the following commands:

```console
$ npm i
$ grunt
```