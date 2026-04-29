# Native TypeScript/PHP PDQ Image Hashing

PDQ is a photo hashing algorithm that can turn photos into 256 bit signatures which can then be used to match other photos.

This project is an attempt to generate hashes natively in the browser, over using the WASM version which although works and is fast, has to have a lot of auxiliary code bundled with it to enable the C++ code to work in a browser environment.

## Getting Started

The repo comes with some example/testing scripts. After cloning the repo, navigate to the `/test/` directory:

- `index.html`: Test native TypeScript vs PHP vs Reference
- `vpdq.html`: Test vPDQ video hashing — compares refactored (src) vs Meta reference implementation side-by-side
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

## Testing

The project uses [Vitest](https://vitest.dev/) for unit tests and [Playwright](https://playwright.dev/) for end-to-end browser tests against real images and videos.

```console
$ npm test              # run unit tests
$ npm run test:watch    # unit tests in watch mode
$ npm run test:e2e      # run Playwright e2e tests (requires Chromium)
$ npm run test:e2e:ui   # e2e tests with Playwright UI
```

Test assets (images and videos) are located in `tests/assets/`.

---

## Technical Reference

This section provides a detailed breakdown of each module in the pipeline, what it does, and what outputs to expect.

### PDQ Pipeline Overview

The PDQ algorithm converts an image into a 256-bit perceptual hash through a series of stages:

```
Image → Luminance → Jarosz Blur → Rescale (64x64) → Quality → DCT (16x16) → Hash (256 bits)
```

Each stage is implemented as a standalone module that can be used independently.

### `src/luminance.ts`

Converts RGBA pixel data to a grayscale luminance array using the standard BT.601 luma coefficients.

**Input:** `Uint8ClampedArray` of RGBA pixel data (4 bytes per pixel).

**Output:** `number[]` of luminance values, one per pixel. Length is `input.length / 4`.

**Formula:** `Y = 0.299 * R + 0.587 * G + 0.114 * B`

The alpha channel is ignored. Output values range from `0` (black) to `255` (white).

### `src/jarosz-filter.ts`

Applies a fast box blur approximation of a Gaussian blur. The filter works in two passes — horizontal (rows) then vertical (columns) — repeated for each pass count. The blur radius is derived from the image dimensions.

**Input:** `number[]` flat array of pixel luminance, `width`, `height`, `passes` (default: 2).

**Output:** The same `number[]` array, mutated in-place. Values are smoothed averages of their local neighbourhood.

Edge pixels are handled by reflecting the boundary values. Larger images and more passes produce stronger blurring. The radius is calculated as `Math.round(width / 128 / passes)`.

### `src/rescale.ts`

Downsamples an image to a target block size by picking the center pixel from each block region.

**Input:** Original `width`, `height`, target `block` size, and `data` (flat pixel array).

**Output:** `Uint8Array` of length `block * block`. This is the rescaled image data, where each value represents the center-sampled pixel from the corresponding block of the original image.

### `src/quality.ts`

Calculates a quality metric based on the sum of horizontal and vertical pixel gradients. This measures how much detail and sharpness is present in the image block.

**Input:** `block` size and flat pixel `data` array of length `block * block`.

**Output:** `number` between `0` and `100`.

- `0` = completely uniform image (no gradients, e.g. solid colour)
- `100` = maximum detail detected

The gradient at each pixel pair is `Math.trunc(((u - v) * 100) / 255)`. The total is scaled by dividing by 90 and capping at 100.

### `src/dct.ts`

Computes a 2D Discrete Cosine Transform (DCT) to convert a 64x64 spatial-domain block into 16x16 frequency-domain coefficients.

**Input:** Flat array of 4096 values (64x64 block).

**Output:** `number[]` of 256 values (16x16 DCT coefficients).

The transform is `B = D * A * D^T` where `D` is a precomputed 16x64 cosine basis matrix with scale factor `√(2/64)`. Low-frequency image features concentrate in the top-left of the output. Uniform input produces near-zero output across all coefficients.

### `src/hash-dct.ts`

Converts DCT coefficients into a 256-bit perceptual hash.

**`computeDct(dct: number[]): Uint8Array`**

Takes 256 DCT coefficients, finds the median (128th value when sorted), and produces a 32-byte hash where each bit is `1` if the corresponding coefficient exceeds the median, `0` otherwise.

**Output:** `Uint8Array(32)` — a 256-bit hash. Uniform input (all values equal) produces an all-zero hash since no values exceed the median.

**`toHex(bytes: Uint8Array): string`**

Converts the 32-byte hash to a 64-character lowercase hex string. Byte order is reversed to match the reference implementation format.

### `src/matrix.ts`

Provides matrix rotation and horizontal flip operations for generating dihedral transformation hashes.

**`rotate(data: number[]): number[]`** — Rotates a square matrix 90 degrees clockwise. Four rotations return the original.

**`flip(data: number[]): number[]`** — Flips a square matrix horizontally (mirrors each row). Two flips return the original.

When `transform: true` is set, the PDQ pipeline uses these to generate 8 distinct hashes (original + 3 rotations + flip + 3 flipped rotations) from a single image.

### `src/pdq.ts`

The main entry point that chains all the above stages together.

**Input:** `HTMLCanvasElement` and optional `PdqConfig`.

**Output:** `Promise<PdqResult>` with:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"pdq"` | Always the string `"pdq"` |
| `hash` | `string \| string[]` | 64-char hex hash, or array of 8 if `transform: true` |
| `quality` | `number` | Quality score 0–100 |