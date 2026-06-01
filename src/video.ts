import getFrames from "./frame";
import tmk, {type TmkDescriptor} from "./tmk";
import vpdq, {type VpdqFeature, type VpdqOptions} from "./vpdq";

// Per-call configuration and result shape
export interface VideoConfig {
	fps?: number;
	passes?: number;
	block?: number;
	rescale?: number;
	concurrency?: number;
	onprogress?: (framesProcessed: number, framesTotal: number) => void;
	tmk?: boolean;
	vpdq?: VpdqOptions | boolean;
};

export interface VideoResult {
	tmk?: TmkDescriptor;
	vpdq?: string;
};

// Defaults merged with caller-supplied config
const defaultConfig = {
	passes: 2,
	block: 64,
	rescale: 512,
	fps: 15,
	concurrency: navigator.hardwareConcurrency || 4,
	tmk:  true,
	vpdq: true as VpdqOptions | boolean,
	worker: "video-worker.js",
};

function getConfig(config: VideoConfig) {
	return { ...defaultConfig, ...config };
}

export type {TmkDescriptor, VpdqOptions};
export {vpdq, type VpdqFeature};

// ---- Worker pool ----

type FrameResult = {vpdq: {hash: Uint16Array; quality: number | null} | null; rawDct: Float32Array | null};

// Spawn workers and send each one its init message
function createWorkers(config: ReturnType<typeof getConfig>): Worker[] {
	const url = new URL(/* @vite-ignore */ config.worker, import.meta.url);
	return Array.from({length: config.concurrency}, () => {
		const worker = new Worker(url, {type: "module"});
		worker.postMessage({
			type: "init",
			rescale: config.rescale,
			passes: config.passes,
			block: config.block,
			fps: config.fps,
			tmk: config.tmk !== false,
			vpdq: config.vpdq !== false ? config.vpdq : false
		});
		return worker;
	});
}

// Send one frame to a worker and resolve with the namespaced result
function dispatchToWorker(
	worker: Worker,
	frame: {videoFrame: VideoFrame; frameIndex: number}
): Promise<FrameResult> {
	return new Promise<FrameResult>(resolve => {
		const handler = ({data}: MessageEvent) => {
			worker.removeEventListener("message", handler);
			resolve({
				vpdq: data.vpdq ? {hash: new Uint16Array(data.vpdq.hash), quality: data.vpdq.quality} : null,
				rawDct: data.rawDct ? new Float32Array(data.rawDct) : null,
			});
		};
		worker.addEventListener("message", handler);
		worker.postMessage(frame, [frame.videoFrame]);
	});
}

// ---- Public API ----
export default function video(source: ArrayBuffer, config: VideoConfig = {}): Promise<VideoResult> {
	const opts = getConfig(config),
		fps = opts.fps ?? (opts.tmk !== false ? 15 : 1),
		vpdqAcc = opts.vpdq !== false ? new vpdq(typeof opts.vpdq === "object" ? opts.vpdq : undefined) : null,
		tmkAcc = opts.tmk !== false ? new tmk() : null;

	const workers = createWorkers(opts);

	return new Promise<VideoResult>((resolve, reject) => {
		let index = 0,
			framesTotal = 0,
			framesEmitted = 0,
			decoderDone = false,
			finalising = false;

		const freeSlots = workers.map((_, i) => i),
			queue: Array<{videoFrame: VideoFrame; frameIndex: number;}> = [],
			cache = new Map<number, FrameResult>(),
			checkFinish = () => {
				if (!finalising && decoderDone && index >= framesEmitted) {
					finalising = true;

					for (const worker of workers) {
						worker.terminate();
					}
					const out: VideoResult = {};
					if (tmkAcc !== null) {
						out.tmk = tmkAcc.compile();
					}
					if (vpdqAcc !== null) {
						out.vpdq = vpdqAcc.compile();
					}
					resolve(out);
				}
			},
			processFrames = () => {
				while (queue.length > 0 && freeSlots.length > 0) {
					const frame = queue.shift()!,
						slotIdx = freeSlots.pop()!;
					dispatchToWorker(workers[slotIdx], frame).then(result => {
						cache.set(frame.frameIndex, result);

						// Accumulate in strict index order for deterministic results
						while (cache.has(index)) {
							const {vpdq: v, rawDct} = cache.get(index)!;
							cache.delete(index);
							if (vpdqAcc !== null && v !== null && v.quality !== null) {
								vpdqAcc.addFrame(v.hash, v.quality, index);
							}
							if (tmkAcc !== null && rawDct !== null) {
								tmkAcc.addFrame(rawDct, index);
							}
							opts.onprogress?.(index, framesTotal);
							index++;
						}

						freeSlots.push(slotIdx);
						processFrames();
						checkFinish();
					}).catch(reject);
				}
			};

		getFrames(source, fps, frame => {
			framesEmitted++;
			queue.push(frame);
			processFrames();
		}, total => {
			framesTotal = total;
		}).then(() => {
			decoderDone = true;
			checkFinish();
		}).catch(reject);
	});
}
