# Architecture

Plain web tech: HTML, CSS, JavaScript ES modules, one canvas. No framework, no
runtime dependencies. Growth means adding files; painting code is never edited
to add a room.

## Layout

```
index.html              entry; loads src/main.js, src/style.css
assets/fonts/           Pixelify Sans (hosted, OFL license)
src/main.js             boot: wires store, sound, speech and world
src/engine/             view (integer scale), camera math, small utils
src/art/                palette.js (the only palette), px.js (pixel toolkit), Sadie, effects
src/world/              world.js (camera, input, transitions, Sadie), speech, effects, lines
src/ui/                 chooser.js (the picture-only long-press choices, shared by room and book)
src/audio/              sound.js (synthesized, no audio files)
src/save/               store.js, migrate.js (versions), codec.js (paintings as text)
src/rooms/<room>/       room.js (data), art.js (drawn once), geometry.js, lines.js, README
src/activities/         registry.js + one folder per activity (index.js, README, ...)
tests/                  logic.test.js, smoke.mjs, visual/ (screenshots), fixtures/, helpers/
tools/                  build.mjs (single file), serve.mjs
```

## Rooms are data

`room.js` exports one object: width, `geometry(height)` (rooms stretch taller
on tall screens; positions are measured from the floor line), `paint(geometry)`
(draws the room bitmap once), `anchors` (where Sadie, the easel board and the
clothesline sit), `lines` (what Sadie says) and `hotspots`. A hotspot is a
rectangle with an action: `{ activity: 'painting' }`, `{ say: 'window' }` or
`{ glide: x }`. A test validates every room file.

## Activities are modules

`src/activities/registry.js` maps an id to a factory `create(env)`.
`env` is `{ store, sound, say(text), exit(), hang(src), reducedMotion, now() }`.
The object returned has:

- `load(saved)`, `save()`: its own saved state (see [saving.md](saving.md))
- `resize(W, H, u)`, `prepare(view)`: canvas size changed; before the glide-in
  (`view` picks a part of the activity, e.g. `'book'`; a room hotspot carries it)
- `open()`, `close()`: the world gives it the whole screen, or takes it back
- `pointerDown/Move/Up(x, y)`, `key(e)`, `update(dt)`, `draw(ctx, now)`
- `room`: what it shows in the room (`drawBoard`, `drawLine`, `hit`, `tap`,
  `slotRect`, `landing`, `longPress`, `choose`)
- `beginHang()`, `beginHangFromBook(i)`, `finishHang()`, `snapshot()`, `paperRect()`, `boardFit()`:
  the paper-activity transitions (glide in, hang up)

The glide-in and hang-up are written for activities that have a sheet of paper
(painting). When a second kind of activity arrives, generalize `world.js`
transitions then, not before.

## How to add a room

Copy `src/rooms/studio/`: write `geometry.js`, `art.js`, `lines.js`, `room.js`,
README. Doorways today are `glide` hotspots inside one wide room; separate
rooms need a room switcher in `world.js` (not built).

## How to add an activity

Make `src/activities/<name>/` with `index.js` exporting `create<Name>(env)`,
a README, and its own art and lines. Add it to `registry.js`, give a room a
hotspot with `{ activity: '<name>' }`. Its saved state goes through
`env.store.get/set(id, ...)`; add a migration if the format ever changes.

## Single-file build (artifacts)

For now the app runs as a claude.ai artifact, which is one HTML page.
`npm run build` writes `dist/index.html` (script, CSS and font inlined, about
110 KB) with `tools/build.mjs`, a small dependency-free bundler. It only
understands this code style, and fails loudly otherwise:

- one-line imports: `import { a, b } from './x.js';`
- exports as `export const|function|class name` (no default, no `export let`)
- no circular imports

The smoke test runs against both `index.html` and `dist/index.html`.
`dist/artifact.html` is the same page without the html/head/body wrapper, for
the Artifact tool. `dist/` is not committed; build it before publishing.
Publishing rule (user, 2026-10-05): a task that changes the app in a PR republishes that build to the "(test)" artifact as a new version, unasked; when a PR merges to main, the main build goes to the main "Sadie's Studio" artifact. Keep the "(test)" title on the test page. Ids are in the project memory.

## Constraints that shape everything

- Portrait, landscape, mouse and touch from the start (see [world.md](world.md)).
- Integer pixel scaling only (see [art-style.md](art-style.md)).
- No network, no outside requests (the smoke test fails on any).
- Everything the child makes survives updates (see [saving.md](saving.md)).
