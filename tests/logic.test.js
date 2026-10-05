// Logic tests: no browser. Run with `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { encodeCells, decodeCells, encodePainting, decodePainting } from '../src/save/codec.js';
import { migrate, emptySave, CURRENT_VERSION } from '../src/save/migrate.js';
import { createStore, openStore, KEY } from '../src/save/store.js';
import { newPainting, isBlank, naturalGrid, placeGrid, stamp, strokeLine, MIN_SIDE, MAX_SIDE, paintBounds, resizeSides, MIN_PAPER, zoomRange, fitCell, startCell, clampView, viewAround, edgeTabs, peekTabs, MAX_CELL } from '../src/activities/painting/grid.js';
import { hangShape, slotRect } from '../src/activities/painting/clothesline-art.js';
import { fitRect, resample, fitted } from '../src/activities/painting/thumb.js';
import { layoutTray, ITEM_IDS } from '../src/activities/painting/tray.js';
import { PAINT } from '../src/art/palette.js';
import { chooseScale, uiUnit } from '../src/engine/view.js';
import { clampCamX } from '../src/engine/camera.js';
import { studioRoom } from '../src/rooms/studio/room.js';
import { STUDIO_LINES } from '../src/rooms/studio/lines.js';
import { PAINTING_LINES } from '../src/activities/painting/lines.js';
import { addFinished, lineToBook, bookToLine, remove, splitLoaded, takeToEasel } from '../src/activities/painting/collection.js';
import { layoutBook, cardAt, clampScroll } from '../src/activities/painting/book.js';
import { layoutChoices, createChooser, HOLD_MS } from '../src/ui/chooser.js';
import { holdRingSpot } from '../src/ui/chooser-art.js';

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
test('a save with a book loads, and one from before the book has none (no version bump: the field is optional)', () => {
  const withBook = migrate(fixture('save-v2-book.json')).activities.painting;
  assert.equal(withBook.book.length, 2);
  assert.deepEqual([...decodePainting(withBook.book[1]).cells], [0, 0, 1, 1, 1, 2, 2, 2]);
  assert.equal(migrate(fixture('save-v2.json')).activities.painting.book, undefined);
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

test('paper grows and shrinks around the painting but never cuts paint', () => {
  const p = newPainting(30, 20);
  stamp(p, 10, 8, 'brushS', 2);
  const bb = paintBounds(p);
  const g = resizeSides(p, 5, 2, 0, 7);
  assert.deepEqual([g.l, g.t, g.r, g.b], [5, 2, 0, 7]);
  assert.equal(g.p.w, 35); assert.equal(g.p.h, 29);
  assert.equal(g.p.cells[(8 + 2) * g.p.w + 10 + 5], 3, 'same paint in the same place');
  assert.equal(g.p.cells.filter(Boolean).length, p.cells.filter(Boolean).length, 'no paint lost or added');
  // shrink: bare paper goes, but the cut stops at the paint
  const cut = resizeSides(p, -100, -100, -100, -100);
  assert.equal(cut.p.cells.filter(Boolean).length, p.cells.filter(Boolean).length, 'a huge cut still loses no paint');
  assert.ok(cut.p.w >= bb.x1 - bb.x0 + 1 && cut.p.h >= bb.y1 - bb.y0 + 1 && cut.p.w >= MIN_PAPER && cut.p.h >= MIN_PAPER);
  assert.equal(cut.p.w, MIN_PAPER, 'a cut stops at the smallest paper');
  const wide = newPainting(40, 20); for (let x = 8; x < 30; x++) wide.cells[5 * 40 + x] = 2;
  const tight = resizeSides(wide, -100, 0, -100, 0);
  assert.deepEqual([tight.l, tight.r, tight.p.w], [-8, -10, 22], 'a cut stops right at the paint');
  const bare = resizeSides(newPainting(30, 20), 0, 0, -100, -100);
  assert.equal(bare.p.w, MIN_PAPER); assert.equal(bare.p.h, MIN_PAPER); // bare paper shrinks to the minimum
  assert.equal(resizeSides(newPainting(MAX_SIDE - 2, 24), 3, 0, 3, 0).p.w, MAX_SIDE, 'growth stops at the limit');
});

test('zoom is smooth, keeps the paper in reach, and the table view leaves room for the tabs', () => {
  for (const [W, H] of [[150, 300], [260, 563], [640, 360], [900, 360]]) {
    for (const g of [naturalGrid(W, H), { w: 54, h: 162 }, { w: 162, h: 54 }, { w: MAX_SIDE, h: MAX_SIDE }, { w: 12, h: 12 }]) {
      const id = g.w + 'x' + g.h, m = 40, r = zoomRange(g.w, g.h, W, H, m);
      assert.ok(r.min > 0 && r.min <= r.max && r.max >= MAX_CELL);
      const start = startCell(g.w, g.h, W, H);
      assert.ok(Number.isInteger(start) && start >= r.min && start <= r.max, 'opens at a whole-number cell inside the range');
      // the table view fits the paper with the margin all round
      const tv = clampView({ cell: r.min, ox: 0, oy: 0 }, g.w, g.h, W, H);
      if (r.min < start) assert.ok(tv.ox >= m - 1 && tv.oy >= m - 1 && tv.ox + g.w * r.min <= W - m + 1 && tv.oy + g.h * r.min <= H - m + 1, `${id} on ${W}x${H}: table view has room`);
      // never scrolled past an edge
      for (const cell of [r.min, (r.min + r.max) / 2, r.max]) {
        const v = clampView({ cell, ox: -9999, oy: 9999 }, g.w, g.h, W, H);
        for (const [o, size, screen] of [[v.ox, g.w * cell, W], [v.oy, g.h * cell, H]]) {
          if (size > screen) assert.ok(o <= 0 && o + size >= screen - 1, 'scrolled no further than the paper');
          else assert.ok(Math.abs(o - (screen - size) / 2) <= 1, 'a small paper stays centered');
        }
      }
    }
  }
  const v = viewAround(11.5, 10.5, 20.5, 100, 200, 54, 162, 260, 563); // keep paper point (10.5, 20.5) under (100, 200)
  assert.ok(Math.abs(v.ox + 10.5 * v.cell - 100) <= 1 && Math.abs(v.oy + 20.5 * v.cell - 200) <= 1);
  assert.ok(fitCell(100, 50, 200, 200) === 2 && fitCell(100, 50, 200, 200, 20) === 1.6);
});

test('pull-out tabs show only while the whole paper is on screen, one per edge', () => {
  const inside = edgeTabs({ x: 30, y: 40, w: 100, h: 160 }, 160, 240, 1);
  assert.deepEqual(inside.map((t) => t.side).sort(), ['bottom', 'left', 'right', 'top']);
  for (const t of inside) assert.ok(t.hit.w >= t.w && t.hit.h >= t.h, 'finger-sized hit box');
  assert.equal(edgeTabs({ x: 0, y: 0, w: 300, h: 500 }, 160, 240, 1).length, 0);
  assert.equal(edgeTabs({ x: 0, y: 0, w: 300, h: 500 }, 160, 240, 1, true).length, 4);
});

test('hung paintings: wide ones are shorter, tall ones drop and roll up past the limit', () => {
  const art = (w, h) => ({ w, h, cells: new Uint8Array(w * h) });
  assert.deepEqual(hangShape(null), { ph: 27, rolled: false, full: 27 });
  assert.equal(hangShape(art(72, 54)).ph, 27);
  assert.ok(hangShape(art(162, 54)).ph < 27 && hangShape(art(162, 54)).ph >= 9);
  const mid = hangShape(art(54, 117)); // a phone-shaped sheet hangs in full
  assert.ok(!mid.rolled && mid.ph > 27);
  const long = hangShape(art(54, 162));
  assert.ok(long.rolled && long.full > long.ph);
  const a = slotRect(0, { x: 0, y: 0 }, art(54, 162)), b = slotRect(0, { x: 0, y: 0 }, art(72, 54));
  assert.ok(a.h > b.h && a.x === b.x && a.y === b.y && a.w === b.w, 'taller frame, same peg place');
});

// a stand-in for IndexedDB: records by id, and what was written
function fakeBackend(records = [], fail = false) {
  const written = {};
  return { written, readAll: async () => { if (fail) throw new Error('blocked'); return records; }, put: (id, state) => { written[id] = state; } };
}
test('IndexedDB store: starts from what it holds, writes per activity, moves old saves over once', async () => {
  const held = fakeBackend([{ id: 'painting', version: CURRENT_VERSION, state: { a: 1 } }, { id: 'old', version: 1, state: {} }]);
  const s = await openStore(held, memory(), 10000);
  assert.deepEqual(s.get('painting'), { a: 1 }); assert.equal(s.get('old'), undefined, 'records of another version are ignored');
  s.set('painting', { a: 2 }); s.flush();
  assert.deepEqual(held.written, { painting: { a: 2 } });
  // empty database: whatever localStorage held (even the mockup's v1) moves over
  const fresh = fakeBackend(), local = memory({ 'sadies-studio-v1': JSON.stringify(fixture('save-v1.json')) });
  const moved = await openStore(fresh, local, 10000);
  assert.equal(moved.get('painting').hung.length, 2);
  moved.flush();
  assert.equal(fresh.written.painting.hung.length, 2, 'copied into the database on first start');
  // no database, or one that throws: localStorage still works
  for (const none of [null, fakeBackend([], true)]) {
    const mem = memory(), f = await openStore(none, mem, 10000);
    f.set('painting', { b: 1 }); f.flush();
    assert.deepEqual(JSON.parse(mem.getItem(KEY)).activities.painting, { b: 1 });
  }
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

const pic = (n) => ({ w: 2, h: 2, cells: new Uint8Array(4).fill(n) });
test('a full line sends new paintings to the book and nothing is ever dropped', () => {
  const hung = Array.from({ length: 12 }, (_, i) => pic(i)), book = [];
  assert.deepEqual(addFinished(hung, book, pic(20)), { dest: 'line', index: 12 });
  assert.equal(hung.length, 13);
  assert.deepEqual(addFinished(hung, book, pic(21)), { dest: 'book', index: 0 });
  assert.deepEqual(addFinished(hung, book, pic(22)), { dest: 'book', index: 1 });
  assert.deepEqual([hung.length, book.length], [13, 2]);
  assert.equal(hung[0].cells[0], 0, 'the oldest is still on the line');
});
test('moving between the line and the book, and deleting', () => {
  const hung = [pic(1), pic(2), pic(3)], book = [pic(9)];
  assert.ok(lineToBook(hung, book, 1));
  assert.deepEqual(hung.map((p) => p.cells[0]), [1, 3]);
  assert.deepEqual(book.map((p) => p.cells[0]), [9, 2]);
  assert.ok(!lineToBook(hung, book, 5) && !bookToLine(hung, book, -1));
  assert.ok(bookToLine(hung, book, 0));
  assert.deepEqual(hung.map((p) => p.cells[0]), [1, 3, 9]);
  const full = Array.from({ length: 13 }, (_, i) => pic(i)), b2 = [pic(50)];
  assert.ok(!bookToLine(full, b2, 0), 'a full line refuses');
  assert.deepEqual([full.length, b2.length], [13, 1], 'and nothing moved');
  assert.equal(remove(book, 0).cells[0], 2);
  assert.equal(remove(book, 7), null);
  assert.equal(book.length, 0);
  const loaded = splitLoaded(Array.from({ length: 15 }, (_, i) => pic(i)), [pic(99)]);
  assert.equal(loaded.hung.length, 13);
  assert.deepEqual(loaded.book.map((p) => p.cells[0]), [0, 1, 99], 'extras go to the front of the book');
});
test('the book page lays cards out in columns, scrolls, and can be hit', () => {
  for (const [W, H, u] of [[216, 480, 1], [640, 360, 1], [900, 400, 2], [150, 300, 1]]) {
    const L = layoutBook(200, W, H, u);
    assert.ok(L.cols >= 1 && L.cards.length === 200);
    for (const c of L.cards) assert.ok(c.x >= 0 && c.x + c.w <= W, `card inside the width of ${W}`);
    assert.ok(L.cards[0].y >= 34 * u, 'the first row clears the door');
    assert.ok(L.total > H && L.maxScroll === L.total - H, 'many cards scroll');
    assert.equal(clampScroll(L, 99999), L.maxScroll);
    assert.equal(clampScroll(L, -5), 0);
    const c = L.cards[4];
    assert.equal(cardAt(L, 0, c.x + 1, c.y + 1), 4);
    assert.equal(cardAt(L, 20, c.x + 1, c.y - 20 + 1), 4, 'scroll moves the cards');
    assert.equal(cardAt(L, 0, -1, 0), -1);
  }
  assert.equal(layoutBook(0, 300, 300, 1).cards.length, 0);
});
test('chooser buttons stay on screen and the trash needs a hold', () => {
  for (const [W, H, u] of [[216, 480, 1], [640, 360, 1]]) {
    for (const t of [{ x: 0, y: 0, w: 40, h: 30 }, { x: W - 40, y: H - 30, w: 40, h: 30 }, { x: W / 2, y: H / 2, w: 50, h: 40 }]) {
      for (const r of layoutChoices(3, t, W, H, u)) assert.ok(r.x >= 0 && r.x + r.w <= W && r.y >= 0 && r.y + r.h <= H, 'inside the screen');
    }
  }
  let t = 0;
  const ch = createChooser({ now: () => t }), sprite = { width: 4, height: 4 };
  ch.open([{ k: 'save', sprite }, { k: 'delete', sprite, hold: true }], { x: 100, y: 100, w: 40, h: 30 }, 640, 360, 1, 'ctx');
  const [a, b] = ch._rects();
  assert.ok(ch.down(a.x + 2, a.y + 2)); assert.deepEqual(ch.up(), { k: 'save' });
  assert.ok(ch.down(b.x + 2, b.y + 2)); t = 100; assert.deepEqual(ch.up(), { hint: 'delete' }, 'let go too soon');
  assert.ok(ch.down(b.x + 2, b.y + 2)); t = 100 + HOLD_MS - 1; assert.equal(ch.update(), null);
  t = 100 + HOLD_MS; assert.deepEqual(ch.update(), { k: 'delete' }, 'held long enough');
  assert.ok(ch.down(b.x + 2, b.y + 2)); ch.move(b.x + 200, b.y); t += HOLD_MS * 2; assert.equal(ch.update(), null, 'sliding off cancels the hold');
  assert.ok(ch.down(0, 0)); assert.equal(ch.isOpen(), false, 'a tap outside closes it');
  assert.equal(ch.down(0, 0), false, 'closed: touches pass through');
});

test('tapping a painting puts a copy on the easel and the easel painting takes its place', () => {
  const list = [pic(1), pic(2), pic(3)], easel = pic(9);
  const got = takeToEasel(list, 1, easel, false);
  assert.deepEqual([...got.cells], [2, 2, 2, 2]);
  assert.notEqual(got, list[1]); assert.notEqual(got.cells, pic(2).cells);
  assert.deepEqual(list.map((p) => p.cells[0]), [1, 9, 3], 'swapped in the same place');
  const bare = takeToEasel(list, 0, pic(0), true);
  assert.equal(bare.cells[0], 1);
  assert.deepEqual(list.map((p) => p.cells[0]), [9, 3], 'a bare easel is just replaced');
  assert.equal(takeToEasel(list, 5, easel, false), null);
});
test('edge arrows and the hold ring stay on screen', () => {
  for (const [W, H, u] of [[216, 480, 1], [640, 360, 2]]) {
    for (const t of peekTabs(W, H, u)) assert.ok(t.x >= 0 && t.y >= 0 && t.x + t.w <= W && t.y + t.h <= H, t.side + ' arrow inside the screen');
    assert.equal(peekTabs(W, H, u, false).length, 3);
    for (const [x, y] of [[0, 0], [W, H], [W / 2, H - 2], [W / 2, 5]]) {
      const r = holdRingSpot(x, y, W, H, u);
      assert.ok(r.x >= 0 && r.x <= W && r.y >= 0 && r.y <= H);
    }
    assert.deepEqual(holdRingSpot(100, 100, W, H, u), { x: 100, y: 100 }, 'centered on the touch when there is room');
  }
});
