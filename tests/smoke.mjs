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
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('willReadFrequently')) errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
  page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errors.push('outside request: ' + r.url()); });

  await page.goto(`${url}/${target}?test`);
  await until(page, () => window.__studio && window.__studio.debug().mode === 'room', 'room');
  const st = () => page.evaluate(() => { const s = window.__studio.activity('painting')._state(); return { color: s.color, tool: s.tool, hung: s.hung.length, trayOpen: s.trayOpen, painted: s.current.cells.some(Boolean) }; });
  const first = await st();
  assert.equal(first.hung, 2, `${target}: two example paintings on the line`);

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
  const click = async (k) => { const it = tabs.items.find((i) => i.k === k); await page.mouse.click((it.hit.x + it.hit.w / 2) * tabs.S, (it.hit.y + it.hit.h / 2) * tabs.S); };
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
await browser.close();
server.close();
