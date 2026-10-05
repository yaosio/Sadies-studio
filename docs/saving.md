# Saving

Everything the child makes stays on the device, in the browser's local storage.
No accounts, no server. Code: `src/save/`.

## Rule

Saved data carries a **version number from day one**. Any change to what is
saved adds a migration step in `src/save/migrate.js` and a fixture in
`tests/fixtures/` so old paintings keep loading. Never drop or reinterpret old
data without both.

## Format (version 2)

- Key `sadies-studio`: `{ version: 2, activities: { painting: { current, hung } } }`.
  Each activity owns its own entry (`store.get(id)` / `store.set(id, state)`).
- A painting is `{ w, h, d }`: width, height, and `d`, one letter per cell, `A`
  (bare paper) to `K` (paint 10), with a run count after repeated letters
  (`A12B` is twelve A then one B). See `src/save/codec.js`.
- `current` is the painting on the easel; `hung` the clothesline, oldest first,
  at most 13.
- Palette order is saved data: paint value N means entry N of `PAINT` in
  `src/art/palette.js`. Never reorder or insert.
- Version 1 was the mockup (`{ p, c }`, 72 x 54, key `sadies-studio-v1`). It is
  read and migrated if found.

## Behavior

- Writes are debounced about 500 ms after a stroke, and flushed when the page
  is hidden or closed.
- Every read and write is guarded. Missing, full, blocked or corrupt storage
  means a fresh start and an app that still runs, never a crash.
- With no save at all, two example paintings hang on the clothesline.

## Not built yet

- Saving a painting out as an image file (decided: any user may). Needs a
  place in the UI that is not a menu.
- Backup or restore across devices.
