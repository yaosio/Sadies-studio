// The tool tray: layout and hit testing. Everything is measured in canvas
// pixels; u is the size of one art pixel. Closed, only a small tab shows at the
// bottom edge. Open, it is a wooden shelf along the bottom: one row on wide
// screens, three rows on narrow ones. The canvas never shrinks for it.
import { TOOL_IDS } from './tools.js';
import { PAINT } from '../../art/palette.js';

export const ROW_H = 38; // art pixels per shelf row (tallest sprite + shelf board)
export const TAB_W = 34;
export const TAB_H = 13;
const SLOT = 26; // art pixels one item needs
// hand: drag the paper around. zoom: step closer. paper: pick another sheet. more: add paper.
// grid: dots on or off. hang: hang it up.
export const ACTION_IDS = ['grid', 'hang'];
export const ITEM_IDS = [...TOOL_IDS, ...ACTION_IDS, ...PAINT.map((_, i) => 'pot' + i)];

export function layoutTray(W, H, u) {
  const wide = W >= (ITEM_IDS.length * SLOT + 16) * u;
  const rows = wide ? 1 : 3;
  const panelH = rows * ROW_H * u;
  const perRow = Math.ceil(ITEM_IDS.length / rows);
  const span = Math.min(W - 8 * u, perRow * (wide ? 34 : 40) * u);
  const left = Math.round((W - span) / 2);
  const rowBase = (row) => H - panelH + (row + 1) * ROW_H * u - 6 * u; // sprites stand on the shelf top
  const items = ITEM_IDS.map((k, i) => {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = Math.min(perRow, ITEM_IDS.length - row * perRow); // a short last row is centered
    const cx = Math.round(left + (span * (col + 0.5 + (perRow - inRow) / 2)) / perRow), base = rowBase(row);
    return { k, cx, base, hit: { x: cx - 13 * u, y: base - 28 * u, w: 26 * u, h: 34 * u } };
  });
  const shelves = [];
  for (let r = 0; r < rows; r++) shelves.push({ x: 0, y: rowBase(r), w: W });
  const tabW = TAB_W * u, tabH = TAB_H * u;
  return {
    u, rows, panelH, items, shelves,
    tab: { x: Math.round((W - tabW) / 2), w: tabW, h: tabH, hitPad: 3 * u },
    back: { x: 0, y: 0, w: 32 * u, h: 36 * u }, // the door, top left
  };
}

export const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
