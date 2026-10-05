// Shrinking and fitting paintings for the easel board and the clothesline.
// Pure logic: returns arrays of cell values, drawing happens elsewhere.

// Largest w x h box with the source's shape that fits inside dw x dh, centered.
export function fitRect(sw, sh, dw, dh) {
  const s = Math.min(dw / sw, dh / sh);
  const w = Math.max(1, Math.round(sw * s)), h = Math.max(1, Math.round(sh * s));
  return { x: Math.floor((dw - w) / 2), y: Math.floor((dh - h) / 2), w, h };
}

// Never show more than this many cells in one art pixel of a thumbnail. Past that a big
// painting is trimmed to its paint, and what still does not fit is rolled up (see viewWindow).
export const MAX_CELLS = 8;
const MIN_BOX = 12; // a tiny doodle is shown at least this many cells wide, not blown up to fill the frame
const boxes = new WeakMap(); // hung and booked paintings never change, so their paint box is found once

// The window of painting p to show in a boxW x boxH thumbnail (art pixels): { x0, y0, w, h, rolledR,
// rolledB } in cells. A painting that fits at MAX_CELLS cells a pixel or better shows whole.
// A bigger one is trimmed to the box round its paint, shown no smaller than 1/MAX_CELLS, and
// when the paint is still bigger than that the window keeps the top left and says which edges
// (right, bottom) are rolled up. Pass boxH Infinity to let the height follow the width.
export function viewWindow(p, boxW, boxH = Infinity, live = false) {
  if (Math.min(boxW / p.w, boxH / p.h) >= 1 / MAX_CELLS) return { x0: 0, y0: 0, w: p.w, h: p.h, rolledR: false, rolledB: false };
  let b = live ? undefined : boxes.get(p);
  if (b === undefined) { b = p.bounds(); if (!live) boxes.set(p, b); }
  b = b || { x0: 0, y0: 0, x1: p.w - 1, y1: p.h - 1 };
  const grow = (lo, hi, size) => { const n = hi - lo + 1, len = Math.min(size, Math.max(n, MIN_BOX)); return [Math.max(0, Math.min(size - len, lo - ((len - n) >> 1))), len]; };
  const [x0, bw] = grow(b.x0, b.x1, p.w), [y0, bh] = grow(b.y0, b.y1, p.h);
  const s = Math.max(1 / MAX_CELLS, Math.min(boxW / bw, boxH / bh));
  const w = Math.min(bw, Math.floor(boxW / s + 1e-6)), h = Math.min(bh, Math.floor(boxH / s + 1e-6));
  return { x0, y0, w, h, rolledR: w < bw, rolledB: h < bh };
}

// Resample part of a painting (a Paper, or anything with w, h, get and hasPaint) to w x h cells.
// `r` is the part: { x0, y0, w, h } in cells, the whole painting by default.
// Shrinking keeps the paint that covers most of each block (thin lines survive); growing
// repeats cells. Blocks with no paint are skipped without looking at their cells.
export function resample(p, w, h, r = { x0: 0, y0: 0, w: p.w, h: p.h }) {
  const out = new Uint8Array(w * h), counts = new Uint16Array(11);
  for (let y = 0; y < h; y++) {
    const y0 = r.y0 + Math.floor((y * r.h) / h), y1 = Math.max(y0 + 1, r.y0 + Math.floor(((y + 1) * r.h) / h));
    for (let x = 0; x < w; x++) {
      const x0 = r.x0 + Math.floor((x * r.w) / w), x1 = Math.max(x0 + 1, r.x0 + Math.floor(((x + 1) * r.w) / w));
      if (!p.hasPaint(x0, y0, x1, y1)) continue;
      counts.fill(0);
      let paint = 0, total = 0;
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) { const v = p.get(i, j); counts[v]++; total++; if (v) paint++; }
      if (paint * 3 < total) continue; // mostly bare paper
      let best = 1;
      for (let v = 2; v <= 10; v++) if (counts[v] > counts[best]) best = v;
      out[y * w + x] = best;
    }
  }
  return out;
}

// A painting (its painted part, when it is big) fitted into a dw x dh box, bare paper around it.
// The painting may still be changing, so its paint box is not cached.
export function fitted(p, dw, dh) {
  const win = viewWindow(p, dw, dh, true), r = fitRect(win.w, win.h, dw, dh), inner = resample(p, r.w, r.h, { x0: win.x0, y0: win.y0, w: win.w, h: win.h }), out = new Uint8Array(dw * dh);
  for (let y = 0; y < r.h; y++) out.set(inner.subarray(y * r.w, (y + 1) * r.w), (r.y + y) * dw + r.x);
  return out;
}
