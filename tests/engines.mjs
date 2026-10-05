// Other browser engines (WebKit is what every iPhone and iPad runs; also Firefox): a short check that the
// app starts with no errors, paints, saves and survives a reload. The full smoke test stays Chromium-only.
// `BROWSER=webkit npm run engines`. Needs that browser installed (`npx playwright install webkit`).
import assert from 'node:assert/strict';
import { serve } from './helpers/server.mjs';
import { launch } from './helpers/playwright.mjs';

const { server, url } = await serve();
const browser = await launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('AudioContext')) errors.push(m.text()); });
page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errors.push('outside request: ' + r.url()); });
const until = async (fn, what) => { for (let i = 0; i < 120; i++) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } throw new Error('timed out waiting for ' + what); };
const room = () => until(() => window.__studio && window.__studio.debug().mode === 'room', 'room');

for (const target of ['index.html', 'dist/index.html']) {
  await page.goto(`${url}/${target}?test`);
  await room();
  await page.evaluate(() => window.__studio.enter('painting'));
  await until(() => window.__studio.debug().mode === 'painting', 'painting');
  const w = await page.evaluate(() => innerWidth);
  await page.mouse.move(w / 2, 300); await page.mouse.down(); await page.mouse.move(w / 2 + 60, 340, { steps: 6 }); await page.mouse.up();
  const painted = () => page.evaluate(() => !window.__studio.activity('painting')._state().current.isBlank());
  assert.ok(await painted(), `${target}: a stroke paints`);
  await page.waitForTimeout(800); // autosave
  await page.reload();
  await room();
  await page.evaluate(() => window.__studio.enter('painting'));
  await until(() => window.__studio.debug().mode === 'painting', 'painting after reload');
  assert.ok(await painted(), `${target}: the painting survives a reload`);
}
await browser.close(); server.close();
assert.deepEqual(errors, [], 'no console errors or outside requests');
console.log(`ok  ${process.env.BROWSER || 'chromium'}: starts, paints, saves, reloads`);
