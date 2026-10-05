// The tool tray: layout and hit testing. Everything is measured in canvas
// pixels; u is the size of one art pixel. Closed, only a small tab shows at the
// bottom edge. Open, it is a wooden shelf along the bottom. The bottom row never
// changes: three drawers (paints, tools, stamps) and undo, bucket, hang. Above it
// (or, on wide screens, between them) sits whatever the open drawer holds. The
// canvas never shrinks for it.
import { TOOL_IDS } from './tools.js';
import { STAMP_IDS } from './stamps.js';
import { PAINT } from '../../art/palette.js';

export const ROW_H = 38; // art pixels per shelf row (tallest sprite + shelf board)
export const TAB_W = 34;
export const TAB_H = 13;
const SLOT = 26; // art pixels one item needs
// undo: back one step. clear: hold to wipe the paper clean. hang: hang it up.
export const ACTION_IDS = ['undo', 'clear', 'hang'];
export const DRAWER_IDS = ['paints', 'tools', 'stamps'];
export const DEFAULT_DRAWER = 'paints';
const DRAWER_KEYS = DRAWER_IDS.map((d) => 'drawer:' + d);
// What each drawer holds. Stamps: the pictures, then how big.
export const DRAWER_ITEMS = {
  paints: PAINT.map((_, i) => 'pot' + i),
  tools: TOOL_IDS,
  stamps: [...STAMP_IDS.map((s) => 'stamp:' + s), 'stampSize'],
};
export const itemsFor = (drawer) => [...DRAWER_KEYS, ...DRAWER_ITEMS[drawer], ...ACTION_IDS];
// Every item that can ever be on the tray (the fullest drawer decides when a screen is "wide").
export const ITEM_IDS = [...DRAWER_KEYS, ...DRAWER_ITEMS.paints, ...DRAWER_ITEMS.tools, ...DRAWER_ITEMS.stamps, ...ACTION_IDS];
const WIDEST = DRAWER_KEYS.length + DRAWER_ITEMS.paints.length + ACTION_IDS.length;
const PER_ROW = 5; // on a narrow screen a drawer wraps to a second row after five things (the pots take two)

export function layoutTray(W, H, u, drawer = DEFAULT_DRAWER) {
  const wide = W >= (WIDEST * SLOT + 16) * u;
  const fixed = [...DRAWER_KEYS, ...ACTION_IDS], content = DRAWER_ITEMS[drawer];
  let lines; // the items on each shelf row, top row first
  if (wide) lines = [[...DRAWER_KEYS, ...content, ...ACTION_IDS]];
  else {
    const per = PER_ROW;
    lines = [];
    for (let i = 0; i < content.length; i += per) lines.push(content.slice(i, i + per));
    lines.push(fixed); // the drawers and actions always on the bottom shelf
  }
  const rows = lines.length;
  const panelH = rows * ROW_H * u;
  const pitch = wide ? Math.min((W - 8 * u) / lines[0].length, 34 * u) : Math.min((W - 8 * u) / fixed.length, 40 * u);
  const rowBase = (row) => H - panelH + (row + 1) * ROW_H * u - 6 * u; // sprites stand on the shelf top
  const items = [];
  lines.forEach((line, row) => {
    const base = rowBase(row); // a short row is centered
    line.forEach((k, i) => {
      const cx = Math.round(W / 2 + (i - (line.length - 1) / 2) * pitch);
      items.push({ k, cx, base, hit: { x: cx - 13 * u, y: base - 28 * u, w: 26 * u, h: 34 * u } });
    });
  });
  const shelves = [];
  for (let r = 0; r < rows; r++) shelves.push({ x: 0, y: rowBase(r), w: W });
  const tabW = TAB_W * u, tabH = TAB_H * u;
  return {
    u, rows, panelH, items, shelves, drawer,
    tab: { x: Math.round((W - tabW) / 2), w: tabW, h: tabH, hitPad: 3 * u },
    back: { x: 0, y: 0, w: 32 * u, h: 36 * u }, // the door, top left
  };
}

export const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
