import { a as e, i as t, n, r, t as i } from "./quality.js";
import { t as a } from "./hash-dct.js";
import { t as o } from "./vpdq.js";
//#region src/pdqf.ts
var s = null, c = null;
function l(a, o, l, u, d) {
	let f = Math.min(1, o / Math.max(a.displayWidth, a.displayHeight)), p = Math.round(a.displayWidth * f), m = Math.round(a.displayHeight * f);
	(s === null || s.width !== p || s.height !== m) && (s = new OffscreenCanvas(p, m), c = s.getContext("2d", { willReadFrequently: !0 }), c.imageSmoothingEnabled = !1), c.drawImage(a, 0, 0, p, m), a.close();
	let { data: h } = c.getImageData(0, 0, p, m), g = r(p, m, u, e(t(h), p, m, l, u));
	return {
		rawDct: n(g),
		quality: d ? i(u, g) : null
	};
}
//#endregion
//#region src/video-worker.ts
var u, d, f, p, m, h;
self.onmessage = ({ data: e }) => {
	if (e.type === "init") ({rescale: u, passes: d, block: f, doTmk: p, doVpdq: m, vpdqInterval: h} = e);
	else {
		let { videoFrame: t, frameIndex: n } = e, r = m && o.includeFrame(h, n), { rawDct: i, quality: s } = l(t, u, d, f, r), c = m ? a(i) : null, g = [];
		c && g.push(c.buffer), p && g.push(i.buffer), self.postMessage({
			vpdq: c ? {
				hash: c.buffer,
				quality: s
			} : null,
			rawDct: p ? i.buffer : null
		}, g);
	}
};
//#endregion

//# sourceMappingURL=video-worker.js.map