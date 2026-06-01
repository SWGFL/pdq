//#region src/distance.ts
function e(e) {
	return e -= e >> 1 & 21845, e = (e & 13107) + (e >> 2 & 13107), e = e + (e >> 4) & 3855, e + (e >> 8) & 31;
}
function t(e) {
	if (e instanceof Uint16Array) return e;
	if (e.length % 4 != 0) return !1;
	let t = new Uint16Array(e.length / 4);
	for (let n = 0; n < t.length; n++) t[n] = parseInt(e.substring(n * 4, n * 4 + 4), 16);
	return t;
}
function n(n, r) {
	let i = t(n), a = t(r), o = !1;
	if (i !== !1 && a !== !1 && i.length === a.length) {
		let t = 0;
		for (let n = 0; n < i.length; n++) t += e(i[n] ^ a[n]);
		o = t;
	}
	return o;
}
//#endregion
export { n as default };

//# sourceMappingURL=distance.js.map