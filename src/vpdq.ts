/**
 * vPDQ (Video PDQ) — single entry point.
 *
 * Re-exports the complete vPDQ API for video similarity detection.
 * The default export is hashVideoUrl, mirroring how pdq.ts exports
 * its canvas-based hasher as the default.
 */

import { pdqHashFromRGBA } from "./pdq";
import { VpdqFeature } from "./vpdq/vpdqTypes";

export interface HashVideoOptions {
	secondsPerHash?: number;
	pruneDistance?: number;
}


function supportsWebCodecs(): boolean {
	return typeof VideoFrame !== "undefined";
}

async function extractFrameWebCodecs(video: HTMLVideoElement): Promise<{ data: Uint8Array; width: number; height: number }> {
	const frame = new VideoFrame(video, { timestamp: 0 });
	const width = frame.displayWidth;
	const height = frame.displayHeight;

	const size = frame.allocationSize({ format: "RGBA" });
	const buffer = new Uint8Array(size);
	await frame.copyTo(buffer, { format: "RGBA" });
	frame.close();

	return { data: buffer, width, height };
}

function extractFrameCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { data: Uint8ClampedArray; width: number; height: number } {
	ctx.drawImage(video, 0, 0);
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return { data: imageData.data, width: canvas.width, height: canvas.height };
}

/**
 * Hash a video from a URL. Seeks at secondsPerHash intervals (default 1.0),
 * extracts frames via WebCodecs (or Canvas fallback), and returns vPDQ features.
 */
async function hashVideoUrl(videoUrl: string, options: HashVideoOptions = {}): Promise<VpdqFeature[]> {
	const { secondsPerHash = 1.0, pruneDistance } = options;

	if (typeof document === "undefined") {
		throw new Error("hashVideoUrl requires a browser environment with DOM");
	}

	const video = document.createElement("video");
	video.crossOrigin = "anonymous";
	video.muted = true;
	video.preload = "auto";

	await new Promise<Event>((resolve, reject) => {
		video.onloadedmetadata = resolve;
		video.onerror = () =>
			reject(new Error(`Failed to load video: ${videoUrl}`));
		video.src = videoUrl;
	});

	const useWebCodecs = supportsWebCodecs();

	let canvas: HTMLCanvasElement | undefined;
	let ctx: CanvasRenderingContext2D | undefined;
	if (!useWebCodecs) {
		canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		ctx = canvas.getContext("2d")!;
	}

	const features: VpdqFeature[] = [];
	const duration = video.duration;
	let frameNumber = 0;

	for (
		let timeStamp = 0;
		timeStamp < duration;
		timeStamp += secondsPerHash, frameNumber++
	) {
		await new Promise<Event>((resolve) => {
			video.onseeked = resolve;
			video.currentTime = timeStamp;
		});

		let frameData: { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
		if (useWebCodecs) {
			frameData = await extractFrameWebCodecs(video);
		} else {
			frameData = extractFrameCanvas(video, canvas!, ctx!);
		}

		const { hash, quality } = pdqHashFromRGBA(
			frameData.data,
			frameData.height,
			frameData.width
		);

		if (pruneDistance !== undefined && features.length > 0) {
			const lastRetained = features[features.length - 1];
			if (hash.hammingDistance(lastRetained.pdqHash) <= pruneDistance) {
				continue;
			}
		}

		features.push(new VpdqFeature(hash, frameNumber, quality, timeStamp));
	}

	return features;
}

export default hashVideoUrl;

export {
	hashVideoUrl,
};

export {
	Hash256,
	pdqHashFromRGBA,
	pdqHash256FromFloatLuma,
	fillFloatLumaFromRGBA,
	fillFloatLumaFromRGB,
	fillFloatLumaFromGrey,
	VpdqFeature,
	VpdqMatchResult,
	VPDQ_DISTANCE_THRESHOLD,
	VPDQ_QUALITY_THRESHOLD,
	VPDQ_QUERY_MATCH_THRESHOLD_PERCENT,
	VPDQ_INDEX_MATCH_THRESHOLD_PERCENT,
	matchTwoHashBrute,
	isMatch,
	featuresToCppFormat,
	featuresFromCppFormat,
	featuresToJson,
	featuresFromJson,
	dedupeFeatures,
	qualityFilterFeatures,
	prepareFeatures,
	hashFrames,
	pruneFrames,
} from "./vpdq/index";

export type {
	PdqHashResult,
	IsMatchOptions,
	IsMatchResult,
	FrameData,
} from "./vpdq/index";
