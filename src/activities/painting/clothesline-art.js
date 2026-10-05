// The clothesline in the studio where finished paintings hang with pegs.
// anchor is the line's top-left corner in room pixels (see room.js anchors).
import { Px } from '../../art/px.js';
import { PAPER, PAINT } from '../../art/palette.js';
import { fitted } from './thumb.js';

export const LINE_W = 660;
export const LINE_H = 120;
const THUMB_W = 36;
const THUMB_H = 27;
const SPACING = 46;
const MAX_DROP = 84; // a tall painting hangs this far, then the rest is rolled up
const ROLL_H = 7;

// Height of the sagging string at x along the line.
export const lineY = (lx) => 8 + Math.round(10 * (1 - ((lx - 330) / 320) ** 2));
const centerX = (i) => 40 + i * SPACING;

// How a painting hangs. It is THUMB_W wide and as tall as its shape says. Wide
// ones are shorter; tall ones drop down, and past MAX_DROP the rest is rolled
// up at the bottom (only how it is drawn: nothing is cut from the painting).
// With no painting, the standard 36 x 27 slot.
export function hangShape(art) {
  if (!art) return { ph: THUMB_H, rolled: false, full: THUMB_H };
  const full = Math.round((THUMB_W * art.h) / art.w);
  if (full <= THUMB_H) return { ph: Math.max(9, full), rolled: false, full };
  return { ph: Math.min(full, MAX_DROP), rolled: full > MAX_DROP, full };
}

// The frame of painting number i (0 is the oldest), in room pixels.
export function slotRect(i, anchor, art) {
  const cx = centerX(i), s = hangShape(art);
  return { x: anchor.x + cx - 20, y: anchor.y + lineY(cx) + 2, w: 40, h: s.ph + 4 + (s.rolled ? ROLL_H : 0) };
}
// Where the painting's picture sits inside its frame.
export const slotPicture = (r, art) => ({ x: r.x + 2, y: r.y + 2, w: THUMB_W, h: hangShape(art).ph });

// A rolled-up sheet with a ribbon, under the visible part of the painting.
function drawRoll(p, x0, y) {
  const rows = ['#bfb09c', '#fffaf0', '#fffaf0', '#e6dccb', '#e6dccb', '#bfb09c', '#8a7a68'];
  rows.forEach((c, k) => p.r(x0 - 1, y + k, 42, 1, c));
  p.r(x0 - 1, y, 2, ROLL_H, '#a89886'); p.r(x0 + 39, y + 1, 3, ROLL_H - 2, '#e6dccb'); p.p(x0 + 40, y + 3, '#8a7a68');
  p.r(x0 + 17, y, 4, ROLL_H, '#ec6aa0'); p.r(x0 + 17, y, 1, ROLL_H, '#ff9fc4');
}

// Draw the line with paintings (skipping index `hidden`, a painting still flying there).
export function drawClothesline(paintings, hidden = -1) {
  const p = new Px(LINE_W, LINE_H);
  for (const h of [10, 650]) { p.r(h - 2, 4, 5, 6, '#8a5a1e'); p.r(h - 1, 5, 3, 4, '#ffd860'); }
  for (let x = 10; x <= 650; x++) p.p(x, lineY(x), '#7a5a48');
  paintings.forEach((art, i) => {
    if (i === hidden) return;
    const cx = centerX(i), ty = lineY(cx) + 2, x0 = cx - 20, s = hangShape(art), fh = s.ph + 4;
    p.r(x0 + 2, ty + 2, 40, fh, '#7ccabe'); p.r(x0, ty, 40, fh, '#cfc3b2'); p.r(x0 + 1, ty + 1, 38, fh - 2, '#ffffff');
    // a rolled painting shows its top; the same cells, a shorter painting
    const top = s.rolled ? art.top(Math.max(1, Math.round((art.h * s.ph) / s.full))) : art;
    const v = fitted(top, THUMB_W, s.ph);
    for (let y = 0; y < s.ph; y++) for (let x = 0; x < THUMB_W; x++) { const c = v[y * THUMB_W + x]; p.p(x0 + 2 + x, ty + 2 + y, c ? PAINT[c - 1].hex : PAPER); }
    if (s.rolled) drawRoll(p, x0, ty + fh);
    for (const px of [cx - 13, cx + 11]) { const py = lineY(px) - 2; p.r(px - 1, py, 4, 8, '#8a5a30'); p.r(px, py + 1, 2, 6, '#f0b878'); }
  });
  return p.done();
}
