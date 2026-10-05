// Smoke test: load the real app in headless Chromium, go into painting, paint, hang it up,
// reload, and check it all survived with no console errors. `npm run smoke`.
// Runs against the source (index.html) and the single-file build (dist/index.html).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  const st = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { color: s.color, tool: s.tool, hung: s.hung.length, trayOpen: s.trayOpen, painted: !s.current.isBlank() }; });
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

  // hold a finger on a hung painting: it offers save, book and delete; save gives a PNG download
  const slotPos = await page.evaluate(() => {
    const w = window.__studio, d = w.debug(), r = w.activity('painting').room.slotRect(0, d.anchors.clothesline);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  });
  await page.evaluate((x) => { window.__studio.panTo(x); }, slotPos.x);
  await page.waitForTimeout(900);
  const spot = await page.evaluate((p) => { const d = window.__studio.debug(); return { x: (p.x * d.view.z + d.view.ox) * d.S, y: (p.y * d.view.z + d.view.oy) * d.S }; }, slotPos);
  await page.mouse.move(spot.x, spot.y);
  await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
  assert.ok(await page.evaluate(() => window.__studio.chooser.isOpen()), `${target}: holding a hung painting offers choices`);
  const saveBtn = await page.evaluate(() => { const d = window.__studio.debug(), r = window.__studio.chooser._rects()[0]; return { x: (r.x + r.w / 2) * d.S, y: (r.y + r.h / 2) * d.S }; });
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 3000 }), page.mouse.click(saveBtn.x, saveBtn.y)]);
  assert.match(download.suggestedFilename(), /^sadies-painting-1\.png$/);
  assert.equal(await page.evaluate(() => window.__studio.chooser.isOpen()), false, 'the chooser closes after saving');
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
  assert.ok((await trayNow()).some((i) => i.k === 'drawer:stamps') && (await trayNow()).some((i) => i.k === 'undo'), 'the bottom shelf has the drawers and undo');
  await click('drawer:tools');
  await click('sponge');
  assert.equal((await st()).tool, 'sponge');

  // painting a new stroke tucks the tray away
  await page.mouse.move(200, 150); await page.mouse.down(); await page.mouse.move(400, 160); await page.mouse.up();
  assert.equal((await st()).trayOpen, false, 'tray tucked away');

  // stamps: open the stamps drawer, pick Chooter the dog, make him bigger. He shows where he will land
  // while the finger is down and is only painted when it lifts; undo takes him back.
  const cellsPainted = () => page.evaluate(() => window.__studio.activity('painting')._state().current.paintedCount());
  await page.waitForTimeout(400);
  await page.mouse.click(tx, ty);
  await page.waitForTimeout(400);
  await click('drawer:stamps');
  await click('stamp:chooter');
  await click('stampSize');
  const sst = await page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { tool: s.tool, id: s.stampId, size: s.stampSize, drawer: s.drawer }; });
  assert.deepEqual(sst, { tool: 'stamp', id: 'chooter', size: 2, drawer: 'stamps' }, 'stamp chosen, bigger');
  const beforeStamp = await cellsPainted();
  await page.mouse.move(500, 300); await page.mouse.down(); await page.mouse.move(520, 320, { steps: 4 });
  assert.equal(await cellsPainted(), beforeStamp, 'a stamp paints nothing while the finger is down');
  await page.mouse.up();
  assert.ok((await cellsPainted()) > beforeStamp + 100, 'the stamp lands when the finger lifts');
  await page.keyboard.press('Control+z');
  assert.equal(await cellsPainted(), beforeStamp, 'undo takes the whole stamp back in one step');
  await page.mouse.move(500, 300); await page.mouse.down(); await page.mouse.up(); // and once more, to keep it
  await page.waitForTimeout(400);

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
// The full clothesline and the book: a 14th painting goes into the book, nothing is dropped, and
// long-press offers save / book / delete (hang, in the book). Desktop, mouse.
for (const target of targets) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('willReadFrequently') && !m.text().includes('AudioContext was not allowed')) errors.push(m.text()); });
  await page.goto(`${url}/${target}?test`);
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room');
  await page.mouse.click(5, 5);
  await page.evaluate(() => { // a full line
    const enc = (v) => ({ w: 6, h: 4, d: 'B' + 'ABCDEFGHIJ'[v % 10] + 'A22' });
    window.__studio.activity('painting').load({ current: null, hung: Array.from({ length: 13 }, (_, i) => enc(i)), book: [] });
  });
  const state = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { hung: s.hung.length, book: s.book.length, inBook: s.inBook }; });
  const S = () => page.evaluate(() => window.__studio.debug().S);
  const waitMode = async (m) => { for (let i = 0; i < 100; i++) { if ((await page.evaluate(() => window.__studio.debug().mode)) === m) return; await page.waitForTimeout(50); } throw new Error('timed out waiting for mode ' + m); };
  const choice = async (i) => { const sc = await S(), r = await page.evaluate((i) => window.__studio.chooser._rects()[i] || window.__studio.activity('painting')._book().rects[i], i); return { x: (r.x + r.w / 2) * sc, y: (r.y + r.h / 2) * sc }; };
  const hold = async (ms) => { await page.mouse.down(); await page.waitForTimeout(ms); };

  // paint and hang a 14th: it goes to the book, the line keeps all 13
  await page.evaluate(() => window.__studio.enter('painting'));
  await waitMode('painting'); await page.waitForTimeout(1200);
  await page.mouse.move(300, 300); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(300 + i * 25, 300 + Math.sin(i) * 40);
  await page.mouse.up();
  const tr = await page.evaluate(() => { const d = window.__studio.debug(), t = window.__studio.activity('painting')._tray(); return { S: d.S, tab: t.tab, H: d.H }; });
  await page.mouse.click((tr.tab.x + tr.tab.w / 2) * tr.S, (tr.H - tr.tab.h / 2) * tr.S);
  await page.waitForTimeout(500);
  const hangIt = await page.evaluate(() => { const it = window.__studio.activity('painting')._tray().items.find((i) => i.k === 'hang'); return { x: it.hit.x + it.hit.w / 2, y: it.hit.y + it.hit.h / 2 }; });
  await page.mouse.click(hangIt.x * tr.S, hangIt.y * tr.S);
  await waitMode('room');
  let st = await state();
  assert.deepEqual([st.hung, st.book], [13, 1], `${target}: with the line full a new painting goes into the book and nothing is dropped`);

  // while the paper fills the screen, small arrows on its edges show it can be resized; pressing one glides out to the table view with the real tabs
  await page.evaluate(() => window.__studio.enter('painting'));
  await waitMode('painting'); await page.waitForTimeout(1200);
  const peeks = await page.evaluate(() => { const a = window.__studio.activity('painting'), d = window.__studio.debug(), t = a._peek().find((x) => x.side === 'left'); return { n: a._peek().length, tabs: a._state().tabs, x: (t.x + t.w / 2) * d.S, y: (t.y + t.h / 2) * d.S }; });
  assert.deepEqual([peeks.n, peeks.tabs], [4, 0], `${target}: edge arrows show at the default zoom`);
  await page.mouse.click(peeks.x, peeks.y);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__studio.activity('painting')._state().tabs), 4, 'pressing an edge arrow glides out to the pull-out tabs');
  await page.keyboard.press('Escape');
  await waitMode('room');

  // tap the book in the room: the camera glides there and the book opens
  await page.evaluate(() => window.__studio.panTo(534));
  await page.waitForTimeout(1000);
  const bookSpot = await page.evaluate(() => { const d = window.__studio.debug(), b = d.anchors.book; return { x: ((b.x + b.w / 2) * d.view.z + d.view.ox) * d.S, y: ((b.y + b.h / 2) * d.view.z + d.view.oy) * d.S }; });
  await page.mouse.click(bookSpot.x, bookSpot.y);
  await waitMode('painting');
  assert.equal((await state()).inBook, true, `${target}: tapping the book opens the book`);
  await page.waitForTimeout(300);

  // the book's two corner buttons: save everything as one file, and merge a file back in
  const corner = async (k) => { const sc = await S(), r = await page.evaluate((k) => window.__studio.activity('painting')._book().buttons.find((b) => b.k === k).r, k); return { x: (r.x + r.w / 2) * sc, y: (r.y + r.h / 2) * sc }; };
  let pt = await corner('backup');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.mouse.click(pt.x, pt.y)]);
  assert.match(dl.suggestedFilename(), /^sadies-studio-backup-\d{4}-\d\d-\d\d\.txt$/, `${target}: save everything gives one backup text file`);
  const backup = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  assert.equal(backup.activities.painting.hung.length, 13, 'the backup holds the whole line');
  assert.equal(backup.activities.painting.book.length, 1, 'and the book');
  backup.activities.painting.book.push({ w: 5, h: 3, d: 'B3C4D' }); // one painting this device does not have
  await page.waitForTimeout(400); pt = await corner('load');
  // Arm the file-chooser listener and let Playwright finish switching interception on BEFORE the tap:
  // tapping in the same instant loses the event about one time in three (the app opens the picker every
  // time; checked by counting input.click() calls). That race was the old "flaky load button".
  const chooserWait = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
  await page.waitForTimeout(150);
  await page.mouse.click(pt.x, pt.y);
  const chooserEv = await chooserWait;
  assert.ok(chooserEv, `${target}: the load button opens the file picker`);
  await chooserEv.setFiles({ name: 'backup.txt', mimeType: 'text/plain', buffer: Buffer.from(JSON.stringify(backup)) });
  for (let i = 0; i < 40 && (await state()).book < 2; i++) await page.waitForTimeout(50);
  st = await state();
  assert.deepEqual([st.hung, st.book], [13, 2], `${target}: importing merges: what was here stays, only the new painting is added`);
  await page.evaluate(() => { window.__studio.activity('painting')._state().book.pop(); }); // back to one, for the checks below

  // hold a painting in the book: save, hang, delete
  const card = await page.evaluate(() => { const c = window.__studio.activity('painting')._book().layout.cards[0], d = window.__studio.debug(); return { x: (c.x + c.w / 2) * d.S, y: (c.y + c.h / 2) * d.S }; });
  await page.mouse.move(card.x, card.y); await hold(900); await page.mouse.up();
  assert.ok((await page.evaluate(() => window.__studio.activity('painting')._book().chooser)), 'holding a painting in the book offers choices');
  // hang with a full line: Sadie says it is full, nothing moves, the choices stay
  let b = await choice(1); await page.mouse.click(b.x, b.y);
  st = await state();
  assert.deepEqual([st.hung, st.book], [13, 1], 'hang does nothing while the line is full');
  assert.ok(await page.evaluate(() => window.__studio.activity('painting')._book().chooser), 'the choices stay open');
  // delete needs a hold: a tap does nothing
  b = await choice(2); await page.mouse.click(b.x, b.y);
  assert.equal((await state()).book, 1, `${target}: a tap on the trash deletes nothing`);
  await page.mouse.move(b.x, b.y); await hold(1200); await page.mouse.up();
  assert.equal((await state()).book, 0, `${target}: holding the trash deletes the painting`);
  await page.keyboard.press('Escape');
  await waitMode('room');

  // hold a hung painting: move it to the book (line 12, book 1), then hang it back from the book (line 13, book 0)
  const openChooserOnHung = async (i) => {
    const pos = await page.evaluate((i) => { const w = window.__studio, d = w.debug(), r = w.activity('painting').room.slotRect(i, d.anchors.clothesline); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }, i);
    await page.evaluate((x) => window.__studio.panTo(x), pos.x);
    await page.waitForTimeout(900);
    const spot = await page.evaluate((p) => { const d = window.__studio.debug(); return { x: (p.x * d.view.z + d.view.ox) * d.S, y: (p.y * d.view.z + d.view.oy) * d.S }; }, pos);
    await page.mouse.move(spot.x, spot.y); await hold(900); await page.mouse.up();
    assert.ok(await page.evaluate(() => window.__studio.chooser.isOpen()), 'choices on the hung painting');
  };
  await openChooserOnHung(3);
  b = await choice(1); await page.mouse.click(b.x, b.y);
  st = await state();
  assert.deepEqual([st.hung, st.book], [12, 1], `${target}: move to the book takes it off the line`);
  await page.evaluate(() => window.__studio.panTo(534));
  await page.waitForTimeout(1000);
  const bs2 = await page.evaluate(() => { const d = window.__studio.debug(), b = d.anchors.book; return { x: ((b.x + b.w / 2) * d.view.z + d.view.ox) * d.S, y: ((b.y + b.h / 2) * d.view.z + d.view.oy) * d.S }; });
  await page.mouse.click(bs2.x, bs2.y);
  await waitMode('painting'); await page.waitForTimeout(300);
  const card2 = await page.evaluate(() => { const c = window.__studio.activity('painting')._book().layout.cards[0], d = window.__studio.debug(); return { x: (c.x + c.w / 2) * d.S, y: (c.y + c.h / 2) * d.S }; });
  await page.mouse.move(card2.x, card2.y); await hold(900); await page.mouse.up();
  b = await choice(1); await page.mouse.click(b.x, b.y);
  await waitMode('hanging'); await waitMode('room');
  st = await state();
  assert.deepEqual([st.hung, st.book], [13, 0], `${target}: hang from the book puts it back on the line`);

  // delete a hung painting needs a hold; a tap on the trash does nothing
  await openChooserOnHung(0);
  b = await choice(2); await page.mouse.click(b.x, b.y);
  assert.equal((await state()).hung, 13, 'a tap on the trash deletes nothing');
  await page.mouse.move(b.x, b.y); await hold(1200); await page.mouse.up();
  assert.equal((await state()).hung, 12, `${target}: holding the trash deletes a hung painting`);
  // tapping outside closes the choices without doing anything
  await openChooserOnHung(0);
  await page.mouse.click(10, 10);
  assert.equal(await page.evaluate(() => window.__studio.chooser.isOpen()), false, 'a tap outside closes the choices');
  assert.equal((await state()).hung, 12);

  // the book survives a reload (put one back in it first)
  await openChooserOnHung(1);
  b = await choice(1); await page.mouse.click(b.x, b.y);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  await page.reload();
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room after reload');
  st = await state();
  assert.deepEqual([st.hung, st.book], [11, 1], `${target}: the book survives a reload`);

  // tapping a hung painting opens it on the easel to paint on (the bare easel gives way, nothing is duplicated)
  const spotOf = async (i) => {
    const pos = await page.evaluate((i) => { const w = window.__studio, d = w.debug(), r = w.activity('painting').room.slotRect(i, d.anchors.clothesline); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }, i);
    await page.evaluate((x) => window.__studio.panTo(x), pos.x);
    await page.waitForTimeout(900);
    return page.evaluate((p) => { const d = window.__studio.debug(); return { x: (p.x * d.view.z + d.view.oy * 0 + d.view.ox) * d.S, y: (p.y * d.view.z + d.view.oy) * d.S }; }, pos);
  };
  const pos0 = await spotOf(0);
  await page.mouse.click(pos0.x, pos0.y);
  await waitMode('painting');
  st = await state();
  assert.deepEqual([st.hung, st.book], [10, 1], `${target}: a tapped hung painting moves to the easel`);
  assert.deepEqual(await page.evaluate(() => { const c = window.__studio.activity('painting')._state().current; return [c.w, c.h]; }), [6, 4], 'it keeps its own size');
  await page.keyboard.press('Escape');
  await waitMode('room');
  // the same from the book: the easel's painting takes its place there
  await page.evaluate(() => window.__studio.panTo(534));
  await page.waitForTimeout(1000);
  const bs3 = await page.evaluate(() => { const d = window.__studio.debug(), b = d.anchors.book; return { x: ((b.x + b.w / 2) * d.view.z + d.view.ox) * d.S, y: ((b.y + b.h / 2) * d.view.z + d.view.oy) * d.S }; });
  await page.mouse.click(bs3.x, bs3.y);
  await waitMode('painting'); await page.waitForTimeout(300);
  const card3 = await page.evaluate(() => { const c = window.__studio.activity('painting')._book().layout.cards[0], d = window.__studio.debug(); return { x: (c.x + c.w / 2) * d.S, y: (c.y + c.h / 2) * d.S }; });
  await page.mouse.click(card3.x, card3.y);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__studio.activity('painting')._state().inBook), false, `${target}: tapping a card in the book opens it on the easel`);
  assert.deepEqual([(await state()).hung, (await state()).book], [10, 1], 'the easel painting went into the book in its place');
  assert.deepEqual(errors, [], `${target}: no console errors`);
  await ctx.close();
  console.log(`ok  ${target} full line and the book`);
}
// A painting opened from the line (the examples are 72 x 54) opens with the whole painting in view, in portrait and landscape.
for (const [label, width, height] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
  for (const target of targets) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/${target}?test`);
    await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room');
    await page.evaluate(() => { window.__studio.activity('painting').room.edit(0); window.__studio.enter('painting'); });
    await until(page, () => window.__studio.debug().mode === 'painting', 'painting mode');
    await page.waitForTimeout(300);
    const fit = await page.evaluate(() => { const s = window.__studio.activity('painting')._state(), d = window.__studio.debug(); return { w: s.current.w, h: s.current.h, v: s.view, W: d.W, H: d.H }; });
    assert.deepEqual([fit.w, fit.h], [72, 54], 'the example opened at its own size');
    assert.ok(fit.v.ox >= 0 && fit.v.oy >= 0 && fit.v.ox + fit.w * fit.v.cell <= fit.W && fit.v.oy + fit.h * fit.v.cell <= fit.H, `${target} ${label}: an opened painting is fully in view ${JSON.stringify(fit)}`);
    assert.deepEqual(errors, [], `${target} ${label}: no errors`);
    await ctx.close();
    console.log(`ok  ${target} opened painting fits, ${label}`);
  }
}
// Pull-out paper, zoom and scroll, undo, wipe, and a tall painting hanging, on a phone.
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
  const st = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { w: s.current.w, h: s.current.h, view: s.view, tabs: s.tabs, painted: s.current.paintedCount(), hung: s.hung.length, natural: s.natural }; });
  const geo = () => page.evaluate(() => { const t = window.__studio.activity('painting')._tray(), d = window.__studio.debug(); return { S: d.S, tab: t.tab, H: d.H, items: t.items.map((i) => ({ k: i.k, hit: i.hit })) }; });
  const css = (g, v) => (v * g.S) / 2; // canvas pixels to css pixels (device scale 2)
  const openTray = async () => { const g = await geo(); await page.touchscreen.tap(css(g, g.tab.x + g.tab.w / 2), css(g, g.H - g.tab.h / 2)); await page.waitForTimeout(500); };
  const tapItem = async (k) => { const g = await geo(), it = g.items.find((i) => i.k === k); assert.ok(it, `tray has ${k}`); await page.touchscreen.tap(css(g, it.hit.x + it.hit.w / 2), css(g, it.hit.y + it.hit.h / 2)); await page.waitForTimeout(250); };
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });

  // the tray has undo and no paper controls, and a new painting starts at the default size
  await openTray();
  let g = await geo();
  assert.ok(g.items.some((i) => i.k === 'undo') && g.items.some((i) => i.k === 'hang'));
  assert.ok(!g.items.some((i) => ['paper', 'hand', 'zoom', 'more'].includes(i.k) || i.k.startsWith('sheet:')), 'no paper, hand or zoom controls');
  let s = await st();
  assert.deepEqual([s.w, s.h], [s.natural.w, s.natural.h], `${target}: a fresh painting is the default size`);
  assert.equal(s.tabs, 0, 'no tabs while the paper fills the screen');
  assert.equal(await page.evaluate(() => window.__studio.activity('painting')._state().peek) >= 3, true, 'edge arrows show instead');
  const startCell = s.view.cell;
  // paint a stroke
  await page.mouse.move(100, 200); await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(100 + i * 8, 200 + i * 12);
  await page.mouse.up();
  const painted = (await st()).painted;
  assert.ok(painted > 0);
  const afterTap = painted;

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

  // the bucket wipes the paper only when held: a tap does nothing, a hold clears all paint and keeps the size
  const size = (await st());
  await openTray();
  let gg = await geo(); const bucket = gg.items.find((i) => i.k === 'clear'); assert.ok(bucket, 'tray has the bucket');
  const bx = css(gg, bucket.hit.x + bucket.hit.w / 2), by = css(gg, bucket.hit.y + bucket.hit.h / 2);
  await touch('touchStart', [[bx, by]]); await page.waitForTimeout(120); await touch('touchEnd', []);
  assert.equal((await st()).painted, size.painted, `${target}: a quick touch on the bucket wipes nothing`);
  await touch('touchStart', [[bx, by]]); await page.waitForTimeout(1300); await touch('touchEnd', []);
  const wiped = await st();
  assert.equal(wiped.painted, 0, `${target}: holding the bucket wipes all paint`);
  assert.deepEqual([wiped.w, wiped.h], [size.w, size.h], 'the paper keeps its size');
  // undo brings the wiped paint back
  await page.waitForTimeout(300);
  await openTray(); await tapItem('undo');
  assert.equal((await st()).painted, size.painted, `${target}: undo brings the wiped paint back`);
  // undo goes back through strokes and paper size changes too
  await openTray(); await tapItem('undo');
  const earlier = await st();
  assert.ok(earlier.w !== size.w || earlier.h !== size.h || earlier.painted !== size.painted, `${target}: undo steps back further (${size.w}x${size.h}/${size.painted} -> ${earlier.w}x${earlier.h}/${earlier.painted})`);
  await page.mouse.move(200, 400); await page.mouse.down();
  for (let i = 0; i < 12; i++) await page.mouse.move(200 + i * 6, 400 + i * 10);
  await page.mouse.up();
  assert.ok((await st()).painted > 0, 'painting after undo works');

  // hang it: the tall painting hangs rolled up, behind the easel, and survives a reload in IndexedDB
  await openTray(); await tapItem('hang');
  await until(page, () => window.__studio.debug().mode === 'room', 'room after hanging');
  const hung = await page.evaluate(() => { const a = window.__studio.activity('painting'), d = window.__studio.debug(), i = a._state().hung.length - 1; return { i, rect: a.room.slotRect(i, d.anchors.clothesline) }; });
  assert.ok(hung.rect.h > 60, `${target}: a tall painting hangs taller than the standard frame (${hung.rect.h})`);
  const fresh = await st();
  assert.deepEqual([fresh.w, fresh.h], [fresh.natural.w, fresh.natural.h], `${target}: after hanging (even a pulled-out sheet) the next painting starts at the default size`);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  assert.ok(dbs.includes('sadies-studio'), `${target}: paintings are kept in IndexedDB`);
  await page.reload();
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room after reload');
  const back = await st();
  assert.equal(back.hung, 3, 'the tall painting survived the reload');
  assert.deepEqual(errors, [], `${target}: no console errors`);
  await ctx.close();
  console.log(`ok  ${target} paper sizes and zoom`);
}
// The biggest paper: 2000 x 2000 loads, paints, undoes, and shows the wall at its edge.
{
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}/index.html?test`);
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room');
  await page.mouse.click(5, 5);
  await page.evaluate(() => window.__studio.activity('painting').load({ current: { w: 2000, h: 2000, d: 'A2001000BA1998999' }, hung: [], book: [] }));
  await page.evaluate(() => window.__studio.panTo(760));
  await page.waitForTimeout(900);
  const easel = await page.evaluate(() => { const d = window.__studio.debug(); return { x: d.W / 2 * d.S, y: (d.geom.F - 142) * d.S }; });
  await page.mouse.click(easel.x, easel.y);
  await until(page, () => window.__studio.debug().mode === 'painting', 'painting mode');
  await page.waitForTimeout(1200);
  const state = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { w: s.current.w, h: s.current.h, painted: s.current.paintedCount(), view: s.view }; });
  const before = await state();
  assert.deepEqual([before.w, before.h], [2000, 2000], 'a painting 2000 cells a side opens at its own size');
  await page.mouse.move(150, 300); await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(150 + i * 8, 300 + i * 5);
  await page.mouse.up();
  const after = await state();
  assert.ok(after.painted > before.painted, 'painting on the biggest paper works');
  for (let i = 0; i < 3; i++) await page.mouse.wheel(99999, 99999);
  await page.waitForTimeout(300);
  const edge = await state();
  assert.ok(edge.view.ox + 2000 * edge.view.cell < 420, 'scrolled to the far edge, the wall shows past the paper');
  // Opening a painting with paint far apart zooms out so every mark is on screen.
  await page.goto(`${url}/index.html?test`);
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room again');
  await page.mouse.click(5, 5);
  await page.evaluate(() => window.__studio.activity('painting').load({ current: { w: 2000, h: 2000, d: 'A20010BA3781889BA198099' }, hung: [], book: [] }));
  await page.evaluate(() => window.__studio.panTo(760));
  await page.waitForTimeout(900);
  await page.mouse.click(easel.x, easel.y);
  await until(page, () => window.__studio.debug().mode === 'painting', 'painting mode again');
  await page.waitForTimeout(1500);
  const far = await state();
  const on = (x, y) => x * far.view.cell + far.view.ox >= 0 && x * far.view.cell + far.view.ox <= 420 && y * far.view.cell + far.view.oy >= 0 && y * far.view.cell + far.view.oy <= 800;
  assert.ok(on(10, 10) && on(1901, 1901), `all the paint is on screen when a painting opens (cell ${far.view.cell})`);
  assert.deepEqual(errors, [], 'no console errors on the biggest paper');
  await page.close();
  console.log('ok  biggest paper');
}
// Sadie's tail never touches the left or top edge of her sprite, whatever the wag (it used to be cut off).
{
  const page = await browser.newPage();
  await page.goto(`${url}/index.html?test`);
  const edges = await page.evaluate(async () => {
    const { sadieSprite } = await import('/src/art/sadie.js');
    let worst = 0, n = 0;
    for (const sway of [false, true]) for (let flick = 0; flick <= 1.001; flick += 0.05) for (let T = 0; T < 8; T += 0.25) {
      const c = sadieSprite({ blinking: false, flick, sway }, T), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height; y++) if (d[y * c.width * 4 + 3]) worst++; // the tail swings out to the left
      for (let x = 0; x < c.width; x++) if (d[x * 4 + 3]) worst++; // and up
      n++;
    }
    return { worst, n };
  });
  assert.equal(edges.worst, 0, `Sadie's tail stays inside her sprite in ${edges.n} wag poses`);
  await page.close();
  console.log('ok  tail never clipped');
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
