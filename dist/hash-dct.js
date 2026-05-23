//#region src/hash-dct.ts
function e(e) {
	let t = [...e].sort((e, t) => e - t)[127], n = new Uint16Array(16);
	for (let r = 0; r < 256; r++) e[r] > t && (n[r >> 4] |= 1 << (r & 15));
	return n;
}
function t(e) {
	let t = "";
	for (let n = e.length - 1; n >= 0; n--) t += e[n].toString(16).padStart(4, "0");
	return t;
}
//#endregion
export { t as n, e as t };

//# sourceMappingURL=hash-dct.js.map