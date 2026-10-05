// The book's page: where each painting's card sits. Pure layout, in canvas
// pixels; u is the size of one art pixel. Cards fill the width in columns and
// the page scrolls up and down. The door (top left) keeps clear of the first row.
export const CARD_MIN_W = 56; // art pixels, so a card is roughly 110 css px or more
const GAP = 6;
const PAD = 8;
const TOP = 34; // below the door

export function layoutBook(count, W, H, u) {
  const pad = PAD * u, gap = GAP * u, top = TOP * u;
  const cols = Math.max(1, Math.floor((W - 2 * pad + gap) / (CARD_MIN_W * u + gap)));
  const w = Math.floor((W - 2 * pad - (cols - 1) * gap) / cols), h = Math.round(w * 0.78);
  const cards = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    cards.push({ x: pad + col * (w + gap), y: top + row * (h + gap), w, h });
  }
  const rows = Math.ceil(count / cols);
  const total = top + rows * (h + gap) - (rows ? gap : 0) + pad;
  return { cols, cards, cardW: w, cardH: h, total, maxScroll: Math.max(0, total - H) };
}

export const clampScroll = (layout, s) => Math.min(layout.maxScroll, Math.max(0, s));

// Index of the card under screen point (x, y) when scrolled by `scroll`, or -1.
export function cardAt(layout, scroll, x, y) {
  for (let i = 0; i < layout.cards.length; i++) {
    const c = layout.cards[i], cy = c.y - scroll;
    if (x >= c.x && x < c.x + c.w && y >= cy && y < cy + c.h) return i;
  }
  return -1;
}
