// Drawing the book's page: cards with small paintings on warm paper. Thumbnails
// are made once per painting and size (paintings in the book never change).
import { Px } from '../../art/px.js';
import { PAPER, PAINT, PAGE, SHADOW, FRAME } from '../../art/palette.js';
import { fitRect, resample } from './thumb.js';
import { mkBookIcon } from '../../ui/chooser-art.js';

const thumbs = new WeakMap(); // painting -> Map('wxh' -> { c, w, h })

function paintAs(p, w, h, cells) {
  const out = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = cells[y * w + x]; out.p(x, y, v ? PAINT[v - 1].hex : PAPER); }
  return out.done();
}

// The whole painting, one pixel per cell (used for the flight to the line).
export const paintingCanvas = (p) => paintAs(p, p.w, p.h, p.cells);

// The painting shrunk to fit in a w x h box: { c, x, y, w, h } with x, y the offset inside the box.
export function thumbFor(p, w, h) {
  let by = thumbs.get(p);
  if (!by) thumbs.set(p, (by = new Map()));
  const key = w + 'x' + h;
  if (!by.has(key)) {
    const r = fitRect(p.w, p.h, w, h);
    by.set(key, { c: paintAs(p, r.w, r.h, resample(p, r.w, r.h)), x: r.x, y: r.y, w: r.w, h: r.h });
  }
  return by.get(key);
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
    const t = thumbFor(p, inner.w, inner.h);
    c.drawImage(t.c, inner.x + t.x, inner.y + t.y);
  });
}
