// The world: Sadie's room on one full-screen canvas. It owns the camera, pointer
// input, Sadie, effects and the moves between the room and an activity (gliding
// in to the easel, handing the whole screen to painting, hanging a painting up).
// Room contents come from room data; activities are modules with a small
// interface (see docs/architecture.md).
import { clamp } from '../art/px.js';
import { PAPER, WOOD_TRIM, FRAME } from '../art/palette.js';
import { sadieSprite, SADIE_W, SADIE_H } from '../art/sadie.js';
import { CHEVRON_LEFT, CHEVRON_RIGHT } from '../art/effects.js';
import { pick, lerp, lerpRect, ease } from '../engine/util.js';
import { chooseScale, uiUnit } from '../engine/view.js';
import { clampCamX } from '../engine/camera.js';
import { createEffects } from './effects.js';
import { WORLD_LINES } from './lines.js';

const GLIDE_SECONDS = 0.85;
const HANG_SECONDS = 1.4;
const FIT_MARGIN = 1.16; // the easel board fills this much less than the screen when glided to
const IDLE_HINT_MS = 25000;
const LONG_PRESS_MS = 650;

// opts: { canvas, room, factories: { id: create(env) }, store, sound, speech, reducedMotion, still }
export function createWorld(opts) {
  const { canvas: cv, room, factories, store, sound, speech, reducedMotion: RM, still } = opts;
  const c = cv.getContext('2d');

  let dpr = 1, S = 1, W = 320, H = 360, u = 1;
  let geom = null, bitmap = null, anchors = null, hotspots = [];
  const cam = { x: 0, y: 0, z: 1, tx: 0 }; // x, y: top-left of the view in room pixels; tx: where x is heading
  let view = { ox: 0, oy: 0, z: 1 };
  let mode = 'room'; // room | entering | painting | leaving | hanging
  let trans = null, activeId = null, vel = 0, ptr = null, ptrId = null;
  const sadie = { blinkUntil: 0, nextBlink: 2, flick: 0, hop: 0 };
  const fx = createEffects();
  let lastInteract = 0, idleSaid = false, nextTwinkle = 1, last = 0;

  const now = () => performance.now();
  function say(text, ms) { speech.say(text, ms, now()); sadie.flick = 1; }

  /* ---------------- activities ---------------- */
  const env = {
    store, sound, reducedMotion: RM, now, say,
    exit: () => exitActivity(),
    hang: () => hangUp(),
  };
  const activities = {};
  for (const id of Object.keys(factories)) {
    activities[id] = factories[id](env);
    activities[id].load(store.get(id));
  }

  /* ---------------- sizing ---------------- */
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
    S = chooseScale(dw, dh);
    W = Math.ceil(dw / S); H = Math.ceil(dh / S);
    cv.width = W; cv.height = H;
    cv.style.width = (W * S) / dpr + 'px'; cv.style.height = (H * S) / dpr + 'px';
    u = uiUnit(S, dpr);

    const g = room.geometry(Math.max(room.minHeight, H));
    if (!geom || geom.WH !== g.WH) bitmap = room.paint(g);
    geom = g;
    const at = (a) => ({ ...a, y: g.F + a.fy });
    anchors = { board: at(room.anchors.board), clothesline: at(room.anchors.clothesline), sadie: at(room.anchors.sadie) };
    hotspots = room.hotspots.map((h) => ({ ...h, y: h.fy == null ? 0 : g.F + h.fy, h: h.h == null ? g.WH : h.h }));
    for (const id in activities) activities[id].resize(W, H, u);

    if (mode === 'room') { cam.y = roomY(); cam.z = 1; cam.tx = clampCamX(cam.tx, 1, W, room.width); cam.x = cam.tx; }
  }
  const roomY = () => geom.WH - H;

  /* ---------------- camera moves ---------------- */
  // A camera described by the room point at the middle of the screen, and a zoom.
  const centerOf = (z, x, y) => ({ z, cx: x + W / (2 * z), cy: y + H / (2 * z) });
  const roomCenter = (leftX) => centerOf(1, clampCamX(leftX, 1, W, room.width), roomY());
  function fitCenter() {
    const b = anchors.board, z = Math.min(W / (b.w * FIT_MARGIN), H / (b.h * FIT_MARGIN));
    return { z, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  }
  function setCam(a, b, e) {
    const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e));
    cam.z = z;
    cam.x = lerp(a.cx, b.cx, e) - W / (2 * z);
    cam.y = lerp(a.cy, b.cy, e) - H / (2 * z);
    cam.tx = cam.x;
  }
  const smooth = (t) => ease(clamp(t, 0, 1));

  const toScreen = (r) => ({ x: r.x * cam.z + view.ox, y: r.y * cam.z + view.oy, w: r.w * cam.z, h: r.h * cam.z });
  const fullScreen = () => ({ x: 0, y: 0, w: W, h: H });

  function enterActivity(id) {
    const act = activities[id];
    if (mode !== 'room' || !act) return;
    act.prepare();
    activeId = id; mode = 'entering'; vel = 0;
    trans = { t: 0, dur: RM ? 0.001 : GLIDE_SECONDS, from: centerOf(cam.z, cam.x, cam.y), to: fitCenter() };
  }
  function exitActivity() {
    if (mode !== 'painting') return;
    activities[activeId].close();
    mode = 'leaving';
    trans = { t: 0, dur: RM ? 0.001 : GLIDE_SECONDS, from: fitCenter(), to: roomCenter(anchors.board.x + anchors.board.w / 2 - W / 2) };
    updateCursor();
  }
  function hangUp() {
    if (mode !== 'painting') return;
    const act = activities[activeId], h = act.beginHang();
    if (!h) return;
    act.close();
    mode = 'hanging';
    const slot = act.room.slotRect(h.index, anchors.clothesline);
    trans = { t: 0, dur: RM ? 0.001 : HANG_SECONDS, from: fitCenter(), to: roomCenter(slot.x + slot.w / 2 - W / 2), h, slot };
    updateCursor();
  }
  function finishHang() {
    const act = activities[activeId], { slot } = trans;
    act.finishHang();
    for (let k = 0; k < 4; k++) fx.sparkle(slot.x + Math.random() * slot.w, slot.y + Math.random() * slot.h);
    sadie.hop = 6;
    fx.hearts(anchors.sadie.x + 26, anchors.sadie.y + 6, 4);
    sound.play('hang');
    mode = 'room'; trans = null;
  }

  /* ---------------- input ---------------- */
  const toLogical = (e) => [(e.clientX * dpr) / S, (e.clientY * dpr) / S];
  const toRoom = (sx, sy) => [(sx - view.ox) / view.z, (sy - view.oy) / view.z];
  const inBox = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const hitSadie = (sx, sy) => { const [wx, wy] = toRoom(sx, sy); return wx >= anchors.sadie.x + 6 && wx < anchors.sadie.x + 40 && wy >= anchors.sadie.y + 2 && wy < anchors.sadie.y + 34; };
  function hitRoom(sx, sy) {
    const [wx, wy] = toRoom(sx, sy);
    for (const id in activities) {
      const i = activities[id].room.hit(wx, wy, anchors.clothesline);
      if (i >= 0) return { art: activities[id], index: i };
    }
    for (const h of hotspots) if (inBox(wx, wy, h)) return h;
    return null;
  }
  const maxCamX = () => clampCamX(1e9, 1, W, room.width);
  function edgeHit(sx, sy) {
    if (Math.abs(sy - H / 2) > 36) return 0;
    if (sx < 26 && cam.tx > 1) return -1;
    if (sx > W - 26 && cam.tx < maxCamX() - 1) return 1;
    return 0;
  }
  function petSadie() {
    sadie.hop = 5;
    fx.hearts(anchors.sadie.x + 26, anchors.sadie.y + 6, 3);
    sound.play('purr');
    say(pick(WORLD_LINES.sadie));
    sadie.blinkUntil = now() / 1000 + 0.5;
  }
  function tapRoom(sx, sy) {
    const e = edgeHit(sx, sy);
    if (e) { cam.tx = clampCamX(cam.tx + e * W * 0.6, 1, W, room.width); sound.play('tab'); return; }
    if (hitSadie(sx, sy)) { petSadie(); return; }
    const h = hitRoom(sx, sy);
    if (!h) return;
    const [wx, wy] = toRoom(sx, sy);
    fx.sparkle(wx, wy);
    sound.play('pop');
    if (h.art) { h.art.room.tap(); fx.hearts(anchors.sadie.x + 26, anchors.sadie.y + 6, 1); return; }
    const a = h.action;
    if (a.activity) { enterActivity(a.activity); return; }
    if (a.glide != null) cam.tx = clampCamX(a.glide - W / 2, 1, W, room.width);
    const line = room.lines[a.say];
    if (line) say(Array.isArray(line) ? pick(line) : line);
  }
  // Holding a finger on a hung painting saves it out as a picture.
  function longPress() {
    const h = hitRoom(ptr.sx, ptr.sy);
    if (!h || !h.art) return;
    ptr.long = true;
    const [wx, wy] = toRoom(ptr.sx, ptr.sy);
    for (let k = 0; k < 3; k++) fx.sparkle(wx + (Math.random() - 0.5) * 24, wy + (Math.random() - 0.5) * 18);
    sound.play('hang');
    h.art.room.save(h.index);
  }
  function updateCursor() {
    cv.style.cursor = mode === 'painting' ? 'crosshair' : mode === 'room' ? 'grab' : 'default';
  }

  function onDown(e) {
    sound.unlock();
    sound.greetOnce();
    if (ptrId !== null) return; // one finger at a time: a resting palm must not paint
    ptrId = e.pointerId;
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* not all browsers */ }
    const [sx, sy] = toLogical(e);
    lastInteract = now();
    if (mode === 'painting') activities[activeId].pointerDown(sx, sy);
    else if (mode === 'room') {
      vel = 0; cam.tx = cam.x; // catching a flick stops it right where it is, no jump
      ptr = { sx, sy, camX: cam.x, moved: false, downT: now(), long: false, samples: [{ t: now(), x: sx }] };
    }
  }
  function onMove(e) {
    const [sx, sy] = toLogical(e);
    if (e.pointerId !== ptrId) {
      if (ptrId === null && e.pointerType === 'mouse' && mode === 'room') {
        const hot = edgeHit(sx, sy) || hitSadie(sx, sy) || hitRoom(sx, sy);
        cv.style.cursor = hot ? 'pointer' : 'grab';
      }
      return;
    }
    if (mode === 'painting') {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) { const [a, b] = toLogical(ev); activities[activeId].pointerMove(a, b); }
      return;
    }
    if (ptr) {
      const dx = sx - ptr.sx;
      if (!ptr.moved && Math.abs(dx) + Math.abs(sy - ptr.sy) > 5) ptr.moved = true;
      if (ptr.moved) {
        cam.tx = clampCamX(ptr.camX - dx / cam.z, cam.z, W, room.width); cam.x = cam.tx;
        const t = now();
        ptr.samples.push({ t, x: sx });
        while (ptr.samples.length > 2 && t - ptr.samples[0].t > 120) ptr.samples.shift();
      }
    }
  }
  function onUp(e) {
    if (e.pointerId !== ptrId) return;
    ptrId = null;
    if (mode === 'painting') { activities[activeId].pointerUp(); return; }
    if (ptr) {
      const [sx, sy] = toLogical(e);
      if (ptr.long) { /* a long press already did its thing */ }
      else if (!ptr.moved) tapRoom(sx, sy);
      else vel = flickVelocity(ptr);
      ptr = null;
    }
  }
  // Speed of the last ~100 ms of the drag, in room pixels per second. A finger
  // that stopped before lifting leaves no flick.
  function flickVelocity(p) {
    const t = now(), last = p.samples[p.samples.length - 1], first = p.samples[0];
    if (t - last.t > 80 || last.t - first.t < 16) return 0;
    return clamp(-((last.x - first.x) / cam.z) / ((last.t - first.t) / 1000), -1800, 1800);
  }
  function onCancel(e) {
    if (e.pointerId !== ptrId) return;
    ptrId = null; ptr = null;
    if (mode === 'painting') activities[activeId].pointerUp();
  }
  function onKey(e) {
    sound.unlock();
    if (mode === 'painting') activities[activeId].key(e);
    else if (mode === 'room' && e.key === 'Enter') enterActivity('painting');
  }

  /* ---------------- per frame ---------------- */
  function advanceTransition(dt) {
    trans.t += dt / trans.dur;
    const t = trans.t;
    if (mode === 'entering') {
      setCam(trans.from, trans.to, smooth(t));
      if (t >= 1) { mode = 'painting'; trans = null; setCam(fitCenter(), fitCenter(), 1); activities[activeId].open(); updateCursor(); }
    } else if (mode === 'leaving') {
      setCam(trans.from, trans.to, smooth(t));
      if (t >= 1) { mode = 'room'; trans = null; cam.z = 1; cam.y = roomY(); cam.x = cam.tx = clampCamX(cam.x, 1, W, room.width); updateCursor(); }
    } else if (mode === 'hanging') {
      setCam(trans.from, trans.to, smooth(t));
      if (t >= 1.1) finishHang();
    }
  }

  function update(dt, T) {
    if (trans) advanceTransition(dt);
    if (mode === 'painting') { activities[activeId].update(dt); return; }
    if (mode === 'room') {
      if (!ptr && Math.abs(vel) > 4) {
        cam.tx = clampCamX(cam.tx + vel * dt, 1, W, room.width); cam.x = cam.tx; vel *= Math.pow(0.03, dt);
        if (cam.tx <= 0 || cam.tx >= maxCamX()) vel = 0;
      }
      if (ptr && !ptr.moved && !ptr.long && now() - ptr.downT > LONG_PRESS_MS) longPress();
      const k = RM ? 1 : 1 - Math.exp(-dt * 6);
      if (!ptr || !ptr.moved) cam.x += (cam.tx - cam.x) * k;
      if (Math.abs(cam.x - cam.tx) < 0.02) cam.x = cam.tx;
    }
    if (!still) {
      if (T > sadie.nextBlink) { sadie.blinkUntil = T + (Math.random() < 0.25 ? 0.6 : 0.14); sadie.nextBlink = T + 2.5 + Math.random() * 3.5; }
      if (sadie.flick <= 0 && Math.random() < dt * 0.15) sadie.flick = 1;
    }
    if (sadie.flick > 0) sadie.flick = Math.max(0, sadie.flick - dt * 1.4);
    if (sadie.hop > 0) sadie.hop = Math.max(0, sadie.hop - dt * 22);
    fx.update(dt);
    if (!still && mode === 'room' && T > nextTwinkle) {
      nextTwinkle = T + 1.4 + Math.random();
      const pool = hotspots.filter((h) => h.fy != null && !/door/.test(h.id));
      const h = Math.random() < 0.35 ? hotspots[0] : pick(pool);
      fx.sparkle(h.x + 6 + Math.random() * (h.w - 12), h.y + 4 + Math.random() * Math.min(40, h.h - 8));
    }
    if (!still && mode === 'room' && !idleSaid && now() - lastInteract > IDLE_HINT_MS) { idleSaid = true; say(WORLD_LINES.idle); }
  }

  function drawPaperOverlay(paper, img, source, frame) {
    const r = (v) => Math.round(v);
    if (frame) { c.fillStyle = FRAME; c.fillRect(r(paper.x - frame), r(paper.y - frame), r(paper.w + 2 * frame), r(paper.h + 2 * frame)); }
    c.fillStyle = PAPER;
    c.fillRect(r(paper.x), r(paper.y), r(paper.w), r(paper.h));
    c.drawImage(source, r(img.x), r(img.y), r(img.w), r(img.h));
  }

  function drawTransitionPaper() {
    const act = activities[activeId], t = trans.t;
    if (mode === 'hanging') {
      const e = smooth(t), arc = Math.sin(clamp(t, 0, 1) * Math.PI) * H * 0.12;
      const box = toScreen(act.room.pictureBox(trans.h.index, anchors.clothesline));
      const pic = toScreen(act.room.pictureRect(trans.h.index, anchors.clothesline, trans.h.img.width, trans.h.img.height));
      const paper = lerpRect(fullScreen(), box, e), img = lerpRect(trans.h.from, pic, e);
      paper.y -= arc; img.y -= arc;
      drawPaperOverlay(paper, img, trans.h.img, 2 * cam.z * e);
      return;
    }
    const pe = mode === 'entering' ? smooth((t - 0.25) / 0.75) : 1 - smooth(t / 0.7);
    const b = anchors.board, bs = toScreen(b), fit = act.boardFit(b.w, b.h);
    const boardImg = toScreen({ x: b.x + fit.x, y: b.y + fit.y, w: fit.w, h: fit.h });
    drawPaperOverlay(lerpRect(bs, fullScreen(), pe), lerpRect(boardImg, act.paperRect(), pe), act.snapshot(), 0);
  }

  function draw(T, t) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    if (mode === 'painting') { activities[activeId].draw(c, still ? 0 : t); return; }
    c.fillStyle = WOOD_TRIM;
    c.fillRect(0, 0, W, H);
    const z = cam.z, ox = Math.round(-cam.x * z), oy = Math.round(-cam.y * z);
    view = { ox, oy, z };
    c.setTransform(z, 0, 0, z, ox, oy);
    c.drawImage(bitmap, 0, 0);
    for (const id in activities) { activities[id].room.drawLine(c, anchors.clothesline); activities[id].room.drawBoard(c, anchors.board); }
    c.drawImage(sadieSprite({ blinking: T < sadie.blinkUntil, flick: sadie.flick, sway: !RM && !still }, T), anchors.sadie.x, anchors.sadie.y - Math.round(sadie.hop));
    fx.draw(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (trans) drawTransitionPaper();
    if (mode === 'room' && !ptr) {
      const k = 2, b = RM || still ? 0 : Math.round(Math.sin(T * 4) * 2), cy = Math.round(H / 2 - 9);
      if (cam.tx > 1) c.drawImage(CHEVRON_LEFT, 6 + b, cy, 6 * k, 9 * k);
      if (cam.tx < maxCamX() - 1) c.drawImage(CHEVRON_RIGHT, W - 6 - 6 * k - b, cy, 6 * k, 9 * k);
    }
  }

  function placeBubble(t) {
    const f = S / dpr;
    const head = mode === 'painting' ? null : { x: ((anchors.sadie.x + 30) * view.z + view.ox) * f, y: ((anchors.sadie.y + 6 - sadie.hop) * view.z + view.oy) * f };
    speech.place(t, head, ((anchors.sadie.x + 12) * view.z + view.ox) * f);
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const T = still ? 0 : t / 1000;
    update(dt, T);
    draw(T, t);
    placeBubble(t);
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    cam.tx = clampCamX(room.startX - W / 2, 1, W, room.width); cam.x = cam.tx; cam.y = roomY();
    last = lastInteract = now();
    addEventListener('resize', resize);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onCancel);
    addEventListener('keydown', onKey);
    updateCursor();
    if (!still) setTimeout(() => say(WORLD_LINES.hello, 6000), 700);
    requestAnimationFrame(frame);
  }

  return {
    start, resize,
    // Read-only peek for tests and the smoke check.
    debug: () => ({ mode, W, H, S, u, cam: { ...cam }, anchors, view: { ...view }, vel, geom, sadieSize: [SADIE_W, SADIE_H], paintingRect: activities.painting && activities.painting.paperRect() }),
    activity: (id) => activities[id],
    sound,
    panTo: (centerX) => { cam.tx = clampCamX(centerX - W / 2, 1, W, room.width); },
    enter: enterActivity,
  };
}
