// The paint grid: pure logic, no drawing. A painting is { w, h, cells } where
// each cell is 0 (bare paper) or 1..10 (PAINT[value - 1], see art/palette.js).
import { clamp } from '../../art/px.js';
import { TOOLS } from './tools.js';

// The grid is sized to the screen so the paper fills all of it: about this many
// cells along the short side, and as many as fit along the long side.
export const SHORT_SIDE_CELLS = 54;
export const MIN_SIDE = 24;
export const MAX_SIDE = 192;
export const MAX_HUNG = 13;

export function newPainting(w, h) {
  return { w, h, cells: new Uint8Array(w * h) };
}
export const isBlank = (p) => p.cells.every((v) => v === 0);

// Screen size in canvas pixels -> cell size and grid size for a fresh painting.
export function naturalGrid(W, H) {
  const cell = Math.max(1, Math.floor(Math.min(W, H) / SHORT_SIDE_CELLS));
  return { cell, w: clamp(Math.floor(W / cell), MIN_SIDE, MAX_SIDE), h: clamp(Math.floor(H / cell), MIN_SIDE, MAX_SIDE) };
}

// Where a gw x gh grid sits on a W x H screen: the largest whole-number cell
// that fits, centered. Any leftover is plain paper.
export function placeGrid(gw, gh, W, H) {
  const cell = Math.max(1, Math.min(Math.floor(W / gw), Math.floor(H / gh)));
  const w = gw * cell, h = gh * cell;
  return { cell, x: Math.floor((W - w) / 2), y: Math.floor((H - h) / 2), w, h };
}

// Put the tool down once at cell (cx, cy). color is a 0-based paint index.
export function stamp(p, cx, cy, toolId, color, rand = Math.random) {
  const t = TOOLS[toolId], r = t.radius;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (i * i + j * j > r * r + (r === 1 ? 0 : r * 0.6)) continue;
    const x = cx + i, y = cy + j;
    if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
    if (t.erase) p.cells[y * p.w + x] = 0;
    else if (t.chance >= 1 || rand() < t.chance) p.cells[y * p.w + x] = color + 1;
  }
}

// Drag the tool from one cell to the next without gaps. The sponge dabs every
// other step so it stays speckled.
export function strokeLine(p, from, to, toolId, color, rand = Math.random) {
  let [x0, y0] = from;
  const [x1, y1] = to, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  for (;;) {
    if (toolId !== 'sponge' || n % 2 === 0) stamp(p, x0, y0, toolId, color, rand);
    n++;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
