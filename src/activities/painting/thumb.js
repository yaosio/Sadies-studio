// Shrinking and fitting paintings for the easel board and the clothesline.
// Pure logic: returns arrays of cell values, drawing happens elsewhere.

// Largest w x h box with the source's shape that fits inside dw x dh, centered.
export function fitRect(sw, sh, dw, dh) {
  const s = Math.min(dw / sw, dh / sh);
  const w = Math.max(1, Math.round(sw * s)), h = Math.max(1, Math.round(sh * s));
  return { x: Math.floor((dw - w) / 2), y: Math.floor((dh - h) / 2), w, h };
}

// Resample a painting (a Paper, or anything with w, h, get and hasPaint) to w x h cells.
// Shrinking keeps the paint that covers most of each block (thin lines survive); growing
// repeats cells. Blocks with no paint are skipped without looking at their cells.
export function resample(p, w, h) {
  const out = new Uint8Array(w * h), counts = new Uint16Array(11);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * p.h) / h), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * p.h) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * p.w) / w), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * p.w) / w));
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

// A painting fitted into a dw x dh box, bare paper around it.
export function fitted(p, dw, dh) {
  const r = fitRect(p.w, p.h, dw, dh), inner = resample(p, r.w, r.h), out = new Uint8Array(dw * dh);
  for (let y = 0; y < r.h; y++) out.set(inner.subarray(y * r.w, (y + 1) * r.w), (r.y + y) * dw + r.x);
  return out;
}
