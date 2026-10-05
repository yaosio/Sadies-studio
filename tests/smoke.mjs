// Smoke test: load the real app in headless Chromium, go into painting, paint, hang it up,
// reload, and check it all survived with no console errors. `npm run smoke`.
// Runs against the source (index.html) and the single-file build (dist/index.html).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { serve } from './helpers/server.mjs';
import { launch } from './helpers/playwright.mjs';

const targets = ['index.html'];
if (existsSync(new URL('../dist/index.html', import.meta.url))) targets.push('dist/index.html');

const { server, url } = await serve();
const browser = await launch();
const until = async (page, fn, what) => {
  for (let i = 0; i < 100; i++) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); }
  throw new Error('timed out waiting for ' + what);
};

for (const target of targets) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('willReadFrequently') && !m.text().includes('AudioContext was not allowed')) errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
  page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errors.push('outside request: ' + r.url()); });

  await page.goto(`${url}/${target}?test`);
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room');
  const st = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { color: s.color, tool: s.tool, hung: s.hung.length, trayOpen: s.trayOpen, painted: s.current.cells.some(Boolean) }; });
  const first = await st();
  assert.equal(first.hung, 2, `${target}: two example paintings on the line`);

  // every sound plays without error (the first touch unlocks audio)
  await page.mouse.click(5, 5);
  await page.evaluate(() => { const s = window.__studio.sound; for (const n of s.names()) s.play(n, 3); });
  await page.waitForTimeout(100);

  // flick the room sideways: it glides on after letting go, and catching it does not jump
  const camX = () => page.evaluate(() => window.__studio.debug().cam.x);
  await page.mouse.move(800, 100); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(800 - i * 40, 100); await page.waitForTimeout(16); }
  await page.mouse.up();
  const atRelease = await camX();
  await page.waitForTimeout(150);
  const gliding = await camX();
  assert.ok(gliding - atRelease > 20, `${target}: flick keeps gliding after release (${atRelease} -> ${gliding})`);
  await page.mouse.move(500, 100);
  const before = await camX();
  await page.mouse.down();
  const caught = await camX();
  assert.ok(Math.abs(caught - before) < 25, `${target}: catching a flick does not jump (${before} -> ${caught})`);
  await page.mouse.up();

  // hold a finger on a hung painting: it is offered as a PNG download
  const slotPos = await page.evaluate(() => {
    const w = window.__studio, d = w.debug(), r = w.activity('painting').room.slotRect(0, d.anchors.clothesline);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  });
  await page.evaluate((x) => { window.__studio.panTo(x); }, slotPos.x);
  await page.waitForTimeout(900);
  const spot = await page.evaluate((p) => { const d = window.__studio.debug(); return { x: (p.x * d.view.z + d.view.ox) * d.S, y: (p.y * d.view.z + d.view.oy) * d.S }; }, slotPos);
  await page.mouse.move(spot.x, spot.y);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 3000 }), (async () => { await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); })()]);
  assert.match(download.suggestedFilename(), /^sadies-painting-1\.png$/);
  await page.evaluate(() => window.__studio.panTo(760));
  await page.waitForTimeout(900);

  // tap the easel (middle of the screen in the room view)
  const easel = await page.evaluate(() => { const d = window.__studio.debug(); return { x: d.W / 2 * d.S, y: (d.geom.F - 142) * d.S }; });
  await page.mouse.click(easel.x, easel.y);
  await until(page, () => window.__studio.debug().mode === 'painting', 'painting mode');

  // the paper takes the whole screen
  const px = await page.evaluate(() => {
    const d = window.__studio.debug(), c = document.getElementById('scene').getContext('2d');
    const at = (x, y) => Array.from(c.getImageData(x, y, 1, 1).data).slice(0, 3).join(',');
    return { d: { W: d.W, H: d.H, rect: d.paintingRect }, topRight: at(d.W - 1, 0), bottomLeft: at(0, d.H - 1), mid: at(d.W >> 1, d.H >> 1) };
  });
  const { W, H, rect } = px.d;
  assert.ok(rect.x < rect.cell * 1 + 1 && rect.y < rect.cell + 1 && rect.w > W - 2 * rect.cell && rect.h > H - 2 * rect.cell, `${target}: paper fills the screen ${JSON.stringify(px.d)}`);
  assert.equal(px.topRight, '255,250,240'); assert.equal(px.bottomLeft, '255,250,240');

  // paint a stroke
  await page.mouse.move(300, 300); await page.mouse.down();
  for (let i = 1; i <= 15; i++) await page.mouse.move(300 + i * 25, 300 + Math.sin(i) * 40);
  await page.mouse.up();
  assert.ok((await st()).painted, 'stroke painted something');

  // open the tray with its tab, pick the blue pot, which must not paint
  const tabs = await page.evaluate(() => { const d = window.__studio.debug(), t = window.__studio.activity('painting')._tray(); return { S: d.S, tab: t.tab, H: d.H, items: t.items.map((i) => ({ k: i.k, hit: i.hit })), panelH: t.panelH }; });
  const tx = (tabs.tab.x + tabs.tab.w / 2) * tabs.S, ty = (tabs.H - tabs.tab.h / 2) * tabs.S;
  await page.mouse.click(tx, ty);
  await until(page, () => window.__studio.activity('painting')._state().trayOpen, 'tray open');
  await page.waitForTimeout(400);
  const trayNow = () => page.evaluate(() => window.__studio.activity('painting')._tray().items.map((i) => ({ k: i.k, hit: i.hit })));
  const click = async (k) => { tabs.items = await trayNow(); const it = tabs.items.find((i) => i.k === k); await page.mouse.click((it.hit.x + it.hit.w / 2) * tabs.S, (it.hit.y + it.hit.h / 2) * tabs.S); };
  await click('pot4');
  assert.equal((await st()).color, 4, 'blue pot picked');
  await click('sponge');
  assert.equal((await st()).tool, 'sponge');

  // painting a new stroke tucks the tray away
  await page.mouse.move(200, 150); await page.mouse.down(); await page.mouse.move(400, 160); await page.mouse.up();
  assert.equal((await st()).trayOpen, false, 'tray tucked away');

  // hang it up
  await page.waitForTimeout(400);
  await page.mouse.click(tx, ty);
  await page.waitForTimeout(400);
  await click('hang');
  await until(page, () => window.__studio.debug().mode === 'room', 'back in the room after hanging');
  const hung = await st();
  assert.equal(hung.hung, 3, 'painting hung');
  assert.equal(hung.painted, false, 'easel is bare again');

  // leave through Escape after a short visit
  await page.keyboard.press('Enter');
  await until(page, () => window.__studio.debug().mode === 'painting', 'painting again');
  await page.keyboard.press('Escape');
  await until(page, () => window.__studio.debug().mode === 'room', 'room again');

  // it all survives a reload
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.reload();
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room after reload');
  assert.equal((await st()).hung, 3, `${target}: hung paintings survive a reload`);

  assert.deepEqual(errors, [], `${target}: no console errors or outside requests`);
  await ctx.close();
  console.log(`ok  ${target}`);
}
// Paper sizes, pull-out paper, zoom and scroll, the grid, and a tall painting hanging rolled up, on a phone.
for (const target of targets) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('willReadFrequently') && !m.text().includes('AudioContext was not allowed')) errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${url}/${target}?test`);
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room');
  await page.evaluate(() => window.__studio.enter('painting'));
  await until(page, () => window.__studio.debug().mode === 'painting', 'painting mode');
  await page.waitForTimeout(1200);
  const st = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { paper: s.paperId, w: s.current.w, h: s.current.h, view: s.view, grid: s.grid, tabs: s.tabs, painted: s.current.cells.filter(Boolean).length, hung: s.hung.length }; });
  const geo = () => page.evaluate(() => { const t = window.__studio.activity('painting')._tray(), d = window.__studio.debug(); return { S: d.S, tab: t.tab, H: d.H, items: t.items.map((i) => ({ k: i.k, hit: i.hit })) }; });
  const css = (g, v) => (v * g.S) / 2; // canvas pixels to css pixels (device scale 2)
  const openTray = async () => { const g = await geo(); await page.touchscreen.tap(css(g, g.tab.x + g.tab.w / 2), css(g, g.H - g.tab.h / 2)); await page.waitForTimeout(500); };
  const tapItem = async (k) => { const g = await geo(), it = g.items.find((i) => i.k === k); assert.ok(it, `tray has ${k}`); await page.touchscreen.tap(css(g, it.hit.x + it.hit.w / 2), css(g, it.hit.y + it.hit.h / 2)); await page.waitForTimeout(250); };
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });

  // the tray has a paper pad, a grid switch, and none of the old zoom icons; the pad opens a shelf of sheet pictures
  await openTray();
  let g = await geo();
  assert.ok(g.items.some((i) => i.k === 'paper') && g.items.some((i) => i.k === 'grid'));
  assert.ok(!g.items.some((i) => ['hand', 'zoom', 'more'].includes(i.k)), 'no zoom or hand icons');
  await tapItem('paper');
  g = await geo();
  assert.equal(g.items.filter((i) => i.k.startsWith('sheet:')).length, 5, 'five sheets to pick from');
  await tapItem('sheet:tall');
  let s = await st();
  assert.equal(s.paper, 'tall'); assert.equal(s.h, s.w * 3, `${target}: tall sheet is three times as long as wide`);
  assert.equal(s.tabs, 0, 'no tabs while the paper fills the screen');
  const startCell = s.view.cell;

  // grid is off by default, and then never shows, even while zooming
  assert.equal(s.grid, false, 'grid off by default');
  const dots = () => page.evaluate(() => { const c = document.getElementById('scene').getContext('2d'), d = window.__studio.debug(); const img = c.getImageData(0, 0, d.W, d.H).data; let n = 0; for (let i = 0; i < img.length; i += 4) if (img[i] < 200 && img[i + 1] < 200) n++; return n; });
  const blank0 = await dots();
  await touch('touchStart', [[170, 400], [220, 400]]);
  for (let i = 1; i <= 4; i++) await touch('touchMove', [[170 - i * 5, 400], [220 + i * 5, 400]]);
  assert.ok((await dots()) <= blank0 + 40, 'no grid dots while zooming with the grid off');
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  // (switching it on is remembered, below)

  // paint, then the pad is gone from the tray (the sheet cannot change under a painting)
  await page.mouse.move(100, 200); await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(100 + i * 8, 200 + i * 12);
  await page.mouse.up();
  const painted = (await st()).painted;
  assert.ok(painted > 0);
  await openTray();
  assert.ok(!(await geo()).items.some((i) => i.k === 'paper'), 'the paper pad hides once there is paint');
  await tapItem('grid');
  assert.equal((await st()).grid, true, 'grid switched on');
  await page.mouse.move(100, 400); await page.mouse.down(); await page.mouse.up(); // tuck the tray away
  const afterTap = (await st()).painted;

  // pinch out: smooth, not snapped to steps; a pinch paints nothing
  const cells = [];
  await touch('touchStart', [[170, 400], [220, 400]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[170 - i * 5, 400], [220 + i * 5, 400]]); cells.push((await st()).view.cell); }
  await touch('touchEnd', []);
  s = await st();
  assert.ok(s.view.cell > startCell, `${target}: pinch zooms in (${startCell} -> ${s.view.cell})`);
  assert.ok(new Set(cells.map((c) => c.toFixed(2))).size >= 6, 'zoom changes smoothly, not in steps');
  assert.ok(cells.some((c) => c !== Math.round(c)), 'cell sizes between whole numbers are allowed');
  assert.ok(s.painted <= afterTap, 'a pinch paints nothing');
  // two fingers drag the paper
  const y0 = s.view.oy;
  await touch('touchStart', [[150, 600], [230, 600]]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[150, 600 - i * 20], [230, 600 - i * 20]]);
  await touch('touchEnd', []);
  assert.ok((await st()).view.oy < y0, 'two fingers scroll the paper');

  // double tap goes out to the whole paper, with its pull-out tabs, and does not leave dabs
  const before = (await st()).painted;
  await page.touchscreen.tap(200, 300); await page.waitForTimeout(80); await page.touchscreen.tap(200, 300);
  await page.waitForTimeout(700);
  s = await st();
  assert.equal(s.painted, before, 'a double tap leaves no dabs');
  assert.equal(s.tabs, 4, `${target}: the whole paper shows four pull-out tabs`);
  // pull the right tab outward and hold: paper unrolls without a long swipe; the painting stays
  const tab = await page.evaluate(() => { const d = window.__studio.debug(), t = window.__studio.activity('painting')._tabs().find((x) => x.side === 'right'); return { x: t.x + t.w / 2, y: t.y + t.h / 2, S: d.S, depth: t.w }; });
  assert.ok(tab.depth * tab.S / 2 >= 24, `${target}: tabs are big enough for a finger (${tab.depth * tab.S / 2} css px deep)`);
  const tx = (tab.x * tab.S) / 2, ty = (tab.y * tab.S) / 2;
  await page.mouse.move(tx, ty); await page.mouse.down();
  await page.mouse.move(tx + 18, ty);
  await page.waitForTimeout(900); // held, not swiped
  await page.mouse.up();
  const wider = await st();
  assert.ok(wider.w > s.w + 10 && wider.h === s.h && wider.painted === s.painted, `${target}: holding the tab adds paper and keeps the paint (${s.w} -> ${wider.w})`);
  // push it back in: bare paper goes, paint stays, and it stops at the paint
  const tab2 = await page.evaluate(() => { const d = window.__studio.debug(), t = window.__studio.activity('painting')._tabs().find((x) => x.side === 'right'); return { x: t.x + t.w / 2, y: t.y + t.h / 2, S: d.S }; });
  await page.mouse.move((tab2.x * tab2.S) / 2, (tab2.y * tab2.S) / 2); await page.mouse.down();
  await page.mouse.move((tab2.x * tab2.S) / 2 - 80, (tab2.y * tab2.S) / 2);
  await page.waitForTimeout(2500);
  await page.mouse.up();
  const smaller = await st();
  assert.ok(smaller.w < wider.w && smaller.painted === wider.painted, `${target}: pushing the tab in shrinks the paper without losing paint (${wider.w} -> ${smaller.w})`);
  // mouse wheel scrolls, ctrl-wheel zooms
  await page.mouse.move(200, 300);
  const c0 = (await st()).view.cell;
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -200); await page.keyboard.up('Control');
  await page.waitForTimeout(100);
  assert.ok((await st()).view.cell > c0, 'ctrl-wheel zooms in');

  // hang it: the tall painting hangs rolled up, behind the easel, and survives a reload in IndexedDB with the grid setting
  await openTray(); await tapItem('hang');
  await until(page, () => window.__studio.debug().mode === 'room', 'room after hanging');
  const hung = await page.evaluate(() => { const a = window.__studio.activity('painting'), d = window.__studio.debug(), i = a._state().hung.length - 1; return { i, rect: a.room.slotRect(i, d.anchors.clothesline) }; });
  assert.ok(hung.rect.h > 60, `${target}: a tall painting hangs taller than the standard frame (${hung.rect.h})`);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  assert.ok(dbs.includes('sadies-studio'), `${target}: paintings are kept in IndexedDB`);
  await page.reload();
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room after reload');
  const back = await st();
  assert.equal(back.hung, 3, 'the tall painting survived the reload');
  assert.equal(back.grid, true, 'the grid setting survived the reload');
  assert.deepEqual(errors, [], `${target}: no console errors`);
  await ctx.close();
  console.log(`ok  ${target} paper sizes and zoom`);
}
// Sadie's trill: it is a roll (about 28 pulses a second) that rises, not a coin chime.
{
  const page = await browser.newPage();
  await page.goto(`${url}/index.html?test`);
  const pulses = await page.evaluate(async () => {
    const { trill } = await import('/src/audio/sound.js');
    const rate = 22050, ctx = new OfflineAudioContext(1, rate, rate);
    trill(ctx, ctx.destination, 0);
    const data = (await ctx.startRendering()).getChannelData(0), win = 110; // 5 ms windows
    const rms = [];
    for (let i = 0; i + win < rate * 0.4; i += win) { let s = 0; for (let j = 0; j < win; j++) s += data[i + j] ** 2; rms.push(Math.sqrt(s / win)); }
    const part = rms.slice(10), mean = part.reduce((a, b) => a + b) / part.length;
    let up = 0; for (let i = 1; i < part.length; i++) if (part[i - 1] < mean && part[i] >= mean) up++;
    return { up, secs: part.length * 0.005, peak: Math.max(...rms) };
  });
  assert.ok(pulses.peak > 0.02, 'the trill makes sound');
  const hz = pulses.up / pulses.secs;
  assert.ok(hz > 18 && hz < 40, `trill rolls at about 28 pulses a second (measured ${hz.toFixed(1)})`);
  await page.close();
  console.log('ok  trill shape');
}

// The trill plays on load when the browser allows sound, otherwise on the first touch.
for (const [label, args, expectOnLoad] of [['autoplay allowed', ['--autoplay-policy=no-user-gesture-required'], true], ['autoplay blocked', ['--autoplay-policy=document-user-activation-required'], false]]) {
  const b = await launch(args);
  const page = await b.newPage();
  await page.goto(`${url}/index.html?test`);
  await page.waitForTimeout(500);
  const state = () => page.evaluate(() => window.__studio.sound.state());
  assert.equal((await state()).greeted, expectOnLoad, `${label}: trill on load is ${expectOnLoad}`);
  if (!expectOnLoad) { await page.mouse.click(20, 20); await page.waitForTimeout(300); assert.equal((await state()).greeted, true, `${label}: trill plays on the first touch`); }
  await b.close();
  console.log(`ok  trill timing, ${label}`);
}

await browser.close();
server.close();
