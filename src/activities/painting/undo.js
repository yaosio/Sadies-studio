// Undo snapshots, packed. A big paper is millions of cells, so 30 plain copies
// would eat a phone's memory; a snapshot is kept as runs (value, length), which
// are tiny for mostly bare paper. Pure logic.

// { w, h, cells } -> { w, h, vals, lens }
export function packSnapshot(w, h, cells) {
  let runs = 0;
  for (let i = 0; i < cells.length; i++) if (i === 0 || cells[i] !== cells[i - 1]) runs++;
  const vals = new Uint8Array(runs), lens = new Uint32Array(runs);
  for (let i = 0, r = -1; i < cells.length; i++) {
    if (i === 0 || cells[i] !== cells[i - 1]) { r++; vals[r] = cells[i]; }
    lens[r]++;
  }
  return { w, h, vals, lens };
}

// The cells again, as a fresh Uint8Array.
export function unpackSnapshot(s) {
  const cells = new Uint8Array(s.w * s.h);
  let at = 0;
  for (let r = 0; r < s.vals.length; r++) { if (s.vals[r]) cells.fill(s.vals[r], at, at + s.lens[r]); at += s.lens[r]; }
  return cells;
}
