// A painting's paint, stored as tiles. Paper is up to 2000 cells a side, but most of
// it is bare, so only 64 x 64 tiles that were ever painted on exist: bare paper costs
// nothing in memory, in undo or in the saved text. Pure logic, no drawing.
//
// Cells are 0 (bare) or 1..10 (PAINT[value - 1]). A cell at paper (x, y) lives at world
// (x + ox, y + oy); growing or cutting a side only moves ox/oy and the size, so paper
// can be pulled out without copying any paint.
export const TILE = 64;
const SHIFT = 6, MASK = 63;
const key = (tx, ty) => (ty + 4096) * 8192 + (tx + 4096);
let stamp = 0; // every tile change gets a new number, so drawing can tell what changed

export class Paper {
  constructor(w, h, ox = 0, oy = 0, tiles = new Map()) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.tiles = tiles; // key -> { d: Uint8Array(TILE * TILE), v }
    this.journal = null;
  }

  static fromDense(w, h, cells) {
    const p = new Paper(w, h);
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) if (cells[i]) p.set(x, y, cells[i]);
    return p;
  }

  get(x, y) {
    const wx = x + this.ox, wy = y + this.oy, t = this.tiles.get(key(wx >> SHIFT, wy >> SHIFT));
    return t ? t.d[((wy & MASK) << SHIFT) | (wx & MASK)] : 0;
  }
  // Writing outside the paper is dropped.
  set(x, y, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const wx = x + this.ox, wy = y + this.oy, k = key(wx >> SHIFT, wy >> SHIFT);
    let t = this.tiles.get(k);
    if (!t) { if (!v) return; this.note(k, null); t = { d: new Uint8Array(TILE * TILE), v: 0 }; this.tiles.set(k, t); }
    else this.note(k, t);
    t.d[((wy & MASK) << SHIFT) | (wx & MASK)] = v;
    t.v = ++stamp;
  }

  // While a journal is open, the first change to each tile keeps a copy of what it was
  // (or null if the tile did not exist): that is all an undo step needs to hold.
  note(k, t) {
    if (this.journal && !this.journal.has(k)) this.journal.set(k, t ? { d: t.d.slice() } : null);
  }
  beginJournal() { this.journal = new Map(); }
  // Closes the journal and returns an undo step: the size as it was before, and the tiles' old contents.
  // `before` is the size at beginJournal time, so give it back that way.
  endJournal(before) {
    const tiles = this.journal || new Map();
    this.journal = null;
    for (const [k, t] of this.tiles) if (tiles.has(k) && !t.d.some(Boolean)) this.tiles.delete(k); // an erased tile is bare paper again
    return { w: before.w, h: before.h, ox: before.ox, oy: before.oy, tiles };
  }
  // Put back what an undo step holds (its size too).
  restore(step) {
    this.w = step.w; this.h = step.h; this.ox = step.ox; this.oy = step.oy;
    for (const [k, saved] of step.tiles) {
      if (saved) this.tiles.set(k, { d: saved.d, v: ++stamp }); else this.tiles.delete(k);
    }
  }
  size() { return { w: this.w, h: this.h, ox: this.ox, oy: this.oy }; }

  // Wipe all paint (journaled, so it can be undone).
  clear() {
    for (const [k, t] of this.tiles) this.note(k, t);
    this.tiles.clear();
  }

  isBlank() {
    for (const t of this.tiles.values()) if (t.d.some(Boolean)) return false;
    return true;
  }
  paintedCount() {
    let n = 0;
    for (const t of this.tiles.values()) for (let i = 0; i < t.d.length; i++) if (t.d[i]) n++;
    return n;
  }
  // The box (x0, y0, x1, y1, inclusive, paper cells) round all the paint, or null if bare.
  bounds() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [k, t] of this.tiles) {
      const tx = (k % 8192) - 4096, ty = Math.floor(k / 8192) - 4096;
      for (let j = 0; j < TILE; j++) for (let i = 0; i < TILE; i++) {
        if (!t.d[(j << SHIFT) | i]) continue;
        const x = tx * TILE + i - this.ox, y = ty * TILE + j - this.oy;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return x1 < x0 ? null : { x0, y0, x1, y1 };
  }

  clone() {
    const tiles = new Map();
    for (const [k, t] of this.tiles) tiles.set(k, { d: t.d.slice(), v: ++stamp });
    return new Paper(this.w, this.h, this.ox, this.oy, tiles);
  }
  // The same paint on paper with l, t, r, b more (or fewer, if negative) cells on each side.
  // It shares the tiles (nothing is copied): paper is never painted while it is being resized.
  resized(l, t, r, b) {
    return new Paper(this.w + l + r, this.h + t + b, this.ox - l, this.oy - t, this.tiles);
  }

  // Is there paint in the box x0..x1, y0..y1 (paper cells, x1 and y1 exclusive)? Cheap when the box is bare.
  hasPaint(x0, y0, x1, y1) {
    const wx0 = x0 + this.ox, wy0 = y0 + this.oy, wx1 = x1 + this.ox - 1, wy1 = y1 + this.oy - 1;
    for (let ty = wy0 >> SHIFT; ty <= wy1 >> SHIFT; ty++) for (let tx = wx0 >> SHIFT; tx <= wx1 >> SHIFT; tx++) {
      const t = this.tiles.get(key(tx, ty));
      if (!t) continue;
      for (let y = Math.max(wy0, ty * TILE); y <= Math.min(wy1, ty * TILE + MASK); y++) for (let x = Math.max(wx0, tx * TILE); x <= Math.min(wx1, tx * TILE + MASK); x++) if (t.d[((y & MASK) << SHIFT) | (x & MASK)]) return true;
    }
    return false;
  }
  // Calls fn(x, y, value) for every painted cell inside the paper.
  forEachPaint(fn) {
    for (const [k, t] of this.tiles) {
      const tx = (k % 8192) - 4096, ty = Math.floor(k / 8192) - 4096;
      for (let j = 0; j < TILE; j++) for (let i = 0; i < TILE; i++) {
        const v = t.d[(j << SHIFT) | i];
        if (!v) continue;
        const x = tx * TILE + i - this.ox, y = ty * TILE + j - this.oy;
        if (x >= 0 && y >= 0 && x < this.w && y < this.h) fn(x, y, v);
      }
    }
  }
  // The tiles that touch the paper box x0..x1, y0..y1 (paper cells, inclusive): [{ key, tx, ty, t }].
  tilesIn(x0, y0, x1, y1) {
    const out = [];
    for (let ty = (y0 + this.oy) >> SHIFT; ty <= (y1 + this.oy) >> SHIFT; ty++) for (let tx = (x0 + this.ox) >> SHIFT; tx <= (x1 + this.ox) >> SHIFT; tx++) {
      const k = key(tx, ty), t = this.tiles.get(k);
      if (t) out.push({ key: k, tx, ty, t });
    }
    return out;
  }
  // A view of just the top h rows, for a rolled-up painting.
  top(h) {
    const p = this;
    return { w: p.w, h, get: (x, y) => p.get(x, y), hasPaint: (a, b, c, d) => p.hasPaint(a, b, c, d) };
  }
  // All the cells as one array (only for small or short-lived uses; a big paper makes a big array).
  toDense() {
    const cells = new Uint8Array(this.w * this.h);
    this.forEachPaint((x, y, v) => { cells[y * this.w + x] = v; });
    return cells;
  }
}

// Where tile (tx, ty) starts, in paper cells.
export const tileOrigin = (p, tx, ty) => ({ x: tx * TILE - p.ox, y: ty * TILE - p.oy });
