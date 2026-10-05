// The clothesline in the studio where finished paintings hang with pegs.
// anchor is the line's top-left corner in room pixels (see room.js anchors).
import { Px } from '../../art/px.js';
import { PAPER, PAINT } from '../../art/palette.js';
import { viewWindow, resample } from './thumb.js';
import { drawRoll, ROLL_T } from './roll-art.js';

export const LINE_W = 660;
export const LINE_H = 120;
const THUMB_W = 36;
const THUMB_H = 27;
const SPACING = 46;
const MAX_DROP = 84; // a tall painting hangs this far, then the rest is rolled up
const ROLL_H = ROLL_T;
const SIDE_ROLL = 4; // the roll down the right edge of a wide painting is slimmer, so it fits between frames

// Height of the sagging string at x along the line.
export const lineY = (lx) => 8 + Math.round(10 * (1 - ((lx - 330) / 320) ** 2));
const centerX = (i) => 40 + i * SPACING;

// How a painting hangs. It is THUMB_W wide and as tall as its shape says. Wide
// ones are shorter; tall ones drop down, and past MAX_DROP the rest is rolled
// up at the bottom (only how it is drawn: nothing is cut from the painting).
// A very big painting (more than 8 cells to a pixel) first shows just the box round its paint
// (see viewWindow), and if that is still too big the right edge is rolled up too. `win` is
// the part of the painting shown. With no painting, the standard 36 x 27 slot.
export function hangShape(art) {
  if (!art) return { ph: THUMB_H, rolled: false, rolledR: false, full: THUMB_H, win: null };
  const win = viewWindow(art, THUMB_W);
  const full = Math.round((THUMB_W * win.h) / win.w);
  if (full <= THUMB_H) return { ph: Math.max(9, full), rolled: win.rolledB, rolledR: win.rolledR, full, win };
  const ph = Math.min(full, MAX_DROP), rolled = full > MAX_DROP;
  return { ph, rolled: rolled || win.rolledB, rolledR: win.rolledR, full, win: rolled ? { ...win, h: Math.round((ph * win.w) / THUMB_W) } : win };
}

// The frame of painting number i (0 is the oldest), in room pixels.
export function slotRect(i, anchor, art) {
  const cx = centerX(i), s = hangShape(art);
  return { x: anchor.x + cx - 20, y: anchor.y + lineY(cx) + 2, w: 40 + (s.rolledR ? SIDE_ROLL : 0), h: s.ph + 4 + (s.rolled ? ROLL_H : 0) };
}
// Where the painting's picture sits inside its frame.
export const slotPicture = (r, art) => ({ x: r.x + 2, y: r.y + 2, w: THUMB_W, h: hangShape(art).ph });

// Draw the line with paintings (skipping index `hidden`, a painting still flying there).
export function drawClothesline(paintings, hidden = -1) {
  const p = new Px(LINE_W, LINE_H);
  for (const h of [10, 650]) { p.r(h - 2, 4, 5, 6, '#8a5a1e'); p.r(h - 1, 5, 3, 4, '#ffd860'); }
  for (let x = 10; x <= 650; x++) p.p(x, lineY(x), '#7a5a48');
  paintings.forEach((art, i) => {
    if (i === hidden) return;
    const cx = centerX(i), ty = lineY(cx) + 2, x0 = cx - 20, s = hangShape(art), fh = s.ph + 4;
    p.r(x0 + 2, ty + 2, 40, fh, '#7ccabe'); p.r(x0, ty, 40, fh, '#cfc3b2'); p.r(x0 + 1, ty + 1, 38, fh - 2, '#ffffff');
    // a rolled painting shows the part of it that fits: the top (and the left, if wide)
    const v = s.win ? resample(art, THUMB_W, s.ph, s.win) : null;
    if (v) for (let y = 0; y < s.ph; y++) for (let x = 0; x < THUMB_W; x++) { const c = v[y * THUMB_W + x]; p.p(x0 + 2 + x, ty + 2 + y, c ? PAINT[c - 1].hex : PAPER); }
    if (s.rolled) drawRoll(p, x0 - 1, ty + fh, 42);
    if (s.rolledR) drawRoll(p, x0 + 40, ty + 2, s.ph + 2, true);
    for (const px of [cx - 13, cx + 11]) { const py = lineY(px) - 2; p.r(px - 1, py, 4, 8, '#8a5a30'); p.r(px, py + 1, 2, 6, '#f0b878'); }
  });
  return p.done();
}
