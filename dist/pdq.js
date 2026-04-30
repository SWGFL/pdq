function q(r, s, e, f, o, t, n) {
  const c = Math.floor((n + 2) / 2), l = c - 1, a = n - c + 1, d = o - n, y = c - 1;
  let p = e, g = e, m = f, h = 0, x = 0;
  for (let i = 0; i < l; i++)
    h += r[g], x++, g += t;
  for (let i = 0; i < a; i++)
    h += r[g], x++, s[m] = h / x, g += t, m += t;
  for (let i = 0; i < d; i++)
    h += r[g], h -= r[p], s[m] = h / x, p += t, g += t, m += t;
  for (let i = 0; i < y; i++)
    h -= r[p], x--, s[m] = h / x, p += t, m += t;
}
function D(r, s, e, f, o) {
  for (let t = 0; t < f; t++) {
    const n = t * e;
    q(r, s, n, n, e, 1, o);
  }
}
function w(r, s, e, f, o) {
  for (let t = 0; t < e; t++)
    q(r, s, t, t, f, e, o);
}
const I = (r, s, e, f, o) => {
  const t = Array(r.length).fill(0), n = Math.floor((s + 2 * o - 1) / (2 * o)), c = Math.floor((e + 2 * o - 1) / (2 * o));
  for (let l = 0; l < f; l++)
    D(r, t, s, e, n), w(t, r, s, e, c);
  return r;
}, M = (r, s, e) => {
  const f = document.createElement("canvas"), o = f.getContext("2d"), t = new ImageData(r, s), n = t.data;
  f.width = r, f.height = s;
  for (let c = 0; c < e.length; c++)
    n[c * 4] = e[c], n[c * 4 + 1] = e[c], n[c * 4 + 2] = e[c], n[c * 4 + 3] = 255;
  return o.putImageData(t, 0, 0), document.body.appendChild(f), f;
};
function b(r, s = 1) {
  const e = [];
  for (const t of r)
    for (let n = 7; n >= 0; n--)
      e.push(t >> n & 1 ? 0 : 255);
  const f = Math.sqrt(e.length), o = [];
  if (s > 1)
    for (let t = 0; t < f; t++)
      for (let n = 0; n < s; n++)
        for (let c = 0; c < f; c++)
          for (let l = 0; l < s; l++)
            o.push(e[t * f + c]);
  return M(f * s, f * s, o || e);
}
const u = {
  rotate: (r) => {
    const s = r.length, e = Math.sqrt(s), f = Array(s);
    for (let o = 0; o < e; o++)
      for (let t = 0; t < e; t++)
        f[o * e + t] = r[(e - t - 1) * e + o];
    return f;
  },
  flip: (r) => {
    const s = r.length, e = Math.sqrt(s);
    let f = [];
    for (let o = 0; o < e; o++)
      f = f.concat(r.slice(o * e, (o + 1) * e).reverse());
    return f;
  }
}, j = {
  computeDct: (r) => {
    const s = [...r].sort((f, o) => f - o)[127], e = new Uint8Array(32);
    return r.forEach((f, o) => {
      e[Math.floor(o / 8)] |= (f > s ? 1 : 0) << o % 8;
    }), e;
  },
  toHex: (r) => Array.from(r, (s) => ("0" + (s & 255).toString(16)).slice(-2)).reverse().join("")
}, A = {
  r: 0.299,
  g: 0.587,
  b: 0.114
}, N = (r) => {
  const s = Array(r.length / 4);
  for (let e = 0; e < r.length; e += 4)
    s[e / 4] = A.r * r[e] + A.g * r[e + 1] + A.b * r[e + 2];
  return s;
}, E = (r, s, e, f) => {
  const o = new Float32Array(e * e);
  for (let t = 0; t < e; t++) {
    const n = Math.floor((t + 0.5) * s / e);
    for (let c = 0; c < e; c++) {
      const l = Math.floor((c + 0.5) * r / e);
      o[t * e + c] = f[n * r + l];
    }
  }
  return o;
}, H = (r) => {
  const s = Array(1024).fill(0), e = Array(256).fill(0), f = Array(1024).fill(0), o = Math.sqrt(2 / 64);
  for (let t = 0; t < 16; t++)
    for (let n = 0; n < 64; n++)
      s[t * 64 + n] = o * Math.cos(Math.PI / 2 / 64 * (t + 1) * (2 * n + 1));
  for (let t = 0; t < 16; t++)
    for (let n = 0; n < 64; n++) {
      let c = 0;
      for (let l = 0; l < 64; l++)
        c += s[t * 64 + l] * r[l * 64 + n];
      f[t * 64 + n] = c;
    }
  for (let t = 0; t < 16; t++)
    for (let n = 0; n < 16; n++) {
      let c = 0;
      for (let l = 0; l < 64; l++)
        c += f[t * 64 + l] * s[n * 64 + l];
      e[t * 16 + n] = c;
    }
  return e;
}, P = (r, s) => {
  let e = 0;
  for (let f = 0; f < r - 1; f++)
    for (let o = 0; o < r; o++) {
      const t = s[f * r + o], n = s[(f + 1) * r + o], c = Math.trunc((t - n) * 100 / 255);
      e += Math.abs(c);
    }
  for (let f = 0; f < r; f++)
    for (let o = 0; o < r - 1; o++) {
      const t = s[f * r + o], n = s[f * r + o + 1], c = Math.trunc((t - n) * 100 / 255);
      e += Math.abs(c);
    }
  return Math.min(Math.trunc(e / 90), 100);
}, R = {
  debug: !1,
  passes: 2,
  block: 64,
  transform: !1,
  // whether to generate dihedral transformation hashes
  hashscale: 4
  // the scaling factor for rendering the output hash (debug)
};
function C(r) {
  return { ...R, ...r };
}
const v = (r, s, e, f) => {
  const o = C(f), t = o.block, n = o.debug;
  let c;
  return Promise.resolve(r).then((l) => {
    const a = N(l);
    return n && M(s, e, a), a;
  }).then((l) => {
    const a = I(l, s, e, o.passes, t);
    return n && M(s, e, a), a;
  }).then((l) => {
    const a = E(s, e, t, l);
    return n && M(t, t, a), a;
  }).then((l) => (c = P(t, l), l)).then((l) => {
    const a = H(l);
    return n && console.log(a), a;
  }).then((l) => {
    const a = { original: l };
    return o.transform && (a.rot90 = u.rotate(l), a.flip = u.flip(l), a.rot180 = u.rotate(a.rot90), a.rot270 = u.rotate(a.rot180), a.fliprot90 = u.rotate(a.flip), a.fliprot180 = u.rotate(a.fliprot90), a.fliprot270 = u.rotate(a.fliprot180)), n && console.log(a), a;
  }).then((l) => {
    const a = [];
    for (const d in l) {
      const y = j.computeDct(l[d]), p = j.toHex(y);
      a.push(p), n && b(y, o.hashscale);
    }
    return { type: "pdq", hash: o.transform ? a : a[0], quality: c };
  });
}, z = (r, s) => {
  const e = C(s), f = e.debug, o = r.width, t = r.height;
  return new Promise((n) => {
    var c;
    if (f) {
      if (r instanceof OffscreenCanvas) {
        const l = document.createElement("canvas");
        l.width = r.width, l.height = r.height, (c = l.getContext("2d")) == null || c.drawImage(r, 0, 0), r = l;
      }
      document.body.appendChild(r);
    }
    n(r.getContext("2d").getImageData(0, 0, o, t).data);
  }).then((n) => v(n, o, t, e));
};
export {
  z as default,
  v as pdqRaw
};
//# sourceMappingURL=pdq.js.map
