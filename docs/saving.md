# Saving

Everything the child makes stays on the device, in the browser's IndexedDB
(localStorage if IndexedDB is missing or blocked). No accounts, no server. Code:
`src/save/`.

## Rule

Saved data carries a **version number from day one**. Any change to what is
saved adds a migration step in `src/save/migrate.js` and a fixture in
`tests/fixtures/` so old paintings keep loading. Never drop or reinterpret old
data without both.

## Format (version 2)

- Logically `{ version: 2, activities: { painting: { current, hung } } }`.
  Each activity owns its own entry (`store.get(id)` / `store.set(id, state)`).
  In IndexedDB (database `sadies-studio`, store `activities`) each activity is one
  record `{ id, version, state }`; in localStorage the whole object is one key,
  `sadies-studio`.
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

- The app starts after the storage is read (`openStore` in `src/save/store.js`).
  First start with an empty database copies whatever localStorage held (including
  the mockup's v1) into IndexedDB; after that localStorage is not read again.
- IndexedDB holds far more than localStorage's roughly 5 MB, which matters for
  big paper. Painting size is limited by the codec (512 a side) and the paper
  limit in `grid.js` (320).
- Writes are debounced about 500 ms after a stroke, and flushed when the page
  is hidden or closed. An IndexedDB write begun while the page closes normally
  finishes, but is not guaranteed to.
- Every read and write is guarded. Missing, full, blocked or corrupt storage
  means a fresh start and an app that still runs, never a crash.
- With no save at all, two example paintings hang on the clothesline.

## Not built yet

- Backup or restore across devices.
- One record per painting (today one per activity). Not needed yet.
- Asking the browser to keep the data permanently (`navigator.storage.persist()`).

## Saving out

Long-press (about 0.65 s) a hung painting in the room: sparkles, a sound, and
the painting is offered as a PNG (`sadies-painting-N.png`, each cell a whole-number
square, about 1600 px on the long side). Code: `src/activities/painting/export.js`.
Inside an artifact the host shows its own confirmation (`downloads` capability).
