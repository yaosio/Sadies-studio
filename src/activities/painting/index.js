// The painting activity. When open it owns the whole screen: bare paper edge to
// edge, a door in the top-left corner to leave, and a small tab at the bottom
// that opens the tool tray. In the room it supplies the paper on the easel and
// the clothesline. See README.md in this folder.
import { Px, clamp, K } from '../../art/px.js';
import { PAPER, PAINT, WOOD_TRIM, SHADOW } from '../../art/palette.js';
import { encodePainting, decodePainting } from '../../save/codec.js';
import { pick, easeOut } from '../../engine/util.js';
import { TOOLS, DEFAULT_TOOL } from './tools.js';
import { newPainting, isBlank, naturalGrid, placeGrid, stamp, strokeLine, peekTabs, paintBounds, resizeSides, zoomRange, startCell, clampView, viewAround, edgeTabs } from './grid.js';
import { fitRect, fitted } from './thumb.js';
import { layoutTray, inRect } from './tray.js';
import { mkPot, mkBrush, mkSponge, mkCloth, mkHang, mkUndo, mkClear, mkArrow, drawEdgeTab, mkBack, mkChevron, drawShelf, drawTrayBack, drawHandle } from './art.js';
import { drawClothesline, slotRect, slotPicture } from './clothesline-art.js';
import { examplePaintings } from './examples.js';
import { savePng } from './export.js';
import { addFinished, lineToBook, bookToLine, remove, splitLoaded, lineIsFull, takeToEasel } from './collection.js';
import { layoutBook, clampScroll, cardAt } from './book.js';
import { drawBookPage, paintingCanvas, thumbFor, cardInner } from './book-art.js';
import { createChooser } from '../../ui/chooser.js';
import { mkSaveIcon, mkTrashIcon, mkBookIcon, drawHoldRing, holdRingSpot } from '../../ui/chooser-art.js';
import { PAINTING_LINES as LINES } from './lines.js';
import { SPARK } from '../../art/effects.js';

const LONG_PRESS_MS = 650;
const HOLD_RING_DELAY_MS = 150; // a quick tap never shows the ring

const ID = 'painting';

// env: { store, sound, say(text, ms), exit(), hang(), reducedMotion, now() }
export function createPainting(env) {
  let current = null; // the painting on the easel
  let hung = []; // paintings on the clothesline, oldest first
  let book = []; // paintings in the book, oldest first (see collection.js)
  let reopened = false; // the easel painting was just taken from the line or book
  let inBook = false, bookScroll = 0, bookPtr = null, lastDest = 'line'; // the book view; where the last hung painting went
  let hangingIndex = -1; // a painting still flying to the line
  let tool = DEFAULT_TOOL, color = 0;
  const undoStack = []; // snapshots { w, h, cells } to go back to, newest last (not saved)
  let view = { cell: 1, ox: 0, oy: 0 }; // zoom and scroll: cell size, and where the paper's corner is on screen
  let anim = null; // a smooth move of the view
  let pan = null, pinch = null, grow = null, lastPtr = null, lastTap = null;
  let trayKey = '', clearHold = null; // clearHold: when a finger went down on the bucket
  const hinted = {};
  let W = 0, H = 0, u = 1, place = null, tray = null;
  let paper = null, paperDirty = true, version = 0;
  let active = false, trayOpen = false, trayAnim = 0;
  let stroke = null, strokes = 0, usedColors = new Set(), manyShown = false, lastSay = 0;
  const bumps = {}, sprites = {};
  let lineCanvas = null, lineDirty = true, board = null, boardVersion = -1;

  const chooser = createChooser({ now: env.now });
  const encoded = new WeakMap(); // paintings on the line and in the book never change: encode each once
  const enc = (p) => { let e = encoded.get(p); if (!e) encoded.set(p, (e = encodePainting(p))); return e; };
  const persist = () => env.store.set(ID, save());
  const say = (text, ms) => { lastSay = env.now(); env.say(text, ms); };

  function save() {
    return { current: current ? encodePainting(current) : null, hung: hung.map(enc), book: book.map(enc) };
  }
  function load(saved) {
    if (!saved) { hung = examplePaintings(); return; } // first time ever: a couple on the line
    const list = (v) => (Array.isArray(v) ? v : []).map(decodePainting).filter(Boolean); // older saves have no book
    ({ hung, book } = splitLoaded(list(saved.hung), list(saved.book)));
    current = decodePainting(saved.current) || current;
    lineDirty = true;
    version++;
  }

  function freshPainting() {
    const g = naturalGrid(W, H); // a new painting always starts at the default size
    current = newPainting(g.w, g.h);
    undoStack.length = 0;
    startView();
    paperDirty = true; version++;
    strokes = 0; usedColors = new Set(); manyShown = false;
  }

  /* ---- zoom and scroll ---- */
  // Zoom is smooth (any cell size between the table view and MAX_CELL). The
  // table view shows the whole paper with some bare table round it, where the
  // pull-out tabs sit. See docs/painting.md.
  const margin = () => 40 * u;
  const range = () => zoomRange(current.w, current.h, W, H, margin());
  const syncPlace = () => { place = { cell: view.cell, x: view.ox, y: view.oy, w: current.w * view.cell, h: current.h * view.cell }; };
  function setView(v) {
    const r = range();
    view = clampView({ cell: clamp(v.cell, r.min, r.max), ox: v.ox, oy: v.oy }, current.w, current.h, W, H);
    syncPlace();
  }
  function startView() {
    anim = null;
    const cell = startCell(current.w, current.h, W, H);
    setView({ cell, ox: Math.round((W - current.w * cell) / 2), oy: 0 }); // centered across, at the top
  }
  const tableView = () => clampView({ cell: range().min, ox: 0, oy: 0 }, current.w, current.h, W, H);
  // Glide the view to v (a clamped view); straight there with reduced motion.
  function animateTo(v) {
    if (env.reducedMotion) { setView(v); return; }
    anim = { from: { ...view }, to: v, t: 0 };
  }
  // Zoom by `factor` keeping the paper under (sx, sy) still.
  function zoomAt(factor, sx, sy) {
    const r = range(), cell = clamp(view.cell * factor, r.min, r.max);
    anim = null;
    setView(viewAround(cell, (sx - view.ox) / view.cell, (sy - view.oy) / view.cell, sx, sy, current.w, current.h, W, H));
  }
  function panBy(dx, dy) { anim = null; setView({ cell: view.cell, ox: view.ox + dx, oy: view.oy + dy }); }
  // Double tap: from the whole paper, in to a paintable size; from anywhere else, out to the whole paper.
  function toggleZoom(sx, sy) {
    if (view.cell <= range().min * 1.06) {
      const c = startCell(current.w, current.h, W, H);
      animateTo(viewAround(c, (sx - view.ox) / view.cell, (sy - view.oy) / view.cell, sx, sy, current.w, current.h, W, H));
    } else animateTo(tableView());
    hint('zoom', LINES.zoomed);
  }
  function hint(key, line) { if (hinted[key]) return; hinted[key] = true; say(line); }

  function refreshTray() {
    const key = [W, H, u].join();
    if (key !== trayKey) { trayKey = key; tray = layoutTray(W, H, u); }
  }

  function resize(w, h, unit) {
    W = w; H = h; u = unit;
    if (!current) freshPainting();
    if (active) setView(view); else startView();
    trayKey = ''; refreshTray();
    chooser.resize(W, H, u);
  }
  // Before the glide in: an empty easel goes back to the default size, shaped for this screen.
  function prepare(which) {
    inBook = which === 'book'; chooser.close(); bookPtr = null;
    if (inBook) { bookScroll = 0; return; }
    const g = naturalGrid(W, H); // a new painting always starts at the default size
    if (isBlank(current) && (current.w !== g.w || current.h !== g.h)) freshPainting();
    startView();
  }
  function open() {
    if (inBook) { active = true; say(book.length ? pick(LINES.bookOpen) : LINES.bookEmpty); return; }
    active = true; trayOpen = false; trayAnim = 0; stroke = null; pan = pinch = grow = null;
    say(pick(reopened ? LINES.reopen : LINES.easel));
    reopened = false;
  }
  function close() {
    chooser.close(); bookPtr = null;
    active = false; stroke = null; pan = pinch = grow = clearHold = null;
    env.store.flush();
  }

  /* ---- paper ---- */
  function renderPaper() {
    if (!paper || paper.w !== current.w || paper.h !== current.h) paper = new Px(current.w, current.h);
    const colors = [K(PAPER), ...PAINT.map((c) => K(c.hex))];
    for (let i = 0; i < current.cells.length; i++) paper.b[i] = colors[current.cells[i]];
    paper.done();
    paperDirty = false;
  }
  const paperCanvas = () => { if (paperDirty || !paper) renderPaper(); return paper.c; };

  /* ---- painting ---- */
  const cellAt = (x, y, force) => {
    const cx = Math.floor((x - place.x) / place.cell), cy = Math.floor((y - place.y) / place.cell);
    if (force) return [clamp(cx, 0, current.w - 1), clamp(cy, 0, current.h - 1)];
    return cx >= 0 && cy >= 0 && cx < current.w && cy < current.h ? [cx, cy] : null;
  };
  function endStroke() {
    if (!stroke) return;
    const quick = stroke.len <= 1 && env.now() - stroke.t0 < 250;
    lastTap = quick ? { t: env.now(), x: stroke.x0, y: stroke.y0, before: stroke.before } : null; // a possible first half of a double tap
    pushUndo({ w: current.w, h: current.h, cells: stroke.before });
    stroke = null; version++; persist(); strokes++;
    if (tool !== 'cloth') usedColors.add(color);
    const now = env.now();
    if (tool === 'cloth' && now - lastSay > 5000) { say(LINES.wipe); return; }
    if (strokes === 1) { say(LINES.first); return; }
    if (usedColors.size === 4 && !manyShown) { manyShown = true; say(LINES.many); return; }
    if (strokes % 6 === 0 && now - lastSay > 6000) say(pick(LINES.praise));
  }

  /* ---- tray ---- */
  const panelOffset = () => (1 - easeOut(trayAnim)) * tray.panelH;
  const tabY = () => H - tray.tab.h - easeOut(trayAnim) * tray.panelH;
  function tabHit(x, y) {
    const t = tray.tab, pad = t.hitPad, ty = tabY();
    return x >= t.x - pad && x < t.x + t.w + pad && y >= ty - pad && y < ty + t.h + pad;
  }
  const toggleTray = () => { trayOpen = !trayOpen; env.sound.play('tab'); };
  function press(item) {
    const k = item.k;
    bumps[k] = env.now();
    if (k.startsWith('pot')) {
      color = +k.slice(3);
      if (tool === 'cloth') tool = DEFAULT_TOOL;
      env.sound.play('pot', color);
      say(LINES.colors[PAINT[color].name]);
    } else if (TOOLS[k]) {
      tool = k; env.sound.play('tool'); say(LINES.tools[k]);
    } else if (k === 'clear') {
      clearHold = { t0: env.now() }; // wiping needs a hold, see update()
    } else if (k === 'undo') {
      undo();
    } else if (k === 'hang') {
      if (isBlank(current)) { env.sound.play('tool'); say(LINES.empty); } else env.hang();
    }
  }

  // While the paper fills the screen the real tabs are off screen, so small arrows on the edges show that it can be resized.
  const peekOn = () => active && !inBook && !pinch && !stroke && !pan && !grow && !anim && tabsOn().length === 0 ? peekTabs(W, H, u, trayAnim < 0.05) : [];
  const tabsOn = () => active && !pinch && !stroke && !pan ? edgeTabs(place, W, H, u, grow !== null) : [];
  const outward = { left: (g, x) => g.x0 - x, right: (g, x) => x - g.x0, top: (g, x, y) => g.y0 - y, bottom: (g, x, y) => y - g.y0 };
  function pointerDown(x, y, opts) {
    if (inBook) { bookDown(x, y); return; }
    refreshTray();
    lastPtr = { x, y };
    if (inRect(tray.back, x, y)) { env.sound.play('tab'); leave(); return; }
    if (tabHit(x, y)) { toggleTray(); return; }
    if (trayAnim > 0.02 && y >= H - tray.panelH + panelOffset()) {
      if (trayAnim > 0.4) {
        const off = panelOffset();
        for (const it of tray.items) if (inRect({ ...it.hit, y: it.hit.y + off }, x, y)) { press(it); break; }
      }
      return; // never paint through the tray
    }
    if (opts && opts.pan) { anim = null; pan = { x, y, ox: view.ox, oy: view.oy }; trayOpen = false; return; }
    for (const tab of peekOn()) if (inRect(tab.hit, x, y)) { // an arrow on the screen edge: glide out to where the paper can be pulled
      trayOpen = false; env.sound.play('tab'); animateTo(tableView());
      return;
    }
    for (const tab of tabsOn()) if (inRect(tab.hit, x, y)) { // pull more paper out
      anim = null; trayOpen = false;
      grow = { side: tab.side, base: current, bounds: paintBounds(current), x0: x, y0: y, n: 0, acc: 0 };
      env.sound.play('tab');
      return;
    }
    const t = env.now();
    if (lastTap && t - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 28 * u) { // double tap: not two dabs, a zoom
      current.cells.set(lastTap.before); undoStack.pop(); paperDirty = true; version++; persist();
      lastTap = null; toggleZoom(x, y);
      return;
    }
    const c = cellAt(x, y, false);
    if (!c) return;
    trayOpen = false; // starting to paint tucks the tray away
    anim = null;
    stroke = { last: c, len: 0, before: current.cells.slice(), t0: t, x0: x, y0: y }; // before: lets a second finger or a double tap take the dab back
    stamp(current, c[0], c[1], tool, color);
    paperDirty = true;
  }
  // Pulling a tab out adds paper on that side, pushing it in takes bare paper
  // away (never paint). It is like a joystick: the further the finger is from
  // where it grabbed, the faster the paper grows or shrinks, and the view keeps
  // the whole paper in sight, so no long swipe is needed.
  function growTo(n) {
    const g = grow, side = g.side, v = (k) => (side === k ? n : 0);
    const r = resizeSides(g.base, v('left'), v('top'), v('right'), v('bottom'), g.bounds);
    g.n = r[side[0]]; g.acc = g.n; // what was really done (a cut stops at the paint)
    current = r.p; paperDirty = true; version++;
    setView(tableView());
  }
  const GROW_RATE = 45; // cells a second with the finger fully pulled
  function pointerMove(x, y) {
    if (inBook) { bookMove(x, y); return; }
    lastPtr = { x, y };
    if (grow) return; // update() turns the pull into paper
    if (pan) { anim = null; setView({ cell: view.cell, ox: pan.ox + x - pan.x, oy: pan.oy + y - pan.y }); return; }
    if (!stroke) return;
    const c = cellAt(x, y, true);
    stroke.len++;
    strokeLine(current, stroke.last, c, tool, color);
    stroke.last = c; paperDirty = true;
  }
  const pushUndo = (snap) => { undoStack.push(snap); if (undoStack.length > 30) undoStack.shift(); };
  // Go back one step: a stroke, a wipe, or a paper size change.
  function undo() {
    if (stroke || grow || pinch) return;
    env.sound.play('tool');
    const s = undoStack.pop();
    if (!s) { say(LINES.nothingToUndo); return; }
    const resized = s.w !== current.w || s.h !== current.h;
    current = newPainting(s.w, s.h); current.cells.set(s.cells);
    paperDirty = true; version++; lastTap = null; persist();
    if (resized) { anim = null; setView(tableView()); }
    say(pick(LINES.undone));
  }
  const CLEAR_HOLD_MS = 900;
  // Wipes every bit of paint (the paper keeps its size). Nothing undoes this, so it needs a hold.
  function clearAll() {
    clearHold = null;
    if (isBlank(current)) { say(LINES.alreadyClean); return; }
    pushUndo({ w: current.w, h: current.h, cells: current.cells.slice() });
    current.cells.fill(0);
    paperDirty = true; version++; lastTap = null; persist();
    strokes = 0; usedColors = new Set(); manyShown = false;
    env.sound.play('pop'); say(pick(LINES.cleared));
  }
  function pointerUp() {
    if (inBook) { bookUp(); return; }
    lastPtr = null;
    if (clearHold) { clearHold = null; say(LINES.clearHint); return; } // let go too soon
    if (grow) {
      const g = grow;
      grow = null;
      if (g.n !== 0) { pushUndo({ w: g.base.w, h: g.base.h, cells: g.base.cells }); persist(); hint('tabs', LINES.tabsDone); }
      return;
    }
    if (pan) { pan = null; return; }
    endStroke();
  }
  const leave = () => { say(inBook ? LINES.bookBye : LINES.bye, 2600); env.exit(); };
  // Two fingers: move and zoom the paper. A stroke already under way (a palm
  // resting down) is left alone.
  const canGesture = () => !inBook && !grow && (!stroke || stroke.len < 8);
  const dist = (a, b) => Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  function gestureStart(a, b) {
    if (stroke) { current.cells.set(stroke.before); stroke = null; paperDirty = true; } // a pinch is not a dab
    pan = null; trayOpen = false; anim = null; lastPtr = null; lastTap = null;
    pinch = { d0: dist(a, b), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: { ...view } };
  }
  function gestureMove(a, b) {
    if (!pinch) return;
    const r = range(), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v = pinch.view;
    const cell = clamp((v.cell * dist(a, b)) / pinch.d0, r.min, r.max);
    // the paper point first under the fingers stays under them
    setView(viewAround(cell, (pinch.mid.x - v.ox) / v.cell, (pinch.mid.y - v.oy) / v.cell, mid.x, mid.y, current.w, current.h, W, H));
  }
  function gestureEnd() { if (pinch) hint('zoom', LINES.zoomed); pinch = null; }
  // Mouse wheel scrolls; with ctrl (or a trackpad pinch) it zooms.
  function wheel(x, y, dx, dy, zoom) {
    if (inBook) { scrollBook(dy); return; }
    if (grow || pinch) return;
    if (zoom) zoomAt(Math.exp(-dy * 0.0025), x, y); else panBy(-dx, -dy);
  }
  function key(e) {
    if (inBook) { bookKey(e); return; }
    if (e.key === 'Escape') leave();
    else if (e.key === '+' || e.key === '=') zoomAt(1.3, W / 2, H / 2);
    else if (e.key === '-' || e.key === '_') zoomAt(1 / 1.3, W / 2, H / 2);
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) undo();
    else if (e.key.startsWith('Arrow')) {
      panBy(e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowRight' ? -40 : 0, e.key === 'ArrowUp' ? 40 : e.key === 'ArrowDown' ? -40 : 0);
    }
  }

  /* ---- the book ---- */
  // Paintings the line has no room for. Tap one for a word from Sadie; hold it for
  // save, hang (when the line has room) and delete (held, no undo). See docs/painting.md.
  const bookLay = () => layoutBook(book.length, W, H, u);
  const cardRect = (i) => { const c = bookLay().cards[i]; return { x: c.x, y: c.y - bookScroll, w: c.w, h: c.h }; };
  const scrollBook = (dy) => { bookScroll = clampScroll(bookLay(), bookScroll + dy); };
  function bookDown(x, y) {
    refreshTray();
    if (chooser.down(x, y)) return;
    if (inRect(tray.back, x, y)) { env.sound.play('tab'); leave(); return; }
    bookPtr = { x, y, s0: bookScroll, i: cardAt(bookLay(), bookScroll, x, y), t0: env.now(), moved: false };
  }
  function bookMove(x, y) {
    if (chooser.isOpen()) { chooser.move(x, y); return; }
    const b = bookPtr;
    if (!b) return;
    if (!b.moved && Math.hypot(x - b.x, y - b.y) > 6 * u) b.moved = true;
    if (b.moved) bookScroll = clampScroll(bookLay(), b.s0 - (y - b.y));
  }
  function bookUp() {
    if (chooser.isOpen()) { bookChoice(chooser.up()); return; }
    const b = bookPtr;
    bookPtr = null;
    if (b && !b.moved && b.i >= 0) { // a tap: paint on this one
      const p = takeToEasel(book, b.i, current, isBlank(current));
      if (p) { putOnEasel(p); env.edit(); }
    }
  }
  function bookKey(e) {
    if (e.key === 'Escape') { if (chooser.isOpen()) chooser.close(); else leave(); }
    else if (e.key === 'ArrowDown') scrollBook(40 * u);
    else if (e.key === 'ArrowUp') scrollBook(-40 * u);
  }
  function bookUpdate() {
    const b = bookPtr;
    if (b && !b.moved && b.i >= 0 && !chooser.isOpen() && env.now() - b.t0 > LONG_PRESS_MS) { // held on a painting
      bookPtr = null;
      env.sound.play('hang');
      chooser.open([
        { k: 'save', sprite: sprite('i-save', mkSaveIcon) },
        { k: 'hang', sprite: sprite('hang', mkHang), dim: lineIsFull(hung) },
        { k: 'delete', sprite: sprite('i-trash', mkTrashIcon), hold: true },
      ], cardRect(b.i), W, H, u, b.i);
    }
    const ev = chooser.update();
    if (ev) bookChoice(ev);
  }
  function bookChoice(ev) {
    if (!ev) return;
    const i = chooser.context();
    if (ev.hint) { say(LINES.deleteHint); return; }
    if (ev.k === 'hang' && lineIsFull(hung)) { env.sound.play('tool'); say(LINES.lineFull); return; } // stays open: save or delete still work
    chooser.close();
    if (ev.k === 'save') { env.sound.play('hang'); say(LINES.saving); savePng(book[i], 'sadies-book-painting-' + (i + 1) + '.png'); }
    else if (ev.k === 'delete') { remove(book, i); scrollBook(0); persist(); env.sound.play('pop'); say(pick(LINES.deleted)); }
    else if (ev.k === 'hang') env.hang({ book: i });
  }
  function drawBook(c) {
    const lay = bookLay();
    bookScroll = clampScroll(lay, bookScroll);
    drawBookPage(c, W, H, u, book, lay, bookScroll);
    const b = bookPtr;
    if (b && !b.moved && b.i >= 0 && !chooser.isOpen() && env.now() - b.t0 > HOLD_RING_DELAY_MS) { // a hold is filling in: show it below the finger
      const r = holdRingSpot(b.x, b.y, W, H, u);
      drawHoldRing(c, r.x, r.y, u, (env.now() - b.t0) / LONG_PRESS_MS);
    }
    const door = sprite('back', mkBack);
    c.globalAlpha = 0.8;
    c.drawImage(door, 3 * u, 3 * u, door.width * u, door.height * u);
    c.globalAlpha = 1;
    chooser.draw(c);
  }
  // Hang painting i of the book on the line (the caller checked there is room).
  function beginHangFromBook(i) {
    const p = book[i];
    if (!p || lineIsFull(hung)) return null;
    const inner = cardInner(cardRect(i), u), t = thumbFor(p, inner.w, inner.h), img = paintingCanvas(p);
    bookToLine(hung, book, i);
    hangingIndex = hung.length - 1; lastDest = 'back'; lineDirty = true;
    persist();
    return { img, from: { x: inner.x + t.x, y: inner.y + t.y, w: t.w, h: t.h }, paperFrom: inner, index: hangingIndex, dest: 'line' };
  }

  // The painting p (from takeToEasel) is now the one on the easel.
  function putOnEasel(p) {
    current = p; undoStack.length = 0; paperDirty = true; version++; lineDirty = true; lastTap = null;
    strokes = 0; usedColors = new Set(); manyShown = false; reopened = true;
    persist();
  }

  /* ---- hanging it up ---- */
  // Moves the easel painting to the clothesline right away (so it is saved) and
  // gives the world what it needs to animate the flight. Null if the paper is bare.
  function beginHang() {
    if (isBlank(current)) return null;
    const src = paperCanvas(), img = document.createElement('canvas');
    img.width = src.width; img.height = src.height;
    img.getContext('2d').drawImage(src, 0, 0);
    const from = placeGrid(current.w, current.h, W, H); // the whole paper, however zoomed
    const done = current;
    const { dest, index } = addFinished(hung, book, done); // a full line sends it to the book; nothing is dropped
    hangingIndex = dest === 'line' ? index : -1;
    lastDest = dest;
    freshPainting();
    lineDirty = true;
    persist();
    return { img, from, index, dest };
  }
  function finishHang() {
    hangingIndex = -1; lineDirty = true;
    say(pick(lastDest === 'book' ? LINES.booked : lastDest === 'back' ? LINES.fromBook : LINES.hung));
  }

  /* ---- drawing ---- */
  const sprite = (key, make) => sprites[key] || (sprites[key] = make());
  function itemSprite(k) {
    const hex = PAINT[color].hex;
    if (k.startsWith('pot')) return sprite(k, () => mkPot(PAINT[+k.slice(3)].hex));
    if (k === 'brushS') return sprite('bs' + hex, () => mkBrush(false, hex));
    if (k === 'brushB') return sprite('bb' + hex, () => mkBrush(true, hex));
    if (k === 'sponge') return sprite('sp' + hex, () => mkSponge(hex));
    if (k === 'cloth') return sprite('cloth', mkCloth);
    if (k === 'undo') return sprite('undo', mkUndo);
    if (k === 'clear') return sprite('clear', mkClear);
    return sprite('hang', mkHang);
  }

  function drawTray(c, now) {
    const e = easeOut(trayAnim), off = panelOffset(), ty = tabY();
    if (e > 0.001) {
      drawTrayBack(c, 0, H - tray.panelH + off, W, tray.panelH, u);
      for (const s of tray.shelves) drawShelf(c, s.x, s.y + off, s.w, u);
      for (const it of tray.items) {
        const img = itemSprite(it.k), sel = it.k === 'pot' + color || it.k === tool;
        const bt = bumps[it.k] ? (now - bumps[it.k]) / 1000 : 9, bump = bt < 0.3 ? Math.round(Math.sin((bt / 0.3) * Math.PI) * 4 * u) : 0;
        const w = img.width * u, h = img.height * u, x = Math.round(it.cx - w / 2), y = it.base - h - (sel ? 3 * u : 0) - bump + off;
        if (sel) { c.fillStyle = 'rgba(255,250,220,.55)'; c.fillRect(x - u, it.base + off - u, w + 2 * u, 2 * u); }
        c.drawImage(img, x, y, w, h);
        if (it.k === 'clear' && clearHold) { // water rising in the bucket while it is held
          const fill = clamp((env.now() - clearHold.t0) / CLEAR_HOLD_MS, 0, 1);
          c.fillStyle = 'rgba(46,124,246,.5)'; c.fillRect(x, y + h - Math.round(h * fill), w, Math.round(h * fill));
        }
        if (sel) { const f = Math.floor(now / 180) % 4; c.drawImage(SPARK[f === 3 ? 1 : f], x + w - 2 * u, y - 3 * u, 7 * u, 7 * u); }
      }
    }
    drawHandle(c, tray.tab.x, ty, tray.tab.w, tray.tab.h, u, PAINT[color].hex, sprite(trayOpen ? 'chevD' : 'chevU', () => mkChevron(!trayOpen)));
    const door = sprite('back', mkBack);
    c.globalAlpha = 0.8;
    c.drawImage(door, 3 * u, 3 * u, door.width * u, door.height * u);
    c.globalAlpha = 1;
  }

  const DRIFT_SPEED = 240; // canvas pixels a second when painting at the very edge of a zoomed paper
  function update(dt) {
    refreshTray();
    if (inBook) { bookUpdate(); return; }
    if (clearHold && env.now() - clearHold.t0 >= CLEAR_HOLD_MS) clearAll();
    const target = trayOpen ? 1 : 0;
    trayAnim = env.reducedMotion ? target : clamp(trayAnim + (target ? dt * 5 : -dt * 6), 0, 1);
    if (grow && lastPtr) {
      const dead = 5 * u, full = 30 * u, d = outward[grow.side](grow, lastPtr.x, lastPtr.y), mag = Math.abs(d);
      if (mag > dead) {
        grow.acc += Math.sign(d) * Math.min(1, (mag - dead) / (full - dead)) * GROW_RATE * dt;
        const n = Math.round(grow.acc);
        if (n !== grow.n) growTo(n);
      }
    }
    if (anim) {
      anim.t = Math.min(1, anim.t + dt / 0.3);
      const e = anim.t * anim.t * (3 - 2 * anim.t), a = anim.from, b = anim.to;
      setView({ cell: a.cell + (b.cell - a.cell) * e, ox: a.ox + (b.ox - a.ox) * e, oy: a.oy + (b.oy - a.oy) * e });
      if (anim.t >= 1) anim = null;
    }
    if (stroke && lastPtr && !pinch) { // painting near an edge of a zoomed paper carries the view along
      const band = Math.min(W, H) * 0.1, push = (p, size) => (p < band ? (band - p) / band : p > size - band ? -(p - (size - band)) / band : 0);
      const dx = push(lastPtr.x, W) * DRIFT_SPEED * dt, dy = push(lastPtr.y, H) * DRIFT_SPEED * dt;
      if (dx || dy) {
        const ox = view.ox, oy = view.oy;
        panBy(dx, dy);
        if (view.ox !== ox || view.oy !== oy) pointerMove(lastPtr.x, lastPtr.y); // keep painting under the finger
      }
    }
    if (!stroke && !pinch && !anim && !hinted.tabs && tabsOn().length) hint('tabs', LINES.tabs);
  }
  // While a tab is held: new paper is tinted and a ruler of ticks (every 10 cells) runs along
  // the pulled axis, so growing and shrinking are easy to see on blank paper.
  function drawPullCues(c) {
    const k = place.cell, n = grow.n, side = grow.side, horiz = side === 'left' || side === 'right';
    if (n > 0) {
      c.fillStyle = 'rgba(255,214,10,.28)';
      const len = n * k;
      if (side === 'right') c.fillRect(place.x + place.w - len, place.y, len, place.h);
      else if (side === 'left') c.fillRect(place.x, place.y, len, place.h);
      else if (side === 'bottom') c.fillRect(place.x, place.y + place.h - len, place.w, len);
      else c.fillRect(place.x, place.y, place.w, len);
    }
    c.fillStyle = 'rgba(75,58,94,.55)';
    const t = Math.max(1, Math.round(u / 2)), size = 4 * u, total = horiz ? current.w : current.h;
    for (let i = 10; i < total; i += 10) {
      const p = (horiz ? place.x : place.y) + i * k;
      if (horiz) { c.fillRect(Math.round(p), Math.round(place.y), t, size); c.fillRect(Math.round(p), Math.round(place.y + place.h - size), t, size); }
      else { c.fillRect(Math.round(place.x), Math.round(p), size, t); c.fillRect(Math.round(place.x + place.w - size), Math.round(p), size, t); }
    }
  }
  function draw(c, now) {
    if (inBook) { drawBook(c); return; }
    const k = place.cell, covers = place.x <= k && place.y <= k && place.x + place.w >= W - k && place.y + place.h >= H - k; // within a cell counts: plain paper fills the rest
    c.fillStyle = covers ? PAPER : WOOD_TRIM; // the bare table shows when the paper is smaller than the screen
    c.fillRect(0, 0, W, H);
    if (!covers) { c.fillStyle = SHADOW; c.fillRect(place.x + 2 * u, place.y + 2 * u, place.w, place.h); }
    c.drawImage(paperCanvas(), place.x, place.y, place.w, place.h);
    if (grow) drawPullCues(c);
    const arrow = (t) => sprite('arrow' + t.side, () => mkArrow({ top: 'up', bottom: 'down', left: 'left', right: 'right' }[t.side]));
    c.globalAlpha = 0.9;
    for (const t of peekOn()) drawEdgeTab(c, t.x, t.y, t.w, t.h, u, arrow(t));
    c.globalAlpha = 1;
    for (const t of tabsOn()) drawEdgeTab(c, Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h), u, sprite('arrow' + t.side, () => mkArrow({ top: 'up', bottom: 'down', left: 'left', right: 'right' }[t.side])));
    drawTray(c, now);
  }

  /* ---- what the room shows ---- */
  const room = {
    // The easel paper: the painting fitted into the board (room pixels).
    drawBoard(c, r) {
      if (!current) return;
      if (!board || board.w !== r.w || board.h !== r.h || boardVersion !== version) {
        board = new Px(r.w, r.h);
        const v = fitted(current, r.w, r.h);
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const val = v[y * r.w + x]; board.p(x, y, val ? PAINT[val - 1].hex : PAPER); }
        board.done(); boardVersion = version;
      }
      c.drawImage(board.c, r.x, r.y);
    },
    drawLine(c, anchor) {
      if (lineDirty || !lineCanvas) { lineCanvas = drawClothesline(hung, hangingIndex); lineDirty = false; }
      c.drawImage(lineCanvas, anchor.x, anchor.y);
    },
    slotRect: (i, anchor) => slotRect(i, anchor, hung[i]),
    // Where a w x h picture lands inside frame i when it is hung (room pixels).
    pictureRect(i, anchor, w, h) {
      const box = slotPicture(slotRect(i, anchor, hung[i]), hung[i]), f = fitRect(w, h, box.w, box.h);
      return { x: box.x + f.x, y: box.y + f.y, w: f.w, h: f.h };
    },
    pictureBox: (i, anchor) => slotPicture(slotRect(i, anchor, hung[i]), hung[i]),
    // Index of the hung painting under (wx, wy), or -1.
    hit(wx, wy, anchor) {
      for (let i = hung.length - 1; i >= 0; i--) {
        if (i === hangingIndex) continue;
        const r = slotRect(i, anchor, hung[i]);
        if (wx >= r.x && wx < r.x + r.w && wy >= r.y - 4 && wy < r.y + r.h) return i;
      }
      return -1;
    },
    tap: () => say(pick(LINES.art)),
    // Where a hung or booked painting lands when it flies in (room pixels): the line's frame, or the book's cover.
    landing(h, anchors) {
      if (h.dest === 'book') {
        const b = anchors.book, cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = { x: cx - 26, y: cy - 28, w: 52, h: 38 };
        const f = fitRect(h.img.width, h.img.height, r.w, r.h);
        return { slot: r, box: r, pic: { x: r.x + f.x, y: r.y + f.y, w: f.w, h: f.h } };
      }
      const a = anchors.clothesline;
      return { slot: slotRect(h.index, a, hung[h.index]), box: slotPicture(slotRect(h.index, a, hung[h.index]), hung[h.index]), pic: room.pictureRect(h.index, a, h.img.width, h.img.height) };
    },
    // Long press on hung painting i: what to offer, and the frame to light up (room pixels).
    longPress: (i, anchor) => ({
      rect: slotRect(i, anchor, hung[i]),
      items: [
        { k: 'save', sprite: sprite('i-save', mkSaveIcon) },
        { k: 'book', sprite: sprite('i-book', mkBookIcon) },
        { k: 'delete', sprite: sprite('i-trash', mkTrashIcon), hold: true },
      ],
    }),
    // The child chose k for hung painting i. Says what the world should show: { rect, fx }.
    choose(i, k, anchor) {
      const rect = slotRect(i, anchor, hung[i]);
      if (k === 'save') { env.sound.play('hang'); say(LINES.saving); savePng(hung[i], 'sadies-painting-' + (i + 1) + '.png'); return { rect, fx: 'sparkle' }; }
      if (k === 'book') { lineToBook(hung, book, i); lineDirty = true; persist(); env.sound.play('pop'); say(pick(LINES.toBook)); return { rect, fx: 'toBook' }; }
      remove(hung, i); lineDirty = true; persist(); env.sound.play('pop'); say(pick(LINES.deleted)); // delete
      return { rect, fx: 'poof' };
    },
    hint: () => say(LINES.deleteHint),
    // Tap on hung painting i: paint on it. It comes to the easel; the easel's painting takes its place on the line.
    edit(i) {
      const p = takeToEasel(hung, i, current, isBlank(current));
      if (!p) return false;
      putOnEasel(p);
      return true;
    },
  };

  return {
    id: ID, load, save, open, close, resize, prepare,
    pointerDown, pointerMove, pointerUp, key, update, draw, room,
    canGesture, gestureStart, gestureMove, gestureEnd, wheel,
    beginHang, beginHangFromBook, finishHang,
    isBlank: () => !current || isBlank(current),
    snapshot: paperCanvas, // full-size picture of the easel painting
    paperRect: () => place, // where the paper sits on screen when open
    boardFit: (bw, bh) => fitRect(current.w, current.h, bw, bh),
    _state: () => ({ current, hung, book, inBook, bookScroll, tool, color, trayOpen, trayAnim, natural: naturalGrid(W, H), view, tabs: tabsOn().length, peek: peekOn().length }), // for tests
    _tabs: () => tabsOn(),
    _peek: () => peekOn(),
    _tray: () => tray,
    _book: () => ({ layout: bookLay(), scroll: bookScroll, chooser: chooser.isOpen(), rects: chooser._rects() }),
  };
}
