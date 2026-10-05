// Logic tests: no browser. Run with `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { encodeCells, decodeCells, encodePainting, decodePainting } from '../src/save/codec.js';
import { migrate, emptySave, CURRENT_VERSION } from '../src/save/migrate.js';
import { createStore, KEY } from '../src/save/store.js';
import { newPainting, isBlank, naturalGrid, placeGrid, stamp, strokeLine, MIN_SIDE, MAX_SIDE } from '../src/activities/painting/grid.js';
import { fitRect, resample, fitted } from '../src/activities/painting/thumb.js';
import { layoutTray, ITEM_IDS } from '../src/activities/painting/tray.js';
import { PAINT } from '../src/art/palette.js';
import { chooseScale, uiUnit } from '../src/engine/view.js';
import { clampCamX } from '../src/engine/camera.js';
import { studioRoom } from '../src/rooms/studio/room.js';
import { STUDIO_LINES } from '../src/rooms/studio/lines.js';
import { PAINTING_LINES } from '../src/activities/painting/lines.js';

const fixture = (n) => JSON.parse(readFileSync(new URL('./fixtures/' + n, import.meta.url)));
const memory = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, m }; };

test('codec round-trips and compresses runs', () => {
  const cells = Uint8Array.from([0, 0, 0, 5, 10, 10, 1]);
  assert.equal(encodeCells(cells), 'A3FK2B');
  assert.deepEqual([...decodeCells('A3FK2B', 7)], [...cells]);
  const p = newPainting(6, 5); p.cells[7] = 3;
  assert.deepEqual(decodePainting(encodePainting(p)), p);
});
test('codec rejects junk instead of throwing', () => {
  for (const bad of [null, {}, { w: 0, h: 2, d: 'A' }, { w: 9999, h: 2, d: 'A' }, { w: 2, h: 2, d: 5 }]) assert.equal(decodePainting(bad), null);
  assert.equal(decodeCells('zzz', 4).length, 4);
});

test('every saved-data version loads', () => {
  const v1 = migrate(fixture('save-v1.json'));
  assert.equal(v1.version, CURRENT_VERSION);
  const { current, hung } = v1.activities.painting;
  assert.equal(hung.length, 2);
  assert.equal(current.w, 72); assert.equal(current.h, 54);
  assert.deepEqual([...decodePainting(current).cells.slice(0, 12)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0]);
  const v2 = migrate(fixture('save-v2.json'));
  assert.deepEqual([...decodePainting(v2.activities.painting.current).cells], [0, 0, 1, 1, 1, 2, 2, 2]);
});
test('unreadable saves become a fresh start', () => {
  for (const bad of [null, 5, 'x', [], { version: 99 }, { version: 2 }]) assert.deepEqual(migrate(bad), emptySave());
});

test('store saves after a delay, flush writes now, and survives bad storage', () => {
  const st = memory();
  const s = createStore(st, 10000);
  s.set('painting', { a: 1 });
  assert.equal(st.getItem(KEY), null);
  s.flush();
  assert.deepEqual(JSON.parse(st.getItem(KEY)).activities.painting, { a: 1 });
  assert.deepEqual(createStore(st).get('painting'), { a: 1 });
  assert.equal(createStore(memory({ [KEY]: '{not json' })).get('painting'), undefined);
  const legacy = createStore(memory({ 'sadies-studio-v1': JSON.stringify(fixture('save-v1.json')) }));
  assert.equal(legacy.get('painting').hung.length, 2);
  const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('full'); } };
  const b = createStore(broken); b.set('x', 1); b.flush(); // must not throw
  createStore(null).flush();
});

test('grid: tools paint, sponge is partial, cloth erases', () => {
  const p = newPainting(20, 20);
  stamp(p, 10, 10, 'brushS', 2);
  assert.equal(p.cells.filter(Boolean).length, 5);
  assert.equal(p.cells[10 * 20 + 10], 3);
  stamp(p, 10, 10, 'cloth', 0);
  assert.ok(isBlank(p));
  stamp(p, 10, 10, 'sponge', 0, () => 0.9);
  assert.ok(isBlank(p));
  stamp(p, 10, 10, 'sponge', 0, () => 0.1);
  assert.ok(!isBlank(p));
  stamp(p, -5, -5, 'brushB', 0); // off the edge is fine
});
test('grid: strokes leave no gaps', () => {
  const p = newPainting(40, 10);
  strokeLine(p, [2, 5], [37, 5], 'brushS', 0);
  for (let x = 2; x <= 37; x++) assert.equal(p.cells[5 * 40 + x], 1);
});
test('grid fits the screen with whole-number cells', () => {
  for (const [W, H] of [[150, 300], [216, 480], [640, 360], [900, 360], [320, 720], [2000, 1000]]) {
    const g = naturalGrid(W, H);
    assert.ok(g.w >= MIN_SIDE && g.w <= MAX_SIDE && g.h >= MIN_SIDE && g.h <= MAX_SIDE);
    const pl = placeGrid(g.w, g.h, W, H);
    assert.ok(Number.isInteger(pl.cell) && pl.cell >= 1);
    assert.ok(pl.x >= 0 && pl.y >= 0 && pl.x + pl.w <= W && pl.y + pl.h <= H);
    if (W <= MAX_SIDE * pl.cell && H <= MAX_SIDE * pl.cell) assert.ok(W - pl.w < pl.cell * 2 && H - pl.h < pl.cell * 2, 'paper covers the screen to within a cell');
  }
  const p = placeGrid(100, 50, 200, 400); // a landscape painting on a portrait screen
  assert.equal(p.cell, 2); assert.equal(p.y, 150);
});

test('thumbnails keep thin lines and letterbox', () => {
  const p = newPainting(72, 54);
  for (let x = 0; x < 72; x++) p.cells[27 * 72 + x] = 4;
  const v = resample(p, 36, 27);
  assert.ok(v.some((c) => c === 4)); // a one-cell line survives halving
  assert.deepEqual(fitRect(100, 50, 36, 27), { x: 0, y: 4, w: 36, h: 18 });
  const f = fitted(p, 36, 27);
  assert.equal(f.length, 36 * 27);
});

test('tray fits the screen at every shape', () => {
  for (const [W, H] of [[216, 480], [307, 683], [640, 360], [900, 400]]) {
    const u = 1, t = layoutTray(W, H, u);
    assert.equal(t.items.length, ITEM_IDS.length);
    assert.ok(t.panelH <= H * 0.3, `tray stays a small part of ${W}x${H}`);
    for (const it of t.items) assert.ok(it.hit.x >= 0 && it.hit.x + it.hit.w <= W, 'item inside the screen');
  }
});

test('scale is always a whole number and the view is big enough', () => {
  for (const [dw, dh, dpr] of [[390, 844, 1], [1170, 2532, 3], [2532, 1170, 3], [1920, 1080, 1], [3840, 2160, 2], [320, 480, 1]]) {
    const S = chooseScale(dw, dh);
    assert.ok(Number.isInteger(S) && S >= 1);
    assert.ok(Number.isInteger(uiUnit(S, dpr)) && uiUnit(S, dpr) >= 1);
  }
});
test('camera stays inside the room', () => {
  assert.equal(clampCamX(-50, 1, 640, 1724), 0);
  assert.equal(clampCamX(5000, 1, 640, 1724), 1724 - 640);
  assert.equal(clampCamX(0, 1, 2000, 1724), (1724 - 2000) / 2);
});

test('room data is valid', () => {
  const ids = new Set();
  for (const h of studioRoom.hotspots) {
    assert.ok(!ids.has(h.id), 'unique ' + h.id); ids.add(h.id);
    assert.ok(h.w > 0 && (h.h > 0 || h.h === null));
    assert.ok(h.x >= 0 && h.x + h.w <= studioRoom.width, h.id + ' inside room');
    const a = h.action;
    assert.equal(['activity', 'say', 'glide'].filter((k) => k in a).length >= 1, true);
    if (a.say) assert.ok(STUDIO_LINES[a.say], 'line for ' + h.id);
  }
  assert.ok(studioRoom.hotspots.some((h) => h.action.activity === 'painting'));
  for (const k of ['board', 'clothesline', 'sadie']) assert.ok(studioRoom.anchors[k]);
});
test('painting lines cover every color and tool', () => {
  for (const c of PAINT) assert.ok(PAINTING_LINES.colors[c.name], c.name);
  for (const t of ['brushS', 'brushB', 'sponge', 'cloth']) assert.ok(PAINTING_LINES.tools[t]);
});

// The rule from docs/art-style.md: colors come from the palette file. Hex colors may
// only appear in art files (src/art, art.js, room data) and the palette itself.
test('hex colors only in art files', () => {
  const allowed = (f) => /^src\/art\//.test(f) || /(^|\/)([a-z-]+-)?art\.js$/.test(f) || f === 'src/rooms/studio/room.js' || f === 'src/style.css';
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const root = new URL('../', import.meta.url).pathname;
  const bad = [];
  for (const file of walk(join(root, 'src'))) {
    const rel = relative(root, file);
    if (allowed(rel) || !/\.js$/.test(rel)) continue;
    if (/#[0-9a-fA-F]{6}\b/.test(readFileSync(file, 'utf8'))) bad.push(rel);
  }
  // examples.js is data (paint indexes), grid/tools have none; anything listed here broke the rule
  assert.deepEqual(bad, []);
});
