# Native TypeScript/PHP PDQ Image Hashing

PDQ is a photo hashing algorithm that can turn photos into 256 bit signatures which can then be used to match other photos.

This project is an attempt to generate hashes natively in the browser, over using the WASM version which although works and is fast, has to have a lot of auxiliary code bundled with it to enable the C++ code to work in a browser environment.

## Getting Started

The repo comes with some example/testing scripts. After cloning the repo, navigate to the `/test/` directory:

- `index.html`: Test native TypeScript vs PHP vs Reference
- `php.php`: Test PHP vs Reference PHP

## TypeScript Usage

The library is written in TypeScript and exports full type definitions. To use the code, clone the repo and do something like the following:

```typescript
import pdq from "pdq"; // or point to "dist/pdq.js"
import type { PdqConfig, PdqResult } from "pdq";

const config: PdqConfig = {
	debug: false, // render intermediate results to the DOM
	passes: 2, // number of box blur filter passes
	block: 64, // rescale block size
	transform: false // whether to generate dihedral transformation hashes
};

// create an image object and put it on a canvas
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d")!;
const img = new Image();
img.onload = () => {
	canvas.width = 512;
	canvas.height = 512;
	context.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);

	// run PDQ
	pdq(canvas, config).then((results: PdqResult) => {
		console.log(results.hash); // string if `transform` is false, string[] of 8 hashes if true
		console.log(results.quality); // quality score
	});
};
img.src = "/testimage.jpg";
```

### Build From Source

To build the code from source, run the following commands:

```console
$ npm install
$ npm run build
```
## PHP Usage

The PHP version has been rewritten to use GD image manipulations for the greyscaling and box-blur to improve performance, as these are the most computationally expensive.

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