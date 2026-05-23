import { a as e, i as t, n, r, t as i } from "./quality.js";
//#region src/pdqf.ts
var a = self.postMessage.bind(self), o, s, c, l = null, u = null;
self.onmessage = ({ data: d }) => {
	if (d.type === "init") ({passes: o, block: s, computeQuality: c} = d);
	else {
		let { bitmap: f, frameIndex: p } = d, m = Math.min(1, 512 / Math.min(f.width, f.height)), h = Math.round(f.width * m), g = Math.round(f.height * m);
		(!l || l.width !== h || l.height !== g) && (l = new OffscreenCanvas(h, g), u = l.getContext("2d", { willReadFrequently: !0 }), u.imageSmoothingEnabled = !1), u.drawImage(f, 0, 0, h, g), f.close();
		let { data: _ } = u.getImageData(0, 0, h, g), v = e(t(_), h, g, o, s), y = r(h, g, s, v), b = n(y);
		a({
			frameIndex: p,
			pdqf: b.buffer,
			quality: c ? i(s, y) : null
		}, [b.buffer]);
	}
};
//#endregion

//# sourceMappingURL=pdqf.js.map