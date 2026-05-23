import luminance from "./luminance";
import rescale from "./rescale";
import jarosz from "./jarosz-filter";
import dct from "./dct";
import quality from "./quality";

const post = (self as unknown as Worker).postMessage.bind(self);

let passes: number,                  // number of Jarosz blur passes
	block: number,                   // DCT block size (e.g. 64)
	computeQuality: boolean,         // whether to compute the quality score (vPDQ only)
	offscreen: OffscreenCanvas | null = null,
	ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = ({data}: MessageEvent) => {
	if (data.type === "init") {
		({passes, block, computeQuality} = data);
	} else {
		const {bitmap, frameIndex} = data as {bitmap: ImageBitmap; frameIndex: number},
			scale = Math.min(1, 512 / Math.min(bitmap.width, bitmap.height)),
			bw = Math.round(bitmap.width * scale),
			bh = Math.round(bitmap.height * scale);

		// Recreate canvas only if dimensions changed (handles multi-resolution sources)
		if (!offscreen || offscreen.width !== bw || offscreen.height !== bh) {
			offscreen = new OffscreenCanvas(bw, bh);
			ctx = offscreen.getContext("2d", {willReadFrequently: true})!;
			ctx!.imageSmoothingEnabled = false;
		}

		ctx!.drawImage(bitmap, 0, 0, bw, bh);
		bitmap.close();
		const {data: rgba} = ctx!.getImageData(0, 0, bw, bh),
			luma = luminance(rgba),
			blurred = jarosz(luma, bw, bh, passes, block),
			scaled = rescale(bw, bh, block, blurred),
			rawDct = dct(scaled);

		post(
			{
				frameIndex,
				pdqf: rawDct.buffer,
				quality: computeQuality ? quality(block, scaled) : null,
			},
			[rawDct.buffer]
		);
	}
};
