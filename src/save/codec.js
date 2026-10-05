// Painting <-> saved text. One letter per pixel, A (bare paper) to K (paint 10),
// with a run count after a letter when it repeats: "A12B" is twelve A then one B.
import { Paper } from '../activities/painting/paper.js';
export const MAX_SIDE = 2048; // a little over the paper limit in grid.js
const LETTERS = 'ABCDEFGHIJK';

export function encodeCells(cells) {
  let out = '';
  for (let i = 0; i < cells.length;) {
    let j = i + 1;
    while (j < cells.length && cells[j] === cells[i]) j++;
    out += LETTERS[cells[i]] + (j - i > 1 ? j - i : '');
    i = j;
  }
  return out;
}

export function decodeCells(text, count) {
  const cells = new Uint8Array(count);
  let at = 0;
  for (const m of String(text).matchAll(/([A-K])(\d*)/g)) {
    const v = LETTERS.indexOf(m[1]);
    const n = m[2] ? parseInt(m[2], 10) : 1;
    for (let k = 0; k < n && at < count; k++) cells[at++] = v;
  }
  return cells;
}

// A painting is a Paper (activities/painting/paper.js) in memory. It is saved the same way
// as ever: every cell of the w x h grid, row by row, as runs. Bare tiles are skipped
// without looking at their cells, so a big mostly bare paper encodes and decodes fast.
export function encodePainting(p) {
  const TILE = 64;
  let out = '', val = -1, len = 0;
  const flush = () => { if (len) out += LETTERS[val] + (len > 1 ? len : ''); };
  const push = (v, n) => { if (v === val) len += n; else { flush(); val = v; len = n; } };
  for (let y = 0; y < p.h; y++) {
    const wy = y + p.oy, ty = wy >> 6, row = (wy & 63) * TILE;
    let x = 0;
    while (x < p.w) {
      const wx = x + p.ox, tx = wx >> 6, inTile = TILE - (wx & 63), n = Math.min(inTile, p.w - x);
      const t = p.tiles.get((ty + 4096) * 8192 + (tx + 4096));
      if (!t) push(0, n);
      else for (let i = 0, o = row + (wx & 63); i < n; i++) push(t.d[o + i], 1);
      x += n;
    }
  }
  flush();
  return { w: p.w, h: p.h, d: out };
}

// Returns null for anything that is not a usable saved painting.
export function decodePainting(s) {
  if (!s || !Number.isInteger(s.w) || !Number.isInteger(s.h) || typeof s.d !== 'string') return null;
  if (s.w < 1 || s.h < 1 || s.w > MAX_SIDE || s.h > MAX_SIDE) return null;
  const p = new Paper(s.w, s.h), count = s.w * s.h;
  let at = 0;
  for (const m of String(s.d).matchAll(/([A-K])(\d*)/g)) {
    const v = LETTERS.indexOf(m[1]), n = m[2] ? parseInt(m[2], 10) : 1;
    if (v) for (let k = 0; k < n && at + k < count; k++) { const i = at + k; p.set(i % s.w, (i / s.w) | 0, v); }
    at += n;
    if (at >= count) break;
  }
  return p;
}

// How many painted cells a saved painting holds, counted from its text alone (bare paper and
// junk cost nothing). Decoding costs about this much, so it bounds what an import may ask for.
export function paintedCells(s) {
  if (!s || typeof s.d !== 'string') return 0;
  let n = 0;
  for (const m of s.d.matchAll(/([B-K])(\d*)/g)) n += m[2] ? parseInt(m[2], 10) : 1;
  return n;
}
