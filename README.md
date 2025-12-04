# Native Javascript/PHP PDQ Image Hashing

PDQ is a photo hashing algorithm that can turn photos into 256 bit signatures which can then be used to match other photos.

This project is an attempt to generate hashes natively in the browser, over using the WASM version which although works and is fast, has to have a lot of auxiliary code bundled with it to enable the C++ code to work in a browser environment.

## Getting Started

The repo comes with some example/testing scripts. After cloning the repo, navigate to the `/test/` directory:

- `index.html`: Test native Javascript vs PHP vs Reference
- `php.php`: Test PHP vs Reference PHP

## Javascript Usage

To use the code, clone the repo and do something like the following:

```javascript
import pdq from "pdq/src/pdq.js"; // point to wherever the repository is

// the URL of the image
const img = "/testimage.jpg";

const config = {
	resize: 512, // target dimension (px) for the image, should be scaled down to make PDQ faster
	debug: false, // dump the process results in the console
	transform: false // whether to generate dihedral transformation hashes
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

	// get the results
	.then(results => {
		console.log(results); // returns 8 hashes if `transform` is set, otherwise just a single hash
	});
```

### Build Javascript From Source

To build the code from source, run the following commands:

```console
$ npm i
$ grunt
```
## PHP Usage

The PHP version has been rewritten to use GD image manipulations for the greyscaling and box-blur to imnprove performance, as these are the most computationally expensive.

Here is a basic script to show usage of the PHP PDQ hash generator:

```php
// program options
$file = __DIR__.'/test.jpg';
$config = [
	'resize' => 512, // target dimension (px) for the image, should be scaled down to make PDQ faster
	'debug' => false, // dump the process results in the console
	'transform' => false // whether to generate dihedral transformation hashes
];

// create object
$pdq = new \swgfl\pdq\pdq($config);

// generate hashes
if (($hashes = $pdq->run($file, $error)) !== false) { // can be an array of images or a GD object
	var_dump($hashes);
} else {
	\trigger_error('Could not generate hashes: '.$error, E_USER_WARNING);
}
```