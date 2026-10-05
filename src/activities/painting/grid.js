// The paint grid: pure logic, no drawing. A painting is { w, h, cells } where
// each cell is 0 (bare paper) or 1..10 (PAINT[value - 1], see art/palette.js).
import { clamp } from '../../art/px.js';
import { TOOLS } from './tools.js';

// The grid is sized to the screen so the paper fills all of it: about this many
// cells along the short side, and as many as fit along the long side.
export const SHORT_SIDE_CELLS = 54;
export const MIN_SIDE = 24;
export const MAX_SIDE = 320;
export const MAX_HUNG = 13;
export const MIN_PAINT_CELL = 3; // smallest cell, in canvas pixels, a view starts at
export const MAX_CELL = 24; // closest zoom, in canvas pixels per cell
const ZOOM_STEPS = [1, 2, 3, 4, 6, 8]; // whole multiples of the fit-everything cell

export function newPainting(w, h) {
  return { w, h, cells: new Uint8Array(w * h) };
}
export const isBlank = (p) => p.cells.every((v) => v === 0);

// Screen size in canvas pixels -> cell size and grid size for a fresh painting.
export function naturalGrid(W, H) {
  const cell = Math.max(1, Math.floor(Math.min(W, H) / SHORT_SIDE_CELLS));
  return { cell, w: clamp(Math.floor(W / cell), MIN_SIDE, MAX_SIDE), h: clamp(Math.floor(H / cell), MIN_SIDE, MAX_SIDE) };
}

// The sheets of paper the child can pick on a bare easel, in the order the
// paper stack cycles through them.
export const PAPER_IDS = ['screen', 'big', 'tall', 'wide', 'small'];
const LONG_SIDE = 3; // tall and wide sheets are this many times longer than they are across
const gridAcross = (n, W, H) => {
  const cell = Math.max(1, Math.floor(Math.min(W, H) / n));
  return { w: clamp(Math.floor(W / cell), MIN_SIDE, MAX_SIDE), h: clamp(Math.floor(H / cell), MIN_SIDE, MAX_SIDE) };
};
// Grid size (cells) of a fresh sheet of paper for a W x H screen.
export function paperGrid(id, W, H) {
  if (id === 'small') return gridAcross(36, W, H);
  if (id === 'big') return gridAcross(108, W, H);
  if (id === 'tall') return { w: SHORT_SIDE_CELLS, h: SHORT_SIDE_CELLS * LONG_SIDE };
  if (id === 'wide') return { w: SHORT_SIDE_CELLS * LONG_SIDE, h: SHORT_SIDE_CELLS };
  const g = naturalGrid(W, H);
  return { w: g.w, h: g.h };
}

// "More paper": a new painting with `pad` bare cells added on every side, the
// old one kept where it was. Null if it would pass MAX_SIDE.
export function growPainting(p, pad) {
  if (p.w + 2 * pad > MAX_SIDE || p.h + 2 * pad > MAX_SIDE) return null;
  const out = newPainting(p.w + 2 * pad, p.h + 2 * pad);
  for (let y = 0; y < p.h; y++) out.cells.set(p.cells.subarray(y * p.w, (y + 1) * p.w), (y + pad) * out.w + pad);
  return out;
}
// How much paper one tap of "more paper" adds on each side.
export const growPad = (p) => Math.max(6, Math.round(Math.min(p.w, p.h) / 5));

// Zoom: the cell sizes (canvas pixels per paint cell) a gw x gh paper can be
// viewed at on a W x H screen. The first shows the whole paper; the rest are
// whole multiples of it, so pixels stay crisp.
export function zoomLevels(gw, gh, W, H) {
  const fit = placeGrid(gw, gh, W, H).cell;
  return ZOOM_STEPS.map((k) => fit * k).filter((c, i) => i === 0 || c <= MAX_CELL);
}
// The zoom a sheet opens at: the smallest cell that is comfortable to paint
// with and covers the whole screen, so no plain bars show while painting.
export function startCell(gw, gh, W, H) {
  const levels = zoomLevels(gw, gh, W, H);
  const found = levels.find((c) => c >= MIN_PAINT_CELL && c * gw >= W - c && c * gh >= H - c);
  return found || levels.find((c) => c >= MIN_PAINT_CELL) || levels[levels.length - 1];
}
// Keep a view ({ cell, ox, oy }: where the paper's top-left sits on screen)
// covering the screen: centered on an axis where the paper is smaller than the
// screen, otherwise never scrolled past an edge.
export function clampView(v, gw, gh, W, H) {
  const axis = (o, size, screen) => (size <= screen ? Math.floor((screen - size) / 2) : clamp(Math.round(o), screen - size, 0));
  return { cell: v.cell, ox: axis(v.ox, gw * v.cell, W), oy: axis(v.oy, gh * v.cell, H) };
}
// The view at cell size `cell` that keeps paper point (px, py) (in cells) under screen point (sx, sy).
export const viewAround = (cell, px, py, sx, sy, gw, gh, W, H) => clampView({ cell, ox: sx - px * cell, oy: sy - py * cell }, gw, gh, W, H);

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
