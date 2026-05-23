//#region src/tmk.ts
var e = new Float32Array([
	.0708041893112,
	.13937789309,
	.132897260304,
	.122765735552,
	.109878684888,
	.09529606433,
	.0800986647852,
	.0652590650356,
	.0515478238322,
	.0394851531195,
	.0293374252025,
	.0211492623679,
	.0147973073245,
	.0100512818746,
	.0066306408014,
	.00424947117334,
	.0026467615764,
	.00160270959695,
	.000943882629639,
	.000540841638603,
	.000301633183798,
	.000163800158855,
	866454753015e-16,
	446626303151e-16,
	224429442235e-16,
	109982139799e-16,
	525823487999e-17,
	245358229988e-17,
	111781474895e-17,
	4.97406489221e-7,
	2.16265487234e-7,
	9.19087006565e-8
]), t = [
	2731,
	4391,
	9767,
	14653
];
function n(e, t) {
	let n = 0;
	for (let r = 0; r < 256; r++) n += e[t + r] * e[t + r];
	if (n > 0) {
		let r = 1 / Math.sqrt(n);
		for (let n = 0; n < 256; n++) e[t + n] *= r;
	}
}
var r = class {
	constructor() {
		this.pureAverage = new Float32Array(256), this.cosFeatures = new Float32Array(128 * 256), this.sinFeatures = new Float32Array(128 * 256), this.frameCount = 0;
	}
	addFrame(e, n) {
		let r = 0;
		for (let t = 0; t < 256; t++) r += e[t] * e[t];
		let i = r > 0 ? 1 / Math.sqrt(r) : 0;
		for (let t = 0; t < 256; t++) this.pureAverage[t] += e[t] * i;
		for (let r = 0; r < 4; r++) {
			let a = t[r], o = r * 32 * 256;
			for (let t = 0; t < 256; t++) this.cosFeatures[o + t] += e[t] * i;
			let s = 2 * Math.PI * n / a, c = Math.cos(s), l = Math.sin(s), u = 1, d = 0, f = c, p = l;
			for (let t = 1; t < 32; t++) {
				let n = (r * 32 + t) * 256;
				for (let t = 0; t < 256; t++) this.cosFeatures[n + t] += e[t] * i * f, this.sinFeatures[n + t] += e[t] * i * p;
				let a = 2 * c * f - u, o = 2 * c * p - d;
				u = f, d = p, f = a, p = o;
			}
		}
		this.frameCount++;
	}
	compile() {
		let t = 1 / this.frameCount;
		for (let e = 0; e < 256; e++) this.pureAverage[e] *= t;
		for (let t = 0; t < 4; t++) for (let r = 0; r < 32; r++) {
			let i = (t * 32 + r) * 256, a = Math.sqrt(e[r]);
			n(this.cosFeatures, i);
			for (let e = 0; e < 256; e++) this.cosFeatures[i + e] *= a;
			if (r > 0) {
				n(this.sinFeatures, i);
				for (let e = 0; e < 256; e++) this.sinFeatures[i + e] *= a;
			}
		}
		return this;
	}
};
//#endregion
export { t as n, r, e as t };

//# sourceMappingURL=tmk.js.map