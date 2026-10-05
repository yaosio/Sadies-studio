// The clothesline in the studio where finished paintings hang with pegs.
// anchor is the line's top-left corner in room pixels (see room.js anchors).
import { Px } from '../../art/px.js';
import { PAPER, PAINT } from '../../art/palette.js';
import { fitted } from './thumb.js';

export const LINE_W = 660;
export const LINE_H = 64;
const THUMB_W = 36;
const THUMB_H = 27;
const SPACING = 46;

// Height of the sagging string at x along the line.
export const lineY = (lx) => 8 + Math.round(10 * (1 - ((lx - 330) / 320) ** 2));
const centerX = (i) => 40 + i * SPACING;

// The frame of painting number i (0 is the oldest), in room pixels.
export function slotRect(i, anchor) {
  const cx = centerX(i);
  return { x: anchor.x + cx - 20, y: anchor.y + lineY(cx) + 2, w: 40, h: 31 };
}
// Where the painting's picture sits inside its frame.
export const slotPicture = (r) => ({ x: r.x + 2, y: r.y + 2, w: THUMB_W, h: THUMB_H });

// Draw the line with paintings (skipping index `hidden`, a painting still flying there).
export function drawClothesline(paintings, hidden = -1) {
  const p = new Px(LINE_W, LINE_H);
  for (const h of [10, 650]) { p.r(h - 2, 4, 5, 6, '#8a5a1e'); p.r(h - 1, 5, 3, 4, '#ffd860'); }
  for (let x = 10; x <= 650; x++) p.p(x, lineY(x), '#7a5a48');
  paintings.forEach((art, i) => {
    if (i === hidden) return;
    const cx = centerX(i), ty = lineY(cx) + 2, x0 = cx - 20;
    p.r(x0 + 2, ty + 2, 40, 31, '#7ccabe'); p.r(x0, ty, 40, 31, '#cfc3b2'); p.r(x0 + 1, ty + 1, 38, 29, '#ffffff');
    const v = fitted(art, THUMB_W, THUMB_H);
    for (let y = 0; y < THUMB_H; y++) for (let x = 0; x < THUMB_W; x++) { const c = v[y * THUMB_W + x]; p.p(x0 + 2 + x, ty + 2 + y, c ? PAINT[c - 1].hex : PAPER); }
    for (const px of [cx - 13, cx + 11]) { const py = lineY(px) - 2; p.r(px - 1, py, 4, 8, '#8a5a30'); p.r(px, py + 1, 2, 6, '#f0b878'); }
  });
  return p.done();
}
