import luminance from "./luminance";
import rescalefunc from "./rescale";
import jarosz from "./jarosz-filter";
import dct from "./dct";
import qualityFn from "./quality";

let offscreen: OffscreenCanvas | null = null,
	ctx: OffscreenCanvasRenderingContext2D | null = null;

export function computePdqf(
	videoFrame: VideoFrame,
	rescale: number,
	passes: number,
	block: number,
	computeQuality: boolean
): {rawDct: Float32Array; quality: number | null} {
	const scale = Math.min(1, rescale / Math.max(videoFrame.displayWidth, videoFrame.displayHeight)),
		bw = Math.round(videoFrame.displayWidth * scale),
		bh = Math.round(videoFrame.displayHeight * scale);

	if (offscreen === null || offscreen.width !== bw || offscreen.height !== bh) {
		offscreen = new OffscreenCanvas(bw, bh);
		ctx = offscreen.getContext("2d", {willReadFrequently: true})!;
		ctx!.imageSmoothingEnabled = false;
	}

	ctx!.drawImage(videoFrame, 0, 0, bw, bh);
	videoFrame.close();
	const {data: rgba} = ctx!.getImageData(0, 0, bw, bh),
		luma = luminance(rgba),
		blurred = jarosz(luma, bw, bh, passes, block),
		scaled = rescalefunc(bw, bh, block, blurred),
		rawDct = dct(scaled),
		quality = computeQuality ? qualityFn(block, scaled) : null;

	return {rawDct, quality};
}
