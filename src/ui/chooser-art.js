// Drawing for the chooser: wooden buttons (the same wood as the tool tray), a
// dimmed screen, and the little icons that need no words.
import { Px } from '../art/px.js';
import { SCRIM } from '../art/palette.js';

// Down arrow into a tray: save a copy of the painting.
export function mkSaveIcon() {
  const p = new Px(20, 22);
  p.r(8, 2, 5, 9, '#4aa0e8'); p.r(8, 2, 1, 9, '#8ccaff');
  for (let k = 0; k < 6; k++) p.r(4 + k, 10 + k, 13 - 2 * k, 1, '#4aa0e8');
  p.r(2, 17, 17, 4, '#d8c8b0'); p.r(2, 17, 17, 1, '#fff6e8'); p.r(2, 20, 17, 1, '#a89478');
  p.r(4, 17, 1, 2, '#a89478'); p.r(16, 17, 1, 2, '#a89478');
  p.outline('#23406a'); return p.done();
}

// A trash can with a lid.
export function mkTrashIcon() {
  const p = new Px(20, 22);
  p.r(6, 1, 8, 2, '#c9d2e0'); p.r(2, 3, 16, 3, '#a8b4c8'); p.r(2, 3, 16, 1, '#e8eef8');
  for (let y = 6; y < 21; y++) { const ins = y > 17 ? 1 : 0; p.r(4 + ins, y, 12 - 2 * ins, 1, '#c9d2e0'); }
  for (const x of [6, 9, 12]) p.r(x, 8, 2, 10, '#8a96ac');
  p.r(4, 6, 1, 14, '#f0f4fa');
  p.outline('#4a3a5e'); return p.done();
}

// A closed book with a ribbon: the same book that sits in the room.
export function mkBookIcon() {
  const p = new Px(20, 22);
  p.r(3, 2, 15, 18, '#e0684a'); p.r(3, 2, 4, 18, '#b04630'); p.r(7, 2, 1, 18, '#f09070');
  p.r(16, 3, 2, 16, '#fff6e8'); p.r(10, 6, 5, 5, '#fff6e8'); p.r(11, 7, 3, 3, '#ffd60a');
  p.r(12, 17, 2, 5, '#ff6fb5'); p.p(12, 21, '#ff6fb5');
  p.outline('#5e2a18'); return p.done();
}

// A wooden button the size of r (x, y, w, h); sprite is drawn in the middle at u.
// opts: { pressed, dim, fill } (fill 0..1 is red water rising, for the hold button).
export function drawChoiceButton(c, r, u, sprite, opts) {
  const { x, y, w, h } = r, down = opts.pressed ? u : 0;
  c.fillStyle = '#6e3e1e'; c.fillRect(x, y, w, h);
  c.fillStyle = '#d48e4c'; c.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
  c.fillStyle = '#f2bc7c'; c.fillRect(x + u, y + u, w - 2 * u, u);
  c.fillStyle = '#b87438'; c.fillRect(x + u, y + h - 3 * u, w - 2 * u, 2 * u);
  if (opts.fill > 0) {
    const fh = Math.round((h - 2 * u) * opts.fill);
    c.fillStyle = 'rgba(236,59,59,.6)'; c.fillRect(x + u, y + h - u - fh, w - 2 * u, fh);
  }
  c.globalAlpha = opts.dim ? 0.4 : 1;
  const sw = sprite.width * u, sh = sprite.height * u;
  c.drawImage(sprite, Math.round(x + (w - sw) / 2), Math.round(y + (h - sh) / 2 + down), sw, sh);
  c.globalAlpha = 1;
}

// Dim everything except the held thing.
export function drawScrim(c, W, H, t) {
  c.fillStyle = SCRIM;
  c.fillRect(0, 0, W, Math.max(0, t.y));
  c.fillRect(0, t.y + t.h, W, Math.max(0, H - t.y - t.h));
  c.fillRect(0, t.y, Math.max(0, t.x), t.h);
  c.fillRect(t.x + t.w, t.y, Math.max(0, W - t.x - t.w), t.h);
}

// A bright frame round the held thing.
export function drawTargetFrame(c, t, u) {
  const e = Math.max(1, Math.round(u));
  c.fillStyle = '#ffffff';
  c.fillRect(t.x - e, t.y - e, t.w + 2 * e, e); c.fillRect(t.x - e, t.y + t.h, t.w + 2 * e, e);
  c.fillRect(t.x - e, t.y, e, t.h); c.fillRect(t.x + t.w, t.y, e, t.h);
}
