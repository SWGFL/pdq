import { n as e, t } from "./hash-dct.js";
import n from "./distance.js";
//#region src/vpdq.ts
var r = class {
	constructor(e, t, n, r) {
		this.pdqHash = e, this.frameNumber = t, this.quality = n, this.timeStamp = r;
	}
	get hex() {
		return e(this.pdqHash);
	}
}, i = {
	fps: 1,
	pruneDistance: 0,
	qualityTolerance: 50,
	distanceTolerance: 31,
	queryMatchThreshold: 80,
	targetMatchThreshold: 0
};
function a(e) {
	return {
		...i,
		...e
	};
}
var o = class {
	constructor(e, t) {
		this.opts = a(t), this.fps = e, this.interval = Math.max(1, Math.round(e / this.opts.fps)), this.features = [];
	}
	addFrame(e, i, a) {
		if (a % this.interval === 0 && i >= this.opts.qualityTolerance) {
			let o = t(e), s = this.opts.pruneDistance;
			(s === 0 || this.features.length === 0 || n(o, this.features[this.features.length - 1].pdqHash) > s) && this.features.push(new r(o, a, i, a / this.fps));
		}
	}
	compile() {
		return this.features;
	}
};
//#endregion
export { a as n, o as t };

//# sourceMappingURL=vpdq.js.map