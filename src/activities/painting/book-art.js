// Drawing the book's page: cards with small paintings on warm paper. Thumbnails
// are made once per painting and size (paintings in the book never change).
import { Px } from '../../art/px.js';
import { PAPER, PAINT, PAGE, SHADOW, FRAME } from '../../art/palette.js';
import { fitRect, resample, viewWindow } from './thumb.js';
import { drawRoll, ROLL_T } from './roll-art.js';
import { paperToCanvas } from './paper-art.js';
import { mkBookIcon } from '../../ui/chooser-art.js';

const thumbs = new WeakMap(); // painting -> Map('wxh' -> { c, w, h })

function paintAs(p, w, h, cells) {
  const out = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = cells[y * w + x]; out.p(x, y, v ? PAINT[v - 1].hex : PAPER); }
  return out.done();
}

// The painting (or the part of it a hung picture shows, win) one pixel per cell, for the flight to the line.
export const paintingCanvas = (p, win) => paperToCanvas(p, win);

// The painting shrunk to fit in a w x h box: { c, x, y, w, h, win, rr, rb } with x, y the offset inside
// the box. A painting too big to show whole shows the box round its paint (see viewWindow); when that
// is cut off, a roll of thickness ROLL_T * u is kept free along the right (rr) and bottom (rb) edge.
export function thumbFor(p, w, h, u = 1) {
  let by = thumbs.get(p);
  if (!by) thumbs.set(p, (by = new Map()));
  const key = w + 'x' + h + 'x' + u;
  if (!by.has(key)) {
    let win = viewWindow(p, w, h), rr = 0, rb = 0;
    if (win.rolledR || win.rolledB) {
      const t = ROLL_T * u;
      win = viewWindow(p, w - (win.rolledR ? t : 0), h - (win.rolledB ? t : 0));
      rr = win.rolledR ? t : 0; rb = win.rolledB ? t : 0;
    }
    const r = fitRect(win.w, win.h, w - rr, h - rb);
    by.set(key, { c: paintAs(p, r.w, r.h, resample(p, r.w, r.h, win)), x: r.x, y: r.y, w: r.w, h: r.h, win, rr, rb });
  }
  return by.get(key);
}

const rolls = new Map(); // 'len:vertical' -> sprite
function rollSprite(len, vertical) {
  const key = len + ':' + vertical;
  if (!rolls.has(key)) { const q = new Px(vertical ? ROLL_T : len, vertical ? len : ROLL_T); drawRoll(q, 0, 0, len, vertical); rolls.set(key, q.done()); }
  return rolls.get(key);
}

// Where a card's painting sits inside it, and the picture area (screen pixels).
export const cardInner = (card, u) => ({ x: card.x + 2 * u, y: card.y + 2 * u, w: card.w - 4 * u, h: card.h - 4 * u });

let bookIcon = null;
// paintings: the book, oldest first; layout from book.js; scroll in canvas pixels.
export function drawBookPage(c, W, H, u, paintings, layout, scroll) {
  c.fillStyle = PAGE;
  c.fillRect(0, 0, W, H);
  if (!paintings.length) {
    bookIcon = bookIcon || mkBookIcon();
    c.globalAlpha = 0.35;
    const s = 4 * u;
    c.drawImage(bookIcon, Math.round((W - bookIcon.width * s) / 2), Math.round((H - bookIcon.height * s) / 2), bookIcon.width * s, bookIcon.height * s);
    c.globalAlpha = 1;
    return;
  }
  paintings.forEach((p, i) => {
    const card = layout.cards[i], y = card.y - scroll;
    if (y + card.h < 0 || y > H) return;
    c.fillStyle = SHADOW; c.fillRect(card.x + 2 * u, y + 2 * u, card.w, card.h);
    c.fillStyle = FRAME; c.fillRect(card.x, y, card.w, card.h);
    const inner = cardInner({ x: card.x, y, w: card.w, h: card.h }, u);
    c.fillStyle = PAPER; c.fillRect(inner.x, inner.y, inner.w, inner.h);
    const t = thumbFor(p, inner.w, inner.h, u);
    c.drawImage(t.c, inner.x + t.x, inner.y + t.y);
    if (t.rb) { const len = Math.round(t.w / u), r = rollSprite(len, false); c.drawImage(r, inner.x + t.x, inner.y + t.y + t.h, t.w, t.rb); } // cut off: rolled up
    if (t.rr) { const len = Math.round(t.h / u), r = rollSprite(len, true); c.drawImage(r, inner.x + t.x + t.w, inner.y + t.y, t.rr, t.h); }
  });
}
