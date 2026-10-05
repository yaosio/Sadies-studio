// The painting activity. When open it owns the whole screen: bare paper edge to
// edge, a door in the top-left corner to leave, and a small tab at the bottom
// that opens the tool tray. In the room it supplies the paper on the easel and
// the clothesline. See README.md in this folder.
import { Px, bay, clamp, K } from '../../art/px.js';
import { PAPER, PAPER_SPECK, PAINT } from '../../art/palette.js';
import { encodePainting, decodePainting } from '../../save/codec.js';
import { pick, easeOut } from '../../engine/util.js';
import { TOOLS, DEFAULT_TOOL } from './tools.js';
import { newPainting, isBlank, placeGrid, stamp, strokeLine, MAX_HUNG, PAPER_IDS, paperGrid, growPainting, growPad, zoomLevels, startCell, clampView, viewAround } from './grid.js';
import { fitRect, fitted } from './thumb.js';
import { layoutTray, inRect } from './tray.js';
import { mkPot, mkBrush, mkSponge, mkCloth, mkHang, mkPaper, mkMore, mkZoom, mkHand, mkBack, mkChevron, drawShelf, drawTrayBack, drawHandle } from './art.js';
import { drawClothesline, slotRect, slotPicture } from './clothesline-art.js';
import { examplePaintings } from './examples.js';
import { savePng } from './export.js';
import { PAINTING_LINES as LINES } from './lines.js';
import { SPARK } from '../../art/effects.js';

const ID = 'painting';

// env: { store, sound, say(text, ms), exit(), hang(), reducedMotion, now() }
export function createPainting(env) {
  let current = null; // the painting on the easel
  let hung = []; // paintings on the clothesline, oldest first
  let hangingIndex = -1; // a painting still flying to the line
  let tool = DEFAULT_TOOL, color = 0;
  let paperId = PAPER_IDS[0]; // the sheet a bare easel gets (see grid.js)
  let view = { cell: 1, ox: 0, oy: 0 }; // zoom and scroll: cell size, and where the paper's corner is on screen
  let pan = null, pinch = null, wheelAcc = 0;
  let W = 0, H = 0, u = 1, place = null, tray = null;
  let paper = null, paperDirty = true, version = 0;
  let active = false, trayOpen = false, trayAnim = 0;
  let stroke = null, strokes = 0, usedColors = new Set(), manyShown = false, lastSay = 0;
  const bumps = {}, sprites = {};
  let lineCanvas = null, lineDirty = true, board = null, boardVersion = -1;

  const persist = () => env.store.set(ID, save());
  const say = (text, ms) => { lastSay = env.now(); env.say(text, ms); };

  function save() {
    return { current: current ? encodePainting(current) : null, hung: hung.map(encodePainting) };
  }
  function load(saved) {
    if (!saved) { hung = examplePaintings(); return; } // first time ever: a couple on the line
    hung = (Array.isArray(saved.hung) ? saved.hung : []).map(decodePainting).filter(Boolean).slice(-MAX_HUNG);
    current = decodePainting(saved.current);
    lineDirty = true;
    version++;
  }

  function freshPainting() {
    const g = paperGrid(paperId, W, H);
    current = newPainting(g.w, g.h);
    startView();
    paperDirty = true; version++;
    strokes = 0; usedColors = new Set(); manyShown = false;
  }

  /* ---- zoom and scroll ---- */
  const levels = () => zoomLevels(current.w, current.h, W, H);
  const levelIndex = (cell) => { const lv = levels(); let best = 0; lv.forEach((c, i) => { if (Math.abs(c - cell) < Math.abs(lv[best] - cell)) best = i; }); return best; };
  function setView(v) {
    view = clampView(v, current.w, current.h, W, H);
    place = { cell: view.cell, x: view.ox, y: view.oy, w: current.w * view.cell, h: current.h * view.cell };
  }
  const startView = () => { const cell = startCell(current.w, current.h, W, H); setView({ cell, ox: Math.floor((W - current.w * cell) / 2), oy: 0 }); }; // centered across, at the top
  // Step to the next zoom level (dir 1 closer, -1 farther) keeping the paper under (sx, sy) still.
  function zoomStep(dir, sx, sy) {
    const lv = levels(), i = clamp(levelIndex(view.cell) + dir, 0, lv.length - 1);
    if (lv[i] === view.cell) return false;
    setView(viewAround(lv[i], (sx - view.ox) / view.cell, (sy - view.oy) / view.cell, sx, sy, current.w, current.h, W, H));
    return true;
  }
  const panBy = (dx, dy) => setView({ cell: view.cell, ox: view.ox + dx, oy: view.oy + dy });

  function resize(w, h, unit) {
    W = w; H = h; u = unit;
    tray = layoutTray(W, H, u);
    if (!current) freshPainting();
    if (active) setView({ cell: levels()[levelIndex(view.cell)], ox: view.ox, oy: view.oy });
    else startView();
  }
  // Before the glide in: an empty easel adopts the sheet picked, shaped for this screen.
  function prepare() {
    const g = paperGrid(paperId, W, H);
    if (isBlank(current) && (current.w !== g.w || current.h !== g.h)) freshPainting();
    startView();
  }
  function open() {
    active = true; trayOpen = false; trayAnim = 0; stroke = null; pan = pinch = null;
    say(pick(LINES.easel));
  }
  function close() {
    active = false; stroke = null; pan = pinch = null;
    env.store.flush();
  }

  /* ---- paper ---- */
  function renderPaper() {
    if (!paper || paper.w !== current.w || paper.h !== current.h) paper = new Px(current.w, current.h);
    const colors = [K(PAPER), ...PAINT.map((c) => K(c.hex))], speck = K(PAPER_SPECK);
    for (let y = 0; y < current.h; y++) for (let x = 0; x < current.w; x++) {
      const v = current.cells[y * current.w + x];
      paper.b[y * current.w + x] = v ? colors[v] : bay(x, y) < 0.07 ? speck : colors[0];
    }
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
      if (tool === 'cloth' || tool === 'hand') tool = DEFAULT_TOOL;
      env.sound.play('pot', color);
      say(LINES.colors[PAINT[color].name]);
    } else if (TOOLS[k]) {
      tool = k; env.sound.play('tool'); say(LINES.tools[k]);
    } else if (k === 'hand') {
      tool = 'hand'; env.sound.play('tool'); say(LINES.hand);
    } else if (k === 'zoom') {
      const lv = levels(), i = levelIndex(view.cell), next = i + 1 < lv.length ? lv[i + 1] : lv[0];
      env.sound.play('tool');
      if (lv.length === 1) { say(LINES.zoomNone); return; }
      setView(viewAround(next, (W / 2 - view.ox) / view.cell, (H / 2 - view.oy) / view.cell, W / 2, H / 2, current.w, current.h, W, H));
      say(next === lv[0] ? LINES.zoomAll : LINES.zoomIn);
    } else if (k === 'paper') {
      env.sound.play('tool');
      if (!isBlank(current)) { say(LINES.paperUsed); return; }
      paperId = PAPER_IDS[(PAPER_IDS.indexOf(paperId) + 1) % PAPER_IDS.length];
      freshPainting();
      say(LINES.paper[paperId]);
    } else if (k === 'more') {
      const pad = growPad(current), bigger = growPainting(current, pad);
      env.sound.play('tool');
      if (!bigger) { say(LINES.moreMax); return; }
      const cell = view.cell, at = { x: view.ox, y: view.oy };
      current = bigger; paperDirty = true; version++;
      setView({ cell: levels()[levelIndex(cell)], ox: at.x - pad * cell, oy: at.y - pad * cell }); // the painting stays where it was
      persist();
      say(LINES.more);
    } else if (k === 'hang') {
      if (isBlank(current)) { env.sound.play('tool'); say(LINES.empty); } else env.hang();
    }
  }

  function pointerDown(x, y, opts) {
    if (inRect(tray.back, x, y)) { env.sound.play('tab'); leave(); return; }
    if (tabHit(x, y)) { toggleTray(); return; }
    if (trayAnim > 0.02 && y >= H - tray.panelH + panelOffset()) {
      if (trayAnim > 0.4) {
        const off = panelOffset();
        for (const it of tray.items) if (inRect({ ...it.hit, y: it.hit.y + off }, x, y)) { press(it); break; }
      }
      return; // never paint through the tray
    }
    if (tool === 'hand' || (opts && opts.pan)) { pan = { x, y, ox: view.ox, oy: view.oy }; trayOpen = false; return; }
    const c = cellAt(x, y, false);
    if (!c) return;
    trayOpen = false; // starting to paint tucks the tray away
    stroke = { last: c, len: 0, before: current.cells.slice() }; // kept so a second finger can take the dab back
    stamp(current, c[0], c[1], tool, color);
    paperDirty = true;
  }
  function pointerMove(x, y) {
    if (pan) { setView({ cell: view.cell, ox: pan.ox + x - pan.x, oy: pan.oy + y - pan.y }); return; }
    if (!stroke) return;
    const c = cellAt(x, y, true);
    stroke.len++;
    strokeLine(current, stroke.last, c, tool, color);
    stroke.last = c; paperDirty = true;
  }
  const pointerUp = () => { if (pan) { pan = null; return; } endStroke(); };
  const leave = () => { say(LINES.bye, 2600); env.exit(); };
  // Two fingers: move the paper and step through the zoom levels. A stroke
  // already under way (a palm resting down) is left alone.
  const canGesture = () => !stroke || stroke.len < 8;
  const dist = (a, b) => Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  function gestureStart(a, b) {
    if (stroke) { current.cells.set(stroke.before); stroke = null; paperDirty = true; } // a pinch is not a dab
    pan = null; trayOpen = false;
    pinch = { d0: dist(a, b), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: { ...view }, i0: levelIndex(view.cell) };
  }
  function gestureMove(a, b) {
    if (!pinch) return;
    const lv = levels(), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const i = clamp(pinch.i0 + Math.round(Math.log(dist(a, b) / pinch.d0) / Math.log(1.5)), 0, lv.length - 1);
    const v = pinch.view; // the paper point first under the fingers stays under them
    setView(viewAround(lv[i], (pinch.mid.x - v.ox) / v.cell, (pinch.mid.y - v.oy) / v.cell, mid.x, mid.y, current.w, current.h, W, H));
  }
  const gestureEnd = () => { pinch = null; };
  // Mouse wheel scrolls; with ctrl (or a trackpad pinch) it zooms.
  function wheel(x, y, dx, dy, zoom) {
    if (!zoom) { panBy(-dx, -dy); return; }
    wheelAcc += dy;
    if (Math.abs(wheelAcc) < 30) return;
    zoomStep(wheelAcc < 0 ? 1 : -1, x, y);
    wheelAcc = 0;
  }
  function key(e) {
    if (e.key === 'Escape') leave();
    else if (e.key === '+' || e.key === '=') zoomStep(1, W / 2, H / 2);
    else if (e.key === '-' || e.key === '_') zoomStep(-1, W / 2, H / 2);
    else if (e.key.startsWith('Arrow')) {
      const d = 4 * view.cell;
      panBy(e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0, e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0);
    }
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
    if (hung.length >= MAX_HUNG) hung.shift();
    hung.push(done);
    hangingIndex = hung.length - 1;
    freshPainting();
    lineDirty = true;
    persist();
    return { img, from, index: hangingIndex };
  }
  function finishHang() {
    hangingIndex = -1; lineDirty = true;
    say(pick(LINES.hung));
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
    if (k === 'hand') return sprite('hand', mkHand);
    if (k === 'zoom') return sprite('zoom', mkZoom);
    if (k === 'more') return sprite('more', mkMore);
    if (k === 'paper') return sprite('paper' + paperId, () => mkPaper(paperId));
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
        if (sel) { const f = Math.floor(now / 180) % 4; c.drawImage(SPARK[f === 3 ? 1 : f], x + w - 2 * u, y - 3 * u, 7 * u, 7 * u); }
      }
    }
    drawHandle(c, tray.tab.x, ty, tray.tab.w, tray.tab.h, u, PAINT[color].hex, sprite(trayOpen ? 'chevD' : 'chevU', () => mkChevron(!trayOpen)));
    const door = sprite('back', mkBack);
    c.globalAlpha = 0.8;
    c.drawImage(door, 3 * u, 3 * u, door.width * u, door.height * u);
    c.globalAlpha = 1;
  }

  function update(dt) {
    const target = trayOpen ? 1 : 0;
    trayAnim = env.reducedMotion ? target : clamp(trayAnim + (target ? dt * 5 : -dt * 6), 0, 1);
  }
  function draw(c, now) {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);
    c.drawImage(paperCanvas(), place.x, place.y, place.w, place.h);
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
    // Long press: save hung painting i out as a picture.
    save(i) {
      say(LINES.saving);
      savePng(hung[i], 'sadies-painting-' + (i + 1) + '.png');
    },
  };

  return {
    id: ID, load, save, open, close, resize, prepare,
    pointerDown, pointerMove, pointerUp, key, update, draw, room,
    canGesture, gestureStart, gestureMove, gestureEnd, wheel,
    beginHang, finishHang,
    isBlank: () => !current || isBlank(current),
    snapshot: paperCanvas, // full-size picture of the easel painting
    paperRect: () => place, // where the paper sits on screen when open
    boardFit: (bw, bh) => fitRect(current.w, current.h, bw, bh),
    _state: () => ({ current, hung, tool, color, trayOpen, trayAnim, paperId, view }), // for tests
    _tray: () => tray,
  };
}
