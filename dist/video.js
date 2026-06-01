import { r as e } from "./tmk.js";
import { t } from "./vpdq.js";
//#region src/frame.ts
var n = "./mp4box.all.js";
function r(e, t, r, i) {
	return new Promise((a, o) => {
		import(new URL(n, import.meta.url).href).then(({ createFile: n, DataStream: s }) => {
			let c = 0, l = 0, u = 0, d = 0, f = -1, p = 0, m = null, h = n();
			h.onReady = (e) => {
				let n = e.tracks.find((e) => e.video);
				if (n) {
					c = n.timescale, l = n.nb_samples, i?.(Math.round(e.duration / e.timescale * t));
					let u, g = h.getTrackById(n.id)?.mdia?.minf?.stbl?.stsd?.entries?.[0], _ = g?.avcC ?? g?.hvcC ?? g?.vpcC ?? g?.av1C;
					if (_) {
						let e = new s(void 0, 0, s.BIG_ENDIAN);
						_.write(e), u = new Uint8Array(e.buffer.slice(8));
					}
					m = new VideoDecoder({
						output: (e) => {
							let n = Math.round(e.timestamp / 1e6 * t);
							n > f ? (f = n, r({
								videoFrame: e,
								frameIndex: d++
							})) : e.close(), ++p >= l && a();
						},
						error: o
					}), m.configure({
						codec: n.codec,
						codedWidth: n.video.width,
						codedHeight: n.video.height,
						...u ? { description: u } : {}
					}), h.setExtractionOptions(n.id, null, { nbSamples: l }), h.start();
				} else o(/* @__PURE__ */ Error("No video track found"));
			}, h.onSamples = (e, t, n) => {
				for (let e of n) m.decode(new EncodedVideoChunk({
					type: e.is_sync ? "key" : "delta",
					timestamp: e.cts * 1e6 / c,
					duration: e.duration * 1e6 / c,
					data: e.data
				})), u++;
				u >= l && m.flush().then(a);
			};
			let g = e.slice(0);
			g.fileStart = 0, h.appendBuffer(g), h.flush();
		}).catch(o);
	});
}
//#endregion
//#region src/video.ts
var i = {
	passes: 2,
	block: 64,
	rescale: 512,
	concurrency: navigator.hardwareConcurrency || 4,
	tmk: !0,
	vpdq: !0,
	worker: "video-worker.js"
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
			rescale: e.rescale,
			passes: e.passes,
			block: e.block,
			doTmk: e.tmk !== !1,
			doVpdq: e.vpdq !== !1,
			vpdqInterval: t
		}), r;
	});
}
function s(e, t) {
	return new Promise((n) => {
		let r = ({ data: t }) => {
			e.removeEventListener("message", r), n({
				vpdq: t.vpdq ? {
					hash: new Uint16Array(t.vpdq.hash),
					quality: t.vpdq.quality
				} : null,
				rawDct: t.rawDct ? new Float32Array(t.rawDct) : null
			});
		};
		e.addEventListener("message", r), e.postMessage(t, [t.videoFrame]);
	});
}
function c(n, i = {}) {
	let c = a(i), l = c.fps ?? (c.tmk === !1 ? 1 : 15), u = c.vpdq === !1 ? null : new t(l, typeof c.vpdq == "object" ? c.vpdq : void 0), d = c.tmk === !1 ? null : new e(), f = o(c, u?.interval ?? 0);
	return new Promise((e, t) => {
		let i = 0, a = 0, o = 0, p = !1, m = !1, h = f.map((e, t) => t), g = [], _ = /* @__PURE__ */ new Map(), v = () => {
			if (!m && p && i >= o) {
				m = !0;
				for (let e of f) e.terminate();
				let t = {};
				d !== null && (t.tmk = d.compile()), u !== null && (t.vpdq = u.compile()), e(t);
			}
		}, y = () => {
			for (; g.length > 0 && h.length > 0;) {
				let e = g.shift(), n = h.pop();
				s(f[n], e).then((t) => {
					for (_.set(e.frameIndex, t); _.has(i);) {
						let { vpdq: e, rawDct: t } = _.get(i);
						_.delete(i), u !== null && e !== null && e.quality !== null && u.addFrame(e.hash, e.quality, i), d !== null && t !== null && d.addFrame(t, i), c.onprogress?.(i, a), i++;
					}
					h.push(n), y(), v();
				}).catch(t);
			}
		};
		r(n, l, (e) => {
			o++, g.push(e), y();
		}, (e) => {
			a = e;
		}).then(() => {
			p = !0, v();
		}).catch(t);
	});
}
//#endregion
export { c as default, t as vpdq };

//# sourceMappingURL=video.js.map