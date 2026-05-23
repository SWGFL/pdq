import extractVideoFrames from "./frame";
import tmk, {type TmkDescriptor} from "./tmk";
import vpdq, {type VpdqFeature, type VpdqOptions} from "./vpdq";

// Per-call configuration and result shape
export interface VideoConfig {
	fps?: number;
	passes?: number;
	block?: number;
	concurrency?: number;
	onprogress?: (framesProcessed: number, framesTotal: number) => void;
	tmk?: boolean;
	vpdq?: VpdqOptions | boolean;
}

export interface VideoResult {
	tmk?: TmkDescriptor;
	vpdq?: VpdqFeature[];
}

// Defaults merged with caller-supplied config
const defaultConfig = {
	passes: 2,
	block: 64,
	concurrency: navigator.hardwareConcurrency || 4,
	tmk:  true,
	vpdq: true as VpdqOptions | boolean,
	worker: "pdqf.js",
};

function getConfig(config: VideoConfig) {
	return { ...defaultConfig, ...config };
}

export type {TmkDescriptor, VpdqOptions};
export {vpdq, type VpdqFeature};

// ---- Worker pool ----

type DispatchResult = {pdqf: Float32Array; quality: number | null};

// Spawn workers and send each one its init message
function createWorkers(config: ReturnType<typeof getConfig>, computeQuality: boolean): Worker[] {
	const url = new URL(config.worker, import.meta.url);
	return Array.from({length: config.concurrency}, () => {
		const worker = new Worker(url, {type: "module"});
		worker.postMessage({
			type: "init",
			passes: config.passes,
			block: config.block,
			computeQuality,
		});
		return worker;
	});
}

// Send one frame to a worker and resolve with its PDQf result
function dispatchToWorker(
	worker: Worker,
	frame: {bitmap: ImageBitmap; frameIndex: number}
): Promise<DispatchResult> {
	return new Promise<DispatchResult>(resolve => {
		const handler = ({data}: MessageEvent) => {
			worker.removeEventListener("message", handler);
			resolve({pdqf: new Float32Array(data.pdqf), quality: data.quality});
		};
		worker.addEventListener("message", handler);
		worker.postMessage(frame, [frame.bitmap]);
	});
}

// ---- Public API ----
export default function video(source: ArrayBuffer, config: VideoConfig = {}): Promise<VideoResult> {
	const opts = getConfig(config),
		wantTmk  = opts.tmk !== false,
		wantVpdq = opts.vpdq !== false,
		fps = opts.fps ?? (wantTmk ? 15 : 1);

	// Create workers and accumulators for the requested algorithms
	const workers = createWorkers(opts, wantVpdq),
		tmkAcc = wantTmk ? new tmk() : null,
		vpdqAcc = wantVpdq ? new vpdq(fps, typeof opts.vpdq === "object" ? opts.vpdq : undefined) : null;

	// return promise to process the video
	return new Promise<VideoResult>((resolve, reject) => {
		let frameCount = 0,
			framesTotal = 0,
			activeCount = 0,
			extractDone = false;

		// freeSlots tracks idle worker indices; queue holds frames awaiting dispatch
		const freeSlots = workers.map((_, i) => i),
			queue: Array<{bitmap: ImageBitmap; frameIndex: number}> = [],
			cache = new Map<number, {pdqf: Float32Array; quality: number | null}>();

		const tryNext = () => {

			// All stages empty — shut down workers and resolve
			if (extractDone && activeCount === 0 && queue.length === 0 && cache.size === 0) {
				for (const worker of workers) {
					worker.terminate();
				}
				const out: VideoResult = {};
				if (wantTmk) {
					out.tmk = tmkAcc!.compile();
				}
				if (wantVpdq) {
					out.vpdq = vpdqAcc!.compile();
				}
				resolve(out);

			// Dispatch queued frames to any idle workers
			} else {
				while (queue.length > 0 && freeSlots.length > 0) {
					const frame = queue.shift()!,
						slotIdx = freeSlots.pop()!;
					activeCount++;
					dispatchToWorker(workers[slotIdx], frame).then(({pdqf, quality}) => {
						cache.set(frame.frameIndex, {pdqf, quality});

						// Accumulate completed frames in strict index order for deterministic output
						while (cache.has(frameCount)) {
							const {pdqf, quality} = cache.get(frameCount)!;
							cache.delete(frameCount);
							if (wantTmk) {
								tmkAcc!.addFrame(pdqf, frameCount);
							}
							vpdqAcc?.addFrame(pdqf, quality!, frameCount);
							frameCount++;
							opts.onprogress?.(frameCount, framesTotal);
						}
						activeCount--;
						freeSlots.push(slotIdx);
						tryNext();
					}).catch(reject);
				}
			}
		};

		// Feed extracted frames into the queue and signal completion when done
		extractVideoFrames(source, fps, frame => {
			queue.push(frame);
			tryNext();
		}, total => {
			framesTotal = total;
		}).then(() => {
			extractDone = true;
			tryNext();
		}).catch(reject);
	});
}
