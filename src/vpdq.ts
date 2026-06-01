import distance from "./distance";
import {toHex} from "./hash-dct";

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
	private opts: ReturnType<typeof getConfig>;

	constructor(opts?: VpdqOptions) {
		this.opts = getConfig(opts);
		this.fps = this.opts.fps;
		this.features = [];
	}

	addFrame(pdqHash: Uint16Array, quality: number, frameIndex: number): void {
		if (quality >= this.opts.qualityTolerance) {
			const pd = this.opts.pruneDistance;
			if (pd === 0 || this.features.length === 0 || distance(pdqHash, this.features[this.features.length - 1].pdqHash) > pd) {
				this.features.push(new VpdqFeature(pdqHash, frameIndex, quality, frameIndex / this.fps));
			}
		}
	}

	static includeFrame(inputfps: number, fps: number, frameIndex: number): boolean {
		const interval = Math.max(1, Math.round(inputfps / fps));
		return interval > 0 && frameIndex % interval === 0;
	}

	compile(): string {
		return JSON.stringify(this.features.map(f => `${f.hex},${f.quality},${f.timeStamp.toFixed(3)}`));
	}
}
