// Pixel toolkit: a small software canvas with rects, ordered dithering, shaded
// ellipses and outlines. All art in the app is drawn with this (no image files).
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const hx = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const KEY = {};
// '#rrggbb' to a little-endian 0xAABBGGRR pixel, cached.
export const K = (h) => {
  let v = KEY[h];
  if (v === undefined) {
    const c = hx(h);
    v = KEY[h] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  }
  return v;
};
export const mixh = (a, b, t) => {
  const A = hx(a), B = hx(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
// Small seeded random generator so art is the same on every load.
export function rng(s) {
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Px {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.c = document.createElement('canvas');
    this.c.width = w; this.c.height = h;
    this.g = this.c.getContext('2d');
    this.im = this.g.createImageData(w, h);
    this.b = new Uint32Array(this.im.data.buffer);
  }
  p(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.b[y * this.w + x] = c == null ? 0 : K(c);
  }
  r(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y);
    const v = c == null ? 0 : K(c);
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let j = y0; j < y1; j++) { const o = j * this.w; for (let i = x0; i < x1; i++) this.b[o + i] = v; }
  }
  // Dither a rect: each pixel gets color c where the Bayer threshold is below t.
  d(x, y, w, h, c, t) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (bay(i, j) < t) this.p(i, j, c);
  }
  // Dithered gradient through a list of colors.
  g2(x, y, w, h, cols, horiz) {
    const n = cols.length, len = horiz ? w : h;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const t = ((horiz ? i : j) / Math.max(1, len - 1)) * (n - 1), k = Math.floor(t), f = t - k;
      this.p(x + i, y + j, bay(x + i, y + j) < f ? cols[Math.min(k + 1, n - 1)] : cols[k]);
    }
  }
  ln(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = th >> 1;
    let e = dx + dy;
    for (;;) {
      this.r(x0 - o, y0 - o, th, th, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  disc(cx, cy, r, c) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.8) this.p(cx + i, cy + j, c);
  }
  // Shaded, dithered ellipse lit from the upper left, with an optional outline color.
  ellS(cx, cy, rx, ry, cols, ol) {
    const ins = (i, j) => (i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1, n = cols.length;
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      if (!ins(i, j)) continue;
      const X = cx + i, Y = cy + j;
      if (ol && (!ins(i + 1, j) || !ins(i - 1, j) || !ins(i, j + 1) || !ins(i, j - 1))) { this.p(X, Y, ol); continue; }
      const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      const L = clamp(0.5 - 0.42 * (i / rx) - 0.5 * (j / ry) + (1 - d) * 0.15, 0, 0.999);
      const t = L * (n - 1), k = t | 0, f = t - k;
      this.p(X, Y, bay(X, Y) < f ? cols[Math.min(k + 1, n - 1)] : cols[k]);
    }
  }
  // Stamp a sprite given as rows of characters and a character-to-color table.
  map(rows, pal, ox, oy) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.' && pal[ch]) this.p(ox + i, oy + j, pal[ch]); }
    }
  }
  // Wrap every transparent pixel that touches a painted one in color c.
  outline(c) {
    const v = K(c), w = this.w, h = this.h, b = this.b, s = b.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (s[i]) continue;
      if ((x > 0 && s[i - 1]) || (x < w - 1 && s[i + 1]) || (y > 0 && s[i - w]) || (y < h - 1 && s[i + w])) b[i] = v;
    }
  }
  // Dithered color wash over existing pixels (shadows and light).
  tint(x, y, w, h, col, a, th = 1) {
    const C = hx(col);
    x = Math.round(x); y = Math.round(y);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) {
      if (bay(i, j) >= th) continue;
      const k = j * this.w + i, v = this.b[k];
      if (!v) continue;
      const r = v & 255, g = (v >> 8) & 255, bb = (v >> 16) & 255;
      this.b[k] = ((255 << 24) | (Math.round(bb + (C[2] - bb) * a) << 16) | (Math.round(g + (C[1] - g) * a) << 8) | Math.round(r + (C[0] - r) * a)) >>> 0;
    }
  }
  done() { this.g.putImageData(this.im, 0, 0); return this.c; }
}
