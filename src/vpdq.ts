import distance from "./distance";
import {computeDct, toHex} from "./hash-dct";

export class VpdqFeature {
	pdqHash: Uint16Array;
	frameNumber: number;
	quality: number;
	timeStamp: number;

	constructor(pdqHash: Uint16Array, frameNumber: number, quality: number, timeStamp: number) {
		this.pdqHash = pdqHash;
		this.frameNumber = frameNumber;
		this.quality = quality;
		this.timeStamp = timeStamp;
	}

	get hex(): string {
		return toHex(this.pdqHash);
	}
}

export interface VpdqOptions {
	fps?: number;
	pruneDistance?: number; // skip frames with Hamming distance ≤ this from the last retained frame
	qualityTolerance?: number;
	distanceTolerance?: number;
	queryMatchThreshold?: number;
	targetMatchThreshold?: number;
}


const defaultConfig = {
	fps: 1, // vPDQ sample rate (default 1); frames are subsampled from the extraction fps
	pruneDistance: 0, // skip frames with Hamming distance ≤ this from the last retained frame (0 = disabled)
	qualityTolerance: 50, // minimum frame quality to include (default 50)
	distanceTolerance: 31, // Hamming distance threshold for matching (default 31)
	queryMatchThreshold: 80.0, // % of query frames that must match (default 80)
	targetMatchThreshold: 0.0 // % of target frames that must match (default 0)
};

export function getConfig(opts?: VpdqOptions) {
	return { ...defaultConfig, ...opts };
}

export default class Vpdq {
	private features: VpdqFeature[];
	private fps: number;
	private interval: number;  // pipeline frames to skip between vPDQ samples
	private opts: ReturnType<typeof getConfig>;

	constructor(extractFps: number, opts?: VpdqOptions) {
		this.opts = getConfig(opts);
		this.fps = extractFps;
		this.interval = Math.max(1, Math.round(extractFps / this.opts.fps));
		this.features = [];
	}

	addFrame(pdqf: Float32Array, quality: number, frameIndex: number): void {
		if (frameIndex % this.interval === 0 && quality >= this.opts.qualityTolerance) {
			const hash = computeDct(pdqf),
				pd = this.opts.pruneDistance;
			if (pd === 0 || this.features.length === 0
				|| distance(hash, this.features[this.features.length - 1].pdqHash) > pd) {
				this.features.push(new VpdqFeature(hash, frameIndex, quality, frameIndex / this.fps));
			}
		}
	}

	compile(): VpdqFeature[] {
		return this.features;
	}
}
