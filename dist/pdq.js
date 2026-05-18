//#region src/jarosz-filter.ts
function e(e, t, n, r, i, a, o) {
	let s = Math.floor((o + 2) / 2), c = s - 1, l = o - s + 1, u = i - o, d = s - 1, f = n, p = n, m = r, h = 0, g = 0;
	for (let t = 0; t < c; t++) h += e[p], g++, p += a;
	for (let n = 0; n < l; n++) h += e[p], g++, t[m] = h / g, p += a, m += a;
	for (let n = 0; n < u; n++) h += e[p], h -= e[f], t[m] = h / g, f += a, p += a, m += a;
	for (let n = 0; n < d; n++) h -= e[f], g--, t[m] = h / g, f += a, m += a;
}
function t(t, n, r, i, a) {
	for (let o = 0; o < i; o++) {
		let i = o * r;
		e(t, n, i, i, r, 1, a);
	}
}
function n(t, n, r, i, a) {
	for (let o = 0; o < r; o++) e(t, n, o, o, i, r, a);
}
var r = (e, r, i, a, o) => {
	let s = Array(e.length).fill(0), c = Math.floor((r + 2 * o - 1) / (2 * o)), l = Math.floor((i + 2 * o - 1) / (2 * o));
	for (let o = 0; o < a; o++) t(e, s, r, i, c), n(s, e, r, i, l);
	return e;
}, i = (e, t, n) => {
	let r = document.createElement("canvas"), i = r.getContext("2d"), a = new ImageData(e, t), o = a.data;
	r.width = e, r.height = t;
	for (let e = 0; e < n.length; e++) o[e * 4] = n[e], o[e * 4 + 1] = n[e], o[e * 4 + 2] = n[e], o[e * 4 + 3] = 255;
	return i.putImageData(a, 0, 0), document.body.appendChild(r), r;
};
function a(e, t = 1) {
	let n = [];
	for (let t = e.length - 1; t >= 0; t--) for (let r = 7; r >= 0; r--) n.push(e[t] >> r & 1 ? 0 : 255);
	let r = Math.sqrt(n.length), a = [];
	if (t > 1) for (let e = 0; e < r; e++) for (let i = 0; i < t; i++) for (let i = 0; i < r; i++) for (let o = 0; o < t; o++) a.push(n[e * r + i]);
	return i(r * t, r * t, a || n);
}
//#endregion
//#region src/matrix.ts
var o = {
	rotate: (e) => {
		let t = e.length, n = Math.sqrt(t), r = Array(t);
		for (let t = 0; t < n; t++) for (let i = 0; i < n; i++) r[t * n + i] = e[(n - i - 1) * n + t];
		return r;
	},
	flip: (e) => {
		let t = e.length, n = Math.sqrt(t), r = [];
		for (let t = 0; t < n; t++) r = r.concat(e.slice(t * n, (t + 1) * n).reverse());
		return r;
	}
}, s = {
	computeDct: (e) => {
		let t = [...e].sort((e, t) => e - t)[127], n = new Uint8Array(32);
		return e.forEach((e, r) => {
			n[Math.floor(r / 8)] |= (e > t) << r % 8;
		}), n;
	},
	toHex: (e) => Array.from(e, (e) => ("0" + (e & 255).toString(16)).slice(-2)).reverse().join("")
}, c = {
	r: .299,
	g: .587,
	b: .114
}, l = (e) => {
	let t = Array(e.length / 4);
	for (let n = 0; n < e.length; n += 4) t[n / 4] = c.r * e[n] + c.g * e[n + 1] + c.b * e[n + 2];
	return t;
}, u = (e, t, n, r) => {
	let i = new Float32Array(n * n);
	for (let a = 0; a < n; a++) {
		let o = Math.floor((a + .5) * t / n);
		for (let t = 0; t < n; t++) {
			let s = Math.floor((t + .5) * e / n);
			i[a * n + t] = r[o * e + s];
		}
	}
	return i;
}, d = (e) => {
	let t = Array(1024).fill(0), n = Array(256).fill(0), r = Array(1024).fill(0), i = Math.sqrt(2 / 64);
	for (let e = 0; e < 16; e++) for (let n = 0; n < 64; n++) t[e * 64 + n] = i * Math.cos(Math.PI / 2 / 64 * (e + 1) * (2 * n + 1));
	for (let n = 0; n < 16; n++) for (let i = 0; i < 64; i++) {
		let a = 0;
		for (let r = 0; r < 64; r++) a += t[n * 64 + r] * e[r * 64 + i];
		r[n * 64 + i] = a;
	}
	for (let e = 0; e < 16; e++) for (let i = 0; i < 16; i++) {
		let a = 0;
		for (let n = 0; n < 64; n++) a += r[e * 64 + n] * t[i * 64 + n];
		n[e * 16 + i] = a;
	}
	return n;
}, f = (e, t) => {
	let n = 0;
	for (let r = 0; r < e - 1; r++) for (let i = 0; i < e; i++) {
		let a = t[r * e + i], o = t[(r + 1) * e + i], s = Math.trunc((a - o) * 100 / 255);
		n += Math.abs(s);
	}
	for (let r = 0; r < e; r++) for (let i = 0; i < e - 1; i++) {
		let a = t[r * e + i], o = t[r * e + i + 1], s = Math.trunc((a - o) * 100 / 255);
		n += Math.abs(s);
	}
	return Math.min(Math.trunc(n / 90), 100);
};
//#endregion
//#region src/distance.ts
function p(e) {
	return e.split("").map((e) => parseInt(e, 16).toString(2).padStart(4, "0")).join("").split("");
}
var m = (e, t) => {
	if (e.length === t.length) {
		let n = p(e), r = p(t);
		return n.reduce((e, t, n) => e + (t === r[n] ? 0 : 1), 0);
	}
	return !1;
}, h = {
	debug: !1,
	passes: 2,
	block: 64,
	transform: !1,
	hashscale: 4
};
function g(e) {
	return {
		...h,
		...e
	};
}
var _ = (e, t, n, c) => {
	let p = g(c), m = p.block, h = p.debug, _;
	return Promise.resolve(e).then((e) => {
		let r = l(e);
		return h && i(t, n, r), r;
	}).then((e) => {
		let a = r(e, t, n, p.passes, m);
		return h && i(t, n, a), a;
	}).then((e) => {
		let r = u(t, n, m, e);
		return h && i(m, m, r), r;
	}).then((e) => (_ = f(m, e), e)).then((e) => {
		let t = d(e);
		return h && console.log(t), t;
	}).then((e) => {
		let t = { original: e };
		return p.transform && (t.rot90 = o.rotate(e), t.rot180 = o.rotate(t.rot90), t.rot270 = o.rotate(t.rot180), t.flip = o.flip(e), t.fliprot90 = o.rotate(t.flip), t.fliprot180 = o.rotate(t.fliprot90), t.fliprot270 = o.rotate(t.fliprot180)), h && console.log(t), t;
	}).then((e) => {
		let t = [];
		for (let n in e) {
			let r = s.computeDct(e[n]), i = s.toHex(r);
			t.push(i), h && a(r, p.hashscale);
		}
		return {
			type: "pdq",
			hash: p.transform ? t : t[0],
			quality: _
		};
	});
};
function v(e, t) {
	let n = g(t), r = n.debug, i = e.width, a = e.height;
	return new Promise((t) => {
		if (r) {
			if (e instanceof OffscreenCanvas) {
				let t = document.createElement("canvas");
				t.width = e.width, t.height = e.height, t.getContext("2d")?.drawImage(e, 0, 0), e = t;
			}
			document.body.appendChild(e);
		}
		t(e.getContext("2d").getImageData(0, 0, i, a).data);
	}).then((e) => _(e, i, a, n));
}
//#endregion
export { v as default, m as distance, _ as pdqRaw };

//# sourceMappingURL=pdq.js.map