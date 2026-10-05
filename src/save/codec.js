// Painting <-> saved text. One letter per pixel, A (bare paper) to K (paint 10),
// with a run count after a letter when it repeats: "A12B" is twelve A then one B.
export const MAX_SIDE = 512;
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

// A painting is { w, h, cells: Uint8Array(w * h) } in memory.
export function encodePainting(p) {
  return { w: p.w, h: p.h, d: encodeCells(p.cells) };
}

// Returns null for anything that is not a usable saved painting.
export function decodePainting(s) {
  if (!s || !Number.isInteger(s.w) || !Number.isInteger(s.h) || typeof s.d !== 'string') return null;
  if (s.w < 1 || s.h < 1 || s.w > MAX_SIDE || s.h > MAX_SIDE) return null;
  return { w: s.w, h: s.h, cells: decodeCells(s.d, s.w * s.h) };
}
