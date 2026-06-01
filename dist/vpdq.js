import { n as e } from "./hash-dct.js";
import t from "./distance.js";
//#region src/vpdq.ts
var n = class {
	constructor(e, t, n, r) {
		this.pdqHash = e, this.frameNumber = t, this.quality = n, this.timeStamp = r;
	}
	get hex() {
		return e(this.pdqHash);
	}
}, r = {
	fps: 1,
	pruneDistance: 0,
	qualityTolerance: 50,
	distanceTolerance: 31,
	queryMatchThreshold: 80,
	targetMatchThreshold: 0
};
function i(e) {
	return {
		...r,
		...e
	};
}
var a = class {
	constructor(e, t) {
		this.opts = i(t), this.fps = this.opts.fps, this.interval = Math.max(1, Math.round(e / this.opts.fps)), this.features = [];
	}
	addFrame(e, r, i) {
		if (r >= this.opts.qualityTolerance) {
			let a = this.opts.pruneDistance;
			(a === 0 || this.features.length === 0 || t(e, this.features[this.features.length - 1].pdqHash) > a) && this.features.push(new n(e, i, r, i / this.fps));
		}
	}
	static includeFrame(e, t) {
		return e > 0 && t % e === 0;
	}
	compile() {
		return JSON.stringify(this.features.map((e) => `${e.hex},${e.quality},${e.timeStamp.toFixed(3)}`));
	}
};
//#endregion
export { i as n, a as t };

//# sourceMappingURL=vpdq.js.map