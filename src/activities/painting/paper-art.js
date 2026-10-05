// Drawing a Paper (tiles of paint): each painted tile is a small canvas made once and
// redrawn only when that tile changes. Nothing here is the size of the whole paper
// unless a picture of the whole painting is asked for.
import { Px, K } from '../../art/px.js';
import { PAPER, PAINT } from '../../art/palette.js';
import { TILE, tileOrigin } from './paper.js';

const COLORS = PAINT.map((c) => K(c.hex));
const cache = new WeakMap(); // tile -> { c: canvas, v: version drawn }

// The canvas for one tile, bare cells see-through.
function tileCanvas(t) {
  let e = cache.get(t);
  if (!e) cache.set(t, (e = { c: new Px(TILE, TILE), v: -1 }));
  if (e.v !== t.v) {
    for (let i = 0; i < t.d.length; i++) e.c.b[i] = t.d[i] ? COLORS[t.d[i] - 1] : 0;
    e.c.done(); e.v = t.v;
  }
  return e.c.c;
}

// Draw the visible part of paper p onto c. place: { cell, x, y } where the paper's corner is
// on screen and how big a cell is. Edges are rounded so tiles never leave seams.
export function drawTiles(c, p, place, W, H) {
  const k = place.cell;
  const x0 = Math.max(0, Math.floor(-place.x / k)), y0 = Math.max(0, Math.floor(-place.y / k));
  const x1 = Math.min(p.w - 1, Math.floor((W - place.x) / k)), y1 = Math.min(p.h - 1, Math.floor((H - place.y) / k));
  if (x1 < x0 || y1 < y0) return;
  for (const { tx, ty, t } of p.tilesIn(x0, y0, x1, y1)) {
    const o = tileOrigin(p, tx, ty);
    const sx = Math.round(place.x + o.x * k), sy = Math.round(place.y + o.y * k);
    c.drawImage(tileCanvas(t), sx, sy, Math.round(place.x + (o.x + TILE) * k) - sx, Math.round(place.y + (o.y + TILE) * k) - sy);
  }
}

// A picture of the whole painting, one pixel per cell, on paper-colored ground.
export function paperToCanvas(p) {
  const cv = document.createElement('canvas');
  cv.width = p.w; cv.height = p.h;
  const g = cv.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, p.w, p.h);
  for (const { tx, ty, t } of p.tilesIn(0, 0, p.w - 1, p.h - 1)) { const o = tileOrigin(p, tx, ty); g.drawImage(tileCanvas(t), o.x, o.y); }
  return cv;
}

// Ruler ticks every 10 cells (longer every 50) along all four edges of the screen, fixed to the
// paper, so they slide past as the view scrolls and show how far you have gone. alpha 0..1.
export function drawTicks(c, place, gw, gh, W, H, u, alpha) {
  const k = place.cell;
  if (alpha <= 0.01 || k * 10 < 5 * u) return;
  c.fillStyle = 'rgba(75,58,94,.55)';
  c.globalAlpha = alpha;
  const t = Math.max(1, Math.round(u / 2));
  const range = (o, size, n) => [Math.max(0, Math.ceil(-o / k / 10) * 10), Math.min(n, Math.floor((size - o) / k / 10) * 10)];
  const [i0, i1] = range(place.x, W, gw), [j0, j1] = range(place.y, H, gh);
  for (let i = i0; i <= i1; i += 10) {
    const x = Math.round(place.x + i * k), s = (i % 50 ? 4 : 8) * u;
    c.fillRect(x, 0, t, s); c.fillRect(x, H - s, t, s);
  }
  for (let j = j0; j <= j1; j += 10) {
    const y = Math.round(place.y + j * k), s = (j % 50 ? 4 : 8) * u;
    c.fillRect(0, y, s, t); c.fillRect(W - s, y, s, t);
  }
  c.globalAlpha = 1;
}
