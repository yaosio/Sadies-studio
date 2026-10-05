// The paint grid: pure logic, no drawing. A painting is a Paper (paper.js, tiles) where
// each cell is 0 (bare paper) or 1..10 (PAINT[value - 1], see art/palette.js).
import { clamp } from '../../art/px.js';
import { TOOLS } from './tools.js';
import { Paper } from './paper.js';

// The grid is sized to the screen so the paper fills all of it: about this many
// cells along the short side, and as many as fit along the long side.
export const SHORT_SIDE_CELLS = 54;
export const MIN_SIDE = 24;
export const MAX_SIDE = 2000; // the wall: paper cannot be pulled out past this
export const MAX_HUNG = 13;
export const MIN_PAINT_CELL = 3; // smallest cell, in canvas pixels, a view starts at
export const MAX_CELL = 32; // closest zoom, in canvas pixels per cell

export function newPainting(w, h) {
  return new Paper(w, h);
}
export const isBlank = (p) => p.isBlank();

// Screen size in canvas pixels -> cell size and grid size for a fresh painting.
export function naturalGrid(W, H) {
  const cell = Math.max(1, Math.floor(Math.min(W, H) / SHORT_SIDE_CELLS));
  return { cell, w: clamp(Math.floor(W / cell), MIN_SIDE, MAX_SIDE), h: clamp(Math.floor(H / cell), MIN_SIDE, MAX_SIDE) };
}

// The smallest a sheet can be shrunk to, in cells.
export const MIN_PAPER = 12;
// The box (x0, y0, x1, y1, inclusive) around all the paint, or null if bare.
export const paintBounds = (p) => p.bounds();
// "More paper" and "less paper": add (positive) or cut (negative) bare cells on
// each side (l, t, r, b), the painting kept where it was. Growth stops at
// MAX_SIDE; a cut never goes into paint or below MIN_PAPER, so nothing painted
// is ever lost. Returns { p, l, t, r, b } with what was actually done.
export function resizeSides(p, l, t, r, b, bounds = paintBounds(p)) {
  const cut = (want, room) => (want < 0 ? -Math.min(-want, Math.max(0, room)) : want);
  l = cut(l, Math.min(bounds ? bounds.x0 : p.w, p.w - MIN_PAPER)); r = cut(r, Math.min(bounds ? p.w - 1 - bounds.x1 : p.w, p.w - MIN_PAPER));
  t = cut(t, Math.min(bounds ? bounds.y0 : p.h, p.h - MIN_PAPER)); b = cut(b, Math.min(bounds ? p.h - 1 - bounds.y1 : p.h, p.h - MIN_PAPER));
  // both sides of an axis together may not cut below MIN_PAPER
  const both = (a, z, size) => { const over = (a < 0 ? -a : 0) + (z < 0 ? -z : 0) - Math.max(0, size - MIN_PAPER); return over > 0 ? (z < 0 ? [a, z + Math.min(over, -z)] : [a + Math.min(over, -a), z]) : [a, z]; };
  [l, r] = both(l, r, p.w); [t, b] = both(t, b, p.h);
  const hMax = Math.max(0, MAX_SIDE - p.w), vMax = Math.max(0, MAX_SIDE - p.h);
  if (l > 0) l = Math.min(l, hMax);
  if (r > 0) r = Math.min(r, hMax - Math.max(0, l));
  if (t > 0) t = Math.min(t, vMax);
  if (b > 0) b = Math.min(b, vMax - Math.max(0, t));
  return { p: p.resized(l, t, r, b), l, t, r, b };
}

// Zoom is smooth: any cell size (canvas pixels per paint cell) between the
// "table view" (the whole paper with a margin round it, for the pull-out tabs)
// and MAX_CELL.
export const fitCell = (gw, gh, W, H, margin = 0) => Math.max(0.01, Math.min((W - 2 * margin) / gw, (H - 2 * margin) / gh));
// The zoom a sheet opens at: the smallest whole-number cell that is comfortable
// to paint with and covers the whole screen, so no bars show while painting.
export function startCell(gw, gh, W, H) {
  for (let c = MIN_PAINT_CELL; c <= MAX_CELL; c++) if (c * gw >= W - c && c * gh >= H - c) return c;
  return MAX_CELL;
}
// The closest and farthest zoom for a sheet (the farthest never passes the start).
export function zoomRange(gw, gh, W, H, margin) {
  const start = startCell(gw, gh, W, H);
  return { min: Math.min(fitCell(gw, gh, W, H, margin), start), max: Math.max(MAX_CELL, start) };
}
// Keep a view ({ cell, ox, oy }: where the paper's top-left sits on screen)
// covering the screen: centered on an axis where the paper is smaller than the
// screen, otherwise never scrolled past an edge (except `over`, see wallOver).
export function clampView(v, gw, gh, W, H, over = { x: 0, y: 0 }) {
  const axis = (o, size, screen, extra) => (size <= screen ? Math.round((screen - size) / 2) : clamp(Math.round(o), Math.round(screen - size - extra), extra));
  return { cell: v.cell, ox: axis(v.ox, gw * v.cell, W, over.x), oy: axis(v.oy, gh * v.cell, H, over.y) };
}
// The wall: paper at its size limit on an axis may be scrolled a little past its
// edge so the wall shows there (returns how far, in canvas pixels, per axis).
export function wallOver(gw, gh, W, H) {
  const band = Math.round(Math.min(W, H) * 0.08);
  return { x: gw >= MAX_SIDE ? band : 0, y: gh >= MAX_SIDE ? band : 0 };
}
// The view at cell size `cell` that keeps paper point (px, py) (in cells) under screen point (sx, sy).
export const viewAround = (cell, px, py, sx, sy, gw, gh, W, H) => clampView({ cell, ox: sx - px * cell, oy: sy - py * cell }, gw, gh, W, H, wallOver(gw, gh, W, H));

// The pull-out tabs, one on each edge of the paper, only while the whole paper
// (and room for the tabs) is on screen, or always when `always` is set. Boxes are in canvas pixels; `hit` is a
// roomier box for fingers. u is the size of one art pixel.
export function edgeTabs(place, W, H, u, always = false) {
  const depth = 18 * u, len = 44 * u, pad = 12 * u;
  if (!always && (place.x < depth || place.y < depth || place.x + place.w > W - depth || place.y + place.h > H - depth)) return [];
  const cx = place.x + place.w / 2, cy = place.y + place.h / 2;
  const mk = (side, x, y, w, h, hx, hy, hw, hh) => ({ side, x, y, w, h, hit: { x: hx, y: hy, w: hw, h: hh } });
  return [
    mk('left', place.x - depth, cy - len / 2, depth, len, place.x - depth - pad, cy - len / 2 - pad, depth + pad + 2 * u, len + 2 * pad),
    mk('right', place.x + place.w, cy - len / 2, depth, len, place.x + place.w - 2 * u, cy - len / 2 - pad, depth + pad + 2 * u, len + 2 * pad),
    mk('top', cx - len / 2, place.y - depth, len, depth, cx - len / 2 - pad, place.y - depth - pad, len + 2 * pad, depth + pad + 2 * u),
    mk('bottom', cx - len / 2, place.y + place.h, len, depth, cx - len / 2 - pad, place.y + place.h - 2 * u, len + 2 * pad, depth + pad + 2 * u),
  ];
}

// Small arrow tabs tucked onto the screen edges while the paper fills the screen (so there
// is no room outside it for the real tabs). Pressing one glides out to the table view,
// where the real tabs are. The bottom one sits off to the side of the tray's tab.
export function peekTabs(W, H, u, withBottom = true) {
  const depth = 14 * u, len = 36 * u, pad = 4 * u;
  const mk = (side, x, y, w, h) => ({ side, x, y, w, h, hit: { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad } });
  const tabs = [
    mk('left', 0, Math.round(H / 2 - len / 2), depth, len),
    mk('right', W - depth, Math.round(H / 2 - len / 2), depth, len),
    mk('top', Math.round(W / 2 - len / 2), 0, len, depth),
  ];
  if (withBottom) tabs.push(mk('bottom', Math.round(W * 0.8 - len / 2), H - depth, len, depth));
  return tabs;
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
    if (t.erase) p.set(x, y, 0);
    else if (t.chance >= 1 || rand() < t.chance) p.set(x, y, color + 1);
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

// Put a stamp (see stamps.js) on the paper, its middle at cell (cx, cy). See-through
// cells leave the paper alone and anything off the edge is dropped.
export function putStamp(p, art, cx, cy) {
  const x0 = cx - (art.w >> 1), y0 = cy - (art.h >> 1);
  for (let j = 0; j < art.h; j++) {
    for (let i = 0; i < art.w; i++) {
      const v = art.cells[j * art.w + i], x = x0 + i, y = y0 + j;
      if (v) p.set(x, y, v);
    }
  }
}
