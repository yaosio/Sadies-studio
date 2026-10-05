// A rolled-up sheet with a ribbon: how a painting too big to show whole is finished off.
// It is drawn along the bottom edge of a picture, or (vertical) down the right edge.
import { PAPER } from '../../art/palette.js';

export const ROLL_T = 7; // how thick the roll is, in art pixels

const ROWS = ['#bfb09c', PAPER, PAPER, '#e6dccb', '#e6dccb', '#bfb09c', '#8a7a68'];

// Draw a roll `len` long into the Px p, with its corner at (x, y). The ribbon sits near the middle.
export function drawRoll(p, x, y, len, vertical = false) {
  const at = (a, b, w, h, c) => (vertical ? p.r(x + b, y + a, h, w, c) : p.r(x + a, y + b, w, h, c)); // a along the roll, b across it
  ROWS.forEach((c, k) => at(0, k, len, 1, c));
  at(0, 0, 2, ROLL_T, '#a89886'); at(len - 2, 1, 3, ROLL_T - 2, '#e6dccb'); at(len - 1, 3, 1, 1, '#8a7a68');
  const r = Math.round(len * 0.43);
  at(r, 0, 4, ROLL_T, '#ec6aa0'); at(r, 0, 1, ROLL_T, '#ff9fc4');
}
