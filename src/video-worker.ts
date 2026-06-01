import {computePdqf} from "./pdqf";
import {computeDct} from "./hash-dct";
import vpdqobj, {getConfig as vpdqConfig} from "./vpdq";

let rescale: number,
	passes: number,
	fps: number,
	block: number,
	tmk: boolean,
	vpdq: boolean;

self.onmessage = ({data}: MessageEvent) => {

	// initialise
	if (data.type === "init") {
		({rescale, passes, block, fps, tmk, vpdq} = data);

	// process frame
	} else {
		const vpdqconf = vpdqConfig(typeof vpdq === "object" ? vpdq : {}),
			computeQuality = vpdq && vpdqobj.includeFrame(fps, vpdqconf.fps, data.frameIndex),
			{rawDct, quality} = computePdqf(data.videoFrame, rescale, passes, block, computeQuality),
			pdqHash = vpdq ? computeDct(rawDct) : null,
			transfers: Transferable[] = [];

		if (pdqHash) {
			transfers.push(pdqHash.buffer);
		}
		if (tmk) {
			transfers.push(rawDct.buffer);
		}

		(self as unknown as Worker).postMessage(
			{
				vpdq: pdqHash ? {hash: pdqHash.buffer, quality} : null,
				rawDct: tmk ? rawDct.buffer : null,
			},
			transfers
		);
	}
};
