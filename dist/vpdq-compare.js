import e from "./distance.js";
import { n as t } from "./vpdq.js";
//#region src/vpdq-compare.ts
function n(e, t) {
	return JSON.parse(e).map((e) => {
		let [t, n] = e.split(",");
		return {
			hex: t,
			quality: parseFloat(n)
		};
	}).filter((e) => e.quality >= t);
}
function r(t, n, r) {
	let i = 0;
	for (let a of t) for (let t of n) {
		let n = e(a.hex, t.hex);
		if (n !== !1 && n < r) {
			i++;
			break;
		}
	}
	return i;
}
function i(e, i, a) {
	let o = t(a), s = n(e, o.qualityTolerance), c = n(i, o.qualityTolerance), l = {
		queryMatchPercent: 0,
		comparedMatchPercent: 0
	};
	if (s.length > 0 && c.length > 0) {
		let e = r(s, c, o.distanceTolerance), t = r(c, s, o.distanceTolerance);
		l = {
			queryMatchPercent: e * 100 / s.length,
			comparedMatchPercent: t * 100 / c.length
		};
	}
	return l;
}
function a(e, n, r) {
	let a = t(r), o = i(e, n, r);
	return {
		isMatch: o.comparedMatchPercent >= a.queryMatchThreshold && o.queryMatchPercent >= a.targetMatchThreshold,
		result: o
	};
}
//#endregion
export { i as compare, a as isMatch };

//# sourceMappingURL=vpdq-compare.js.map