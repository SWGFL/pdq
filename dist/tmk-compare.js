import { n as e, t } from "./tmk.js";
//#region src/tmk-compare.ts
var n = t[0] + 2 * Array.from(t.subarray(1)).reduce((e, t) => e + t, 0);
function r(e, t, n, r) {
	let i = 0;
	for (let a = 0; a < 256; a++) i += e[t + a] * n[r + a];
	return i;
}
function i(t, i) {
	let a = r(t.pureAverage, 0, i.pureAverage, 0), o = 0, s = 0;
	for (let e = 0; e < 256; e++) o += t.pureAverage[e] * t.pureAverage[e], s += i.pureAverage[e] * i.pureAverage[e];
	let c = o > 0 && s > 0 ? a / Math.sqrt(o * s) : 0, l = new Float32Array(128), u = new Float32Array(128), d = new Float32Array(128), f = new Float32Array(128);
	for (let e = 0; e < 4; e++) for (let n = 0; n < 32; n++) {
		let a = e * 32 + n, o = a * 256;
		l[a] = r(t.cosFeatures, o, i.cosFeatures, o), u[a] = r(t.sinFeatures, o, i.sinFeatures, o), d[a] = r(t.sinFeatures, o, i.cosFeatures, o), f[a] = r(t.cosFeatures, o, i.sinFeatures, o);
	}
	let p = -Infinity;
	for (let t = 0; t < 4; t++) {
		let n = e[t], r = new Float32Array(32), i = new Float32Array(32);
		for (let e = 1; e < 32; e++) {
			let t = 2 * Math.PI * e / n;
			r[e] = Math.cos(t), i[e] = Math.sin(t);
		}
		let a = new Float32Array(32).fill(1), o = new Float32Array(32);
		for (let e = 0; e < n; e++) {
			let e = l[t * 32];
			for (let n = 1; n < 32; n++) {
				let r = t * 32 + n;
				e += a[n] * (l[r] + u[r]) + o[n] * (d[r] - f[r]);
			}
			e > p && (p = e);
			for (let e = 1; e < 32; e++) {
				let t = a[e] * r[e] - o[e] * i[e], n = a[e] * i[e] + o[e] * r[e];
				a[e] = t, o[e] = n;
			}
		}
		p < -Infinity && (p = 0);
	}
	return {
		level1: c,
		level2: p / n
	};
}
//#endregion
export { i as default };

//# sourceMappingURL=tmk-compare.js.map