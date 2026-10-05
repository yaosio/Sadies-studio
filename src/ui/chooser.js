// The picture-only chooser that appears on a long press: a short row of big
// wooden buttons under (or over) the thing that was held, with the rest of the
// screen dimmed. No words. A button flagged `hold` (delete) must be held down
// until its water-level fills, so it cannot be done by accident. Used in the
// room (hung paintings) and in the book. Layout and events are pure; drawing is
// in chooser-art.js. Everything is in canvas pixels; u is one art pixel.
import { drawScrim, drawChoiceButton, drawTargetFrame } from './chooser-art.js';

export const BUTTON = 30; // art pixels
export const GAP = 4;
export const HOLD_MS = 900;

// Where the row of n buttons goes for a held thing at `target` on a W x H screen.
export function layoutChoices(n, target, W, H, u) {
  const b = BUTTON * u, gap = GAP * u, m = 2 * u, w = n * b + (n - 1) * gap;
  let y = target.y + target.h + 4 * u;
  if (y + b > H - m) y = target.y - b - 4 * u; // no room below: above
  if (y < m) y = Math.max(m, Math.min(H - b - m, target.y + target.h - b - 2 * u)); // no room either way: over the bottom of it
  const x = Math.max(m, Math.min(W - w - m, Math.round(target.x + target.w / 2 - w / 2)));
  return Array.from({ length: n }, (_, i) => ({ x: x + i * (b + gap), y: Math.round(y), w: b, h: b }));
}

const inside = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

// env: { now() }
export function createChooser(env) {
  let open = null, held = null, last = { x: 0, y: 0 }, rects = [];
  const place = (W, H, u) => { if (open) rects = layoutChoices(open.items.length, open.target, W, H, u); };
  return {
    isOpen: () => !!open,
    holding: () => !!held,
    // items: [{ k, sprite, hold?, dim? }] left to right. target: the held thing's rect on screen.
    open(items, target, W, H, u, ctx) { open = { items, target, ctx, u, W, H }; held = null; place(W, H, u); },
    close() { open = null; held = null; rects = []; },
    resize(W, H, u) { if (open) { open.W = W; open.H = H; open.u = u; place(W, H, u); } },
    context: () => open && open.ctx,
    // A finger went down. True if the chooser took it (a tap outside closes it).
    down(x, y) {
      if (!open) return false;
      last = { x, y };
      const i = rects.findIndex((r) => inside(r, x, y));
      if (i < 0) { open = null; rects = []; return true; }
      held = { i, t0: env.now() };
      return true;
    },
    move(x, y) {
      last = { x, y };
      if (held && !inside(rects[held.i], x, y)) held = null; // slid off the button: let go
    },
    // The finger lifted. Returns { k } when a button was chosen, { hint: k } when
    // a hold button was let go too soon, else null.
    up() {
      if (!open || !held) { held = null; return null; }
      const { i } = held, it = open.items[i], ok = inside(rects[i], last.x, last.y);
      held = null;
      if (!ok) return null;
      return it.hold ? { hint: it.k } : { k: it.k };
    },
    // Called every frame: a hold button that has been held long enough fires.
    update() {
      if (!open || !held) return null;
      const it = open.items[held.i];
      if (it.hold && env.now() - held.t0 >= HOLD_MS) { held = null; return { k: it.k }; }
      return null;
    },
    draw(c) {
      if (!open) return;
      const { W, H, u, target } = open;
      drawScrim(c, W, H, target);
      drawTargetFrame(c, target, u);
      open.items.forEach((it, i) => {
        const fill = it.hold && held && held.i === i ? Math.min(1, (env.now() - held.t0) / HOLD_MS) : 0;
        drawChoiceButton(c, rects[i], u, it.sprite, { pressed: !!held && held.i === i, dim: !!it.dim, fill });
      });
    },
    _rects: () => rects,
  };
}
