import { a as e, i as t, n, r, t as i } from "./quality.js";
import { n as a, t as o } from "./hash-dct.js";
//#region src/render.ts
var s = (e, t, n) => {
	let r = document.createElement("canvas"), i = r.getContext("2d"), a = new ImageData(e, t), o = a.data;
	r.width = e, r.height = t;
	for (let e = 0; e < n.length; e++) o[e * 4] = n[e], o[e * 4 + 1] = n[e], o[e * 4 + 2] = n[e], o[e * 4 + 3] = 255;
	return i.putImageData(a, 0, 0), document.body.appendChild(r), r;
};
function c(e, t = 1) {
	let n = e instanceof Uint16Array ? new Uint8Array(e.buffer) : e, r = [];
	for (let e = n.length - 1; e >= 0; e--) for (let t = 7; t >= 0; t--) r.push(n[e] >> t & 1 ? 255 : 0);
	let i = Math.sqrt(r.length), a = [];
	if (t > 1) for (let e = 0; e < i; e++) for (let n = 0; n < t; n++) for (let n = 0; n < i; n++) for (let o = 0; o < t; o++) a.push(r[e * i + n]);
	return s(i * t, i * t, a || r);
}
//#endregion
//#region src/matrix.ts
var l = {
	rotate: (e) => {
		let t = e.length, n = Math.sqrt(t), r = new Float32Array(t);
		for (let t = 0; t < n; t++) for (let i = 0; i < n; i++) r[t * n + i] = e[(n - i - 1) * n + t];
		return r;
	},
	flip: (e) => {
		let t = e.length, n = Math.sqrt(t), r = new Float32Array(t);
		for (let t = 0; t < n; t++) for (let i = 0; i < n; i++) r[t * n + i] = e[t * n + (n - 1 - i)];
		return r;
	}
}, u = {
	debug: !1,
	passes: 2,
	block: 64,
	transform: !1,
	hashscale: 4
};
function d(e) {
	return {
		...u,
		...e
	};
}
var f = (u, f, p, m) => {
	let h = d(m), g = h.block, _ = h.debug, v;
	return Promise.resolve(u).then((e) => {
		let n = t(e);
		return _ && s(f, p, n), n;
	}).then((t) => {
		let n = e(t, f, p, h.passes, g);
		return _ && s(f, p, n), n;
	}).then((e) => {
		let t = r(f, p, g, e);
		return _ && s(g, g, t), t;
	}).then((e) => (v = i(g, e), e)).then((e) => {
		let t = n(e);
		return _ && console.log(t), t;
	}).then((e) => {
		let t = { original: e };
		return h.transform && (t.rot90 = l.rotate(e), t.rot180 = l.rotate(t.rot90), t.rot270 = l.rotate(t.rot180), t.flip = l.flip(e), t.fliprot90 = l.rotate(t.flip), t.fliprot180 = l.rotate(t.fliprot90), t.fliprot270 = l.rotate(t.fliprot180)), _ && console.log(t), t;
	}).then((e) => {
		let t = [];
		for (let n in e) {
			let r = o(e[n]), i = a(r);
			t.push(i), _ && c(r, h.hashscale);
		}
		return {
			type: "pdq",
			hash: h.transform ? t : t[0],
			quality: v
		};
	});
};
function p(e, t) {
	let n = d(t), r = n.debug, i = e.width, a = e.height;
	return new Promise((t) => {
		if (r) {
			if (e instanceof OffscreenCanvas) {
				let t = document.createElement("canvas");
				t.width = e.width, t.height = e.height, t.getContext("2d")?.drawImage(e, 0, 0), e = t;
			}
			document.body.appendChild(e);
		}
		t(e.getContext("2d").getImageData(0, 0, i, a).data);
	}).then((e) => f(e, i, a, n));
}
//#endregion
export { p as default, f as pdqRaw };

//# sourceMappingURL=pdq.js.map