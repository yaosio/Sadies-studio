# Testing

No human looks at this app between changes, so tests and screenshots are the
eyes. Run `npm run check` before finishing any change (needs Node 22 and
Playwright; Chromium is in the cloud environment).

## Layers

1. **Logic tests** (`npm test`, `tests/logic.test.js`, no browser): save codec,
   every saved-data version loads, storage failures, painting tools and undo
   math, where paintings move between line, book and delete, the book page layout, the chooser (buttons on screen, the hold), zoom range and view clamping, pull-out tabs, more paper, hanging shape, the IndexedDB store (with a fake database), thumbnails, tray fit with every drawer open, stamps (pictures, scale, flip, landing and clipping), integer scale, camera, room data validity, and
   the palette rule below.
2. **Smoke test** (`npm run smoke`): in headless Chromium, load the app, tap
   the easel, check the paper fills the screen, paint, use the tray and its drawers, place a stamp (nothing paints until the finger lifts, one undo takes it back), hang it
   up, leave with Escape, reload and check it survived (from IndexedDB),
   on a phone: no paper controls in the tray, a fresh painting at the default size (also after hanging), undo, smooth pinch, two-finger scroll, double tap to the table
   view, hold the bucket to wipe the paper (a tap does not), hold a tab to grow the paper and push it in to shrink it, ctrl-wheel, hang it rolled up, flick the room and catch it, long-press a hung
   painting, choose save and get a PNG download, an opened painting fits the screen in portrait and landscape, hang a 14th painting into the book, open the book, hang from it, delete by holding (a tap does nothing), play every sound, check the trill is a roll and when it plays (on load or
   first touch), and fail on any console
   error or request to another host. Runs on `index.html` and `dist/index.html`.
3. **Screenshot checks** (`npm run visual`): room, painting-with-tray, the stamps drawer, a painting with stamps and the book at phone
   portrait, phone landscape and desktop, byte-compared with
   `tests/visual/baseline/`. The page runs with `?still` (no ambient motion or
   randomness). After an intended look change, `npm run visual:update` and
   look at the new images.

## Rules that are tests

- Every room file validates (unique hotspot ids, inside the room, lines exist).
- Every saved-data version loads (fixtures).
- Hex colors appear only in art files (`src/art/`, `art.js`, `*-art.js`,
  `room.js`); everything else uses `src/art/palette.js`.
- Pixel scale and cell size are always integers; the paper covers the screen.
- The tray stays a small part of the screen.

## CI

`.github/workflows/check.yml` runs `npm run check` on every PR and uploads
screenshot diffs if it fails.

## Not covered yet

Real touch devices, Safari and Firefox (Chromium only), sound output.
