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
// grid: dots on or off. paper: the sheet picker (only on a bare easel). hang: hang it up.
export const ACTION_IDS = ['grid', 'paper', 'hang'];
export const ITEM_IDS = [...TOOL_IDS, ...ACTION_IDS, ...PAINT.map((_, i) => 'pot' + i)];
export const SHEET_IDS = ['screen', 'big', 'tall', 'wide', 'small'].map((k) => 'sheet:' + k);

// opts.paper: show the paper pad (a bare easel). opts.picker: add a shelf of
// sheet pictures on top of the tray (needs opts.paper).
export function layoutTray(W, H, u, opts = {}) {
  const ids = opts.paper === false ? ITEM_IDS.filter((k) => k !== 'paper') : ITEM_IDS;
  const wide = W >= (ids.length * SLOT + 16) * u;
  const rows = wide ? 1 : 3, pickerRows = opts.picker ? 1 : 0;
  const panelH = (rows + pickerRows) * ROW_H * u;
  const perRow = Math.ceil(ids.length / rows);
  const span = Math.min(W - 8 * u, perRow * (wide ? 34 : 40) * u);
  const left = Math.round((W - span) / 2);
  const rowBase = (row) => H - panelH + (row + 1) * ROW_H * u - 6 * u; // sprites stand on the shelf top
  const mk = (k, cx, base) => ({ k, cx, base, hit: { x: cx - 13 * u, y: base - 28 * u, w: 26 * u, h: 34 * u } });
  const items = ids.map((k, i) => {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = Math.min(perRow, ids.length - row * perRow); // a short last row is centered
    return mk(k, Math.round(left + (span * (col + 0.5 + (perRow - inRow) / 2)) / perRow), rowBase(row + pickerRows));
  });
  if (pickerRows) {
    const pspan = Math.min(W - 8 * u, SHEET_IDS.length * 44 * u), pl = Math.round((W - pspan) / 2);
    SHEET_IDS.forEach((k, i) => items.push(mk(k, Math.round(pl + (pspan * (i + 0.5)) / SHEET_IDS.length), rowBase(0))));
  }
  const shelves = [];
  for (let r = 0; r < rows + pickerRows; r++) shelves.push({ x: 0, y: rowBase(r), w: W });
  const tabW = TAB_W * u, tabH = TAB_H * u;
  return {
    u, rows: rows + pickerRows, panelH, items, shelves,
    tab: { x: Math.round((W - tabW) / 2), w: tabW, h: tabH, hitPad: 3 * u },
    back: { x: 0, y: 0, w: 32 * u, h: 36 * u }, // the door, top left
  };
}

export const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
