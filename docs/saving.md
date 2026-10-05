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
  at most 13; `book` the book of paintings that did not fit, oldest first (any
  number). `book` is optional: a save without it (made before the book) loads
  with an empty book, so the version stays 2. Fixtures: `save-v2.json` (no book),
  `save-v2-book.json`.
- Palette order is saved data: paint value N means entry N of `PAINT` in
  `src/art/palette.js`. Never reorder or insert.
- Version 1 was the mockup (`{ p, c }`, 72 x 54, key `sadies-studio-v1`). It is
  read and migrated if found.

## Behavior

- The app starts after the storage is read (`openStore` in `src/save/store.js`).
  First start with an empty database copies whatever localStorage held (including
  the mockup's v1) into IndexedDB; after that localStorage is not read again.
- IndexedDB holds far more than localStorage's roughly 5 MB, which matters for
  big paper. Painting size is limited by the codec (2048 a side) and the paper
  limit in `grid.js` (2000). Runs make a mostly bare big paper save to a few bytes. Raising
  the size limit needs no migration (same format); an app older than this change would
  drop a painting over 512 a side, which is fine as only newer builds are used.
- Writes are debounced about 500 ms after a stroke, and flushed when the page
  is hidden or closed. An IndexedDB write begun while the page closes normally
  finishes, but is not guaranteed to.
- Every read and write is guarded. Missing, full, blocked or corrupt storage
  means a fresh start and an app that still runs, never a crash.
- A write that fails (full or blocked storage) makes Sadie say so once (`WORLD_LINES.saveFail`),
  and again only after a good write in between. `store.onFail`, `store.isFailing`.
- A record of another version (a newer app wrote it) is never overwritten: the app runs without it,
  does not save over it, and Sadie says she cannot save. Also for a newer localStorage save.
- The browser is asked to keep the data (`navigator.storage.persist()`, `main.js`), except in
  Firefox, where that shows a prompt. Safari can still clear a site's data after weeks unused
  in a normal tab; installed to the home screen is safer (inferred, not tested here).
- With no save at all, two example paintings hang on the clothesline.

## Not built yet

- Automatic backup (Drive or any cloud). Parked by the user; see the decision log. Research:
  [drive-backup.md](drive-backup.md).
- One record per painting (today one per activity). The book makes this matter
  sooner: every save rewrites the whole record, book included (each painting's
  text is encoded once and reused). Split it if saving ever feels slow.

## Saving out

**Everything in one file.** On the book's page two small buttons sit in the top-right
corner (pictures only, like the door): **save everything** (a stack of papers) and **bring
a file back** (an up arrow). Save everything writes `sadies-studio-backup-YYYY-MM-DD.txt`: the backup JSON as plain text (an
ordinary version-2 save plus `{ app, kind: 'backup', saved }`, with every activity; today the easel,
the line and the book). Plain text because it was tested on the user's phone: its share sheet
takes text, PDF, CSV and HTML but refuses JSON and zip. Not a picture with hidden data: the user
ruled that out, since recompression could ruin the backup unseen; text is never recompressed.
Code: `src/save/backup.js` (pure), `export.js` (file side). On a phone it opens the share sheet,
elsewhere (or if sharing fails) it downloads. Plain `.json` files are accepted back too. A file over 50 MB, 300 paintings or 100 million painted cells is refused (`save/backup.js`); the check counts painted cells from the text before decoding anything. Bringing a file back **merges**: nothing is replaced or removed; a painting in the file that is not already here
(same size and paint) is added, one already here is skipped, and a painting changed since the
backup is a different painting so both stay. Added ones hang on the line while it has room,
then go to the book. A file that is not ours, or bare paper, adds nothing and Sadie says so.
Old saves (version 1 mockup, plain version 2) are accepted as backups too. The backup carries every
activity's saved state, so a new activity rides along without changes; bringing it back needs a
merge written for it next to the painting one (`parseBackup`/`newFromBackup` only merge paintings
today). Any new saved painting field must also be carried by `parseBackup`.

**Where files go.** On a phone or tablet (coarse pointer and a browser that can share files)
the system **share sheet** opens, so the parent picks Drive, Files, messages and so on . Elsewhere
(desktop) it downloads as before; so does anything where sharing is blocked or fails. Inside an
artifact the host's own `downloads` save is the fallback. The picture saves (below) and the backup use the same path.

Long-press (about 0.65 s) a hung painting in the room (or a card in the book) and
choose the save button: sparkles, a sound, and the painting is offered (share sheet on a phone, download on desktop) as a PNG (`sadies-painting-N.png`, each cell a whole-number
square, about 1600 px on the long side). Code: `src/activities/painting/export.js`.
Inside an artifact the host shows its own confirmation (`downloads` capability).
