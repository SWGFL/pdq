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
	let s = e instanceof Uint8ClampedArray ? new Float32Array(e) : e, c = new Float32Array(s.length), l = Math.floor((r + 2 * o - 1) / (2 * o)), u = Math.floor((i + 2 * o - 1) / (2 * o));
	for (let e = 0; e < a; e++) t(s, c, r, i, l), n(c, s, r, i, u);
	return s;
}, i = {
	r: .299,
	g: .587,
	b: .114
}, a = (e) => {
	let t = new Uint8ClampedArray(e.length / 4);
	for (let n = 0; n < e.length; n += 4) t[n / 4] = i.r * e[n] + i.g * e[n + 1] + i.b * e[n + 2];
	return t;
};
//#endregion
//#region src/rescale.ts
function o(e, t, n, r) {
	let i = r instanceof Uint8ClampedArray ? new Uint8ClampedArray(n * n) : r instanceof Float32Array ? new Float32Array(n * n) : Array(n * n);
	for (let a = 0; a < n; a++) {
		let o = Math.floor((a + .5) * t / n);
		for (let t = 0; t < n; t++) {
			let s = Math.floor((t + .5) * e / n);
			i[a * n + t] = r[o * e + s];
		}
	}
	return i;
}
//#endregion
//#region src/dct.ts
var s = (e) => {
	let t = new Float64Array(1024), n = new Float32Array(256), r = new Float32Array(1024), i = Math.sqrt(2 / 64);
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
}, c = (e, t) => {
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
export { r as a, a as i, s as n, o as r, c as t };

//# sourceMappingURL=quality.js.map