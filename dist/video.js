import { r as e } from "./tmk.js";
import { t } from "./vpdq.js";
//#region src/frame.ts
var n = "./mp4box.all.js";
function r(e, t, r, i) {
	return new Promise((a, o) => {
		import(new URL(n, import.meta.url).href).then(({ createFile: n, DataStream: s }) => {
			let c = 0, l = 0, u = 0, d = 0, f = -1, p = 0, m = !1, h = null, g = n(), _ = () => {
				m && p === 0 && a();
			};
			g.onReady = (e) => {
				let n = e.tracks.find((e) => e.video);
				if (n) {
					c = n.timescale, l = n.nb_samples, i?.(Math.round(e.duration / e.timescale * t));
					let a, u = g.getTrackById(n.id)?.mdia?.minf?.stbl?.stsd?.entries?.[0], m = u?.avcC ?? u?.hvcC ?? u?.vpcC ?? u?.av1C;
					if (m) {
						let e = new s(void 0, 0, s.BIG_ENDIAN);
						m.write(e), a = new Uint8Array(e.buffer.slice(8));
					}
					h = new VideoDecoder({
						output: (e) => {
							let n = Math.round(e.timestamp / 1e6 * t);
							n > f ? (f = n, p++, createImageBitmap(e).then((t) => {
								e.close(), r({
									bitmap: t,
									frameIndex: d++
								}), p--, _();
							}).catch((t) => {
								e.close(), o(t);
							})) : e.close();
						},
						error: o
					}), h.configure({
						codec: n.codec,
						codedWidth: n.video.width,
						codedHeight: n.video.height,
						...a ? { description: a } : {}
					}), g.setExtractionOptions(n.id, null, { nbSamples: l }), g.start();
				} else o(/* @__PURE__ */ Error("No video track found"));
			}, g.onSamples = (e, t, n) => {
				for (let e of n) h.decode(new EncodedVideoChunk({
					type: e.is_sync ? "key" : "delta",
					timestamp: e.cts * 1e6 / c,
					duration: e.duration * 1e6 / c,
					data: e.data
				})), u++;
				u >= l && h.flush().then(() => {
					m = !0, _();
				});
			};
			let v = e.slice(0);
			v.fileStart = 0, g.appendBuffer(v), g.flush();
		}).catch(o);
	});
}
//#endregion
//#region src/video.ts
var i = {
	passes: 2,
	block: 64,
	concurrency: navigator.hardwareConcurrency || 4,
	tmk: !0,
	vpdq: !0,
	worker: "pdqf.js"
};
function a(e) {
	return {
		...i,
		...e
	};
}
function o(e, t) {
	let n = new URL(e.worker, import.meta.url);
	return Array.from({ length: e.concurrency }, () => {
		let r = new Worker(n, { type: "module" });
		return r.postMessage({
			type: "init",
			passes: e.passes,
			block: e.block,
			computeQuality: t
		}), r;
	});
}
function s(e, t) {
	return new Promise((n) => {
		let r = ({ data: t }) => {
			e.removeEventListener("message", r), n({
				pdqf: new Float32Array(t.pdqf),
				quality: t.quality
			});
		};
		e.addEventListener("message", r), e.postMessage(t, [t.bitmap]);
	});
}
function c(n, i = {}) {
	let c = a(i), l = c.tmk !== !1, u = c.vpdq !== !1, d = c.fps ?? (l ? 15 : 1), f = o(c, u), p = l ? new e() : null, m = u ? new t(d, typeof c.vpdq == "object" ? c.vpdq : void 0) : null;
	return new Promise((e, t) => {
		let i = 0, a = 0, o = 0, h = !1, g = f.map((e, t) => t), _ = [], v = /* @__PURE__ */ new Map(), y = () => {
			if (h && o === 0 && _.length === 0 && v.size === 0) {
				for (let e of f) e.terminate();
				let t = {};
				l && (t.tmk = p.compile()), u && (t.vpdq = m.compile()), e(t);
			} else for (; _.length > 0 && g.length > 0;) {
				let e = _.shift(), n = g.pop();
				o++, s(f[n], e).then(({ pdqf: t, quality: r }) => {
					for (v.set(e.frameIndex, {
						pdqf: t,
						quality: r
					}); v.has(i);) {
						let { pdqf: e, quality: t } = v.get(i);
						v.delete(i), l && p.addFrame(e, i), m?.addFrame(e, t, i), i++, c.onprogress?.(i, a);
					}
					o--, g.push(n), y();
				}).catch(t);
			}
		};
		r(n, d, (e) => {
			_.push(e), y();
		}, (e) => {
			a = e;
		}).then(() => {
			h = !0, y();
		}).catch(t);
	});
}
//#endregion
export { c as default, t as vpdq };

//# sourceMappingURL=video.js.map