// Screenshot checks at phone portrait, phone landscape and desktop, in the room and
// while painting with the tray open. Compares with tests/visual/baseline/*.png and
// fails on any difference (actual images go to tests/visual/actual/).
// `npm run visual`; after an intended look change run `npm run visual:update`.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../helpers/server.mjs';
import { launch } from '../helpers/playwright.mjs';

const update = process.argv.includes('--update');
const dir = (p) => fileURLToPath(new URL(p, import.meta.url));
const SIZES = [
  { name: 'phone-portrait', width: 390, height: 844, dpr: 2, touch: true },
  { name: 'phone-landscape', width: 844, height: 390, dpr: 2, touch: true },
  { name: 'desktop', width: 1280, height: 720, dpr: 1, touch: false },
];

const { server, url } = await serve();
const browser = await launch();
let failed = 0;

for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, hasTouch: size.touch, isMobile: size.touch });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${url}/index.html?still`);
  await page.waitForFunction(() => window.__studio && window.__studio.debug().mode === 'room');
  const shots = [];
  const shot = async (label) => { await page.waitForTimeout(150); shots.push([label, await page.screenshot()]); };
  await shot('room');

  const d = await page.evaluate(() => window.__studio.debug());
  await page.evaluate(() => window.__studio.enter('painting'));
  await page.waitForFunction(() => window.__studio.debug().mode === 'painting');
  // a fixed squiggle, drawn with the first pot
  const pts = Array.from({ length: 24 }, (_, i) => [size.width * (0.2 + i * 0.026), size.height * (0.4 + Math.sin(i / 3) * 0.08)]);
  await page.mouse.move(...pts[0]); await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(...p);
  await page.mouse.up();
  const tray = await page.evaluate(() => { const t = window.__studio.activity('painting')._tray(), s = window.__studio.debug(); return { tab: t.tab, H: s.H, S: s.S }; });
  await page.mouse.click(((tray.tab.x + tray.tab.w / 2) * tray.S) / size.dpr, ((tray.H - tray.tab.h / 2) * tray.S) / size.dpr);
  await page.waitForFunction(() => window.__studio.activity('painting')._state().trayOpen);
  await page.waitForFunction(() => window.__studio.activity('painting')._state().trayAnim >= 1);
  await page.evaluate(() => { const b = document.getElementById('bubble'); b.hidden = true; }); // speech timing is not what this checks
  await shot('painting-tray');

  // the stamps drawer, with Sadie and Chooter each stamped once (the second flipped), and one more held down to show where it will land
  const tapItem = async (k) => {
    const it = await page.evaluate((key) => { const i = window.__studio.activity('painting')._tray().items.find((x) => x.k === key); return { x: i.hit.x + i.hit.w / 2, y: i.hit.y + i.hit.h / 2, S: window.__studio.debug().S }; }, k);
    await page.mouse.click((it.x * it.S) / size.dpr, (it.y * it.S) / size.dpr);
    await page.waitForTimeout(150);
  };
  const stampAt = async (fx, fy, hold) => { await page.mouse.move(size.width * fx, size.height * fy); await page.mouse.down(); await page.mouse.move(size.width * fx + 2, size.height * fy + 2); if (!hold) await page.mouse.up(); };
  await tapItem('drawer:stamps');
  await page.waitForFunction(() => window.__studio.activity('painting')._state().trayAnim >= 1);
  await page.evaluate(() => { const b = document.getElementById('bubble'); b.hidden = true; });
  await shot('painting-stamps');
  await tapItem('stamp:sadie'); await stampAt(0.3, 0.2);
  await page.evaluate(() => { document.getElementById('bubble').hidden = true; });
  await page.mouse.click(((tray.tab.x + tray.tab.w / 2) * tray.S) / size.dpr, ((tray.H - tray.tab.h / 2) * tray.S) / size.dpr); await page.waitForTimeout(500);
  await tapItem('stamp:chooter'); await tapItem('stampFlip'); await stampAt(0.65, 0.25);
  await page.mouse.click(((tray.tab.x + tray.tab.w / 2) * tray.S) / size.dpr, ((tray.H - tray.tab.h / 2) * tray.S) / size.dpr); await page.waitForTimeout(500);
  await tapItem('stampFlip'); await tapItem('stampSize'); await stampAt(0.5, 0.6, true);
  await page.evaluate(() => { document.getElementById('bubble').hidden = true; });
  await shot('painting-stamped');
  await page.mouse.up();

  // the book, with a few paintings in it (fixed ones, so the picture is repeatable)
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__studio.debug().mode === 'room');
  await page.evaluate(() => {
    const enc = (i, w, h) => { let o = ''; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o += 'ABCDEFGHIJK'[((x >> 2) + (y >> 2) + i) % 3 === 0 ? 1 + (i % 10) : 0]; return { w, h, d: o }; };
    window.__studio.activity('painting').load({ current: null, hung: [], book: Array.from({ length: 7 }, (_, i) => enc(i, i % 3 ? 24 : 16, i % 3 ? 18 : 30)) });
  });
  await page.evaluate(() => window.__studio.enter('painting', 'book', 'book'));
  await page.waitForFunction(() => window.__studio.debug().mode === 'painting');
  await page.evaluate(() => { const b = document.getElementById('bubble'); b.hidden = true; });
  await shot('book');

  for (const [label, png] of shots) {
    const file = `${size.name}-${label}.png`;
    mkdirSync(dir('./baseline'), { recursive: true });
    const base = dir('./baseline/' + file);
    if (update || !existsSync(base)) { writeFileSync(base, png); console.log('wrote baseline ' + file); continue; }
    if (!readFileSync(base).equals(png)) {
      mkdirSync(dir('./actual'), { recursive: true });
      writeFileSync(dir('./actual/' + file), png);
      console.log('DIFFERS ' + file + ' (see tests/visual/actual/)');
      failed++;
    } else console.log('ok      ' + file);
  }
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
