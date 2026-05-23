import e from "./distance.js";
import { n as t } from "./vpdq.js";
//#region src/vpdq-compare.ts
var n = class {
	constructor(e = 0, t = 0) {
		this.queryMatchPercent = e, this.comparedMatchPercent = t;
	}
};
function r(e, t) {
	return e.filter((e) => e.quality >= t);
}
function i(t, n, r) {
	let i = 0;
	for (let a of t) for (let t of n) if (e(a.pdqHash, t.pdqHash) < r) {
		i++;
		break;
	}
	return i;
}
function a(e, t, a) {
	let o = r(e, a.qualityTolerance), s = r(t, a.qualityTolerance), c = new n(0, 0);
	if (o.length > 0 && s.length > 0) {
		let e = i(o, s, a.distanceTolerance), t = i(s, o, a.distanceTolerance);
		c = new n(e * 100 / o.length, t * 100 / s.length);
	}
	return c;
}
function o(e, n, r) {
	return a(e, n, t(r));
}
function s(e, n, r) {
	let i = t(r), o = a(e, n, i);
	return {
		isMatch: o.comparedMatchPercent >= i.queryMatchThreshold && o.queryMatchPercent >= i.targetMatchThreshold,
		result: o
	};
}
//#endregion
export { n as VpdqMatchResult, o as compare, s as isMatch };

//# sourceMappingURL=vpdq-compare.js.map