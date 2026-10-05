# Sadie's Studio

A browser-based art and learning app for one 6 year old who may not read yet.
The whole app is a place, not a menu: Sadie the cat's art studio, drawn as a
flat side-on pixel-art room. Objects in the room are the activities. Right now
only painting (the easel) is real.

Only Claude sessions touch this code. No human reads or edits it, so everything
a cold session needs must be written down here or in the linked docs.

## Status

First version built: the studio room (drag to look around), gliding in to the
easel, full-screen painting, "hang it up" to the clothesline, autosave, sound.
The clothesline holds 13; past that paintings go into the book on the floor. Other room objects only make Sadie talk. The look comes from the approved
mockup ([docs/mockup.md](docs/mockup.md)).

## Stack and commands

Plain HTML, CSS and JavaScript (ES modules), canvas, no framework, no runtime
dependencies, no build step for development (see [docs/decisions.md](docs/decisions.md)).
Node 22 and Playwright (dev only) run the checks.

- Run: `npm start`, then open http://localhost:8000/index.html (add `?still`
  to freeze ambient motion).
- Test: `npm test` (logic, no browser).
- Smoke test (run before finishing any change): `npm run smoke`.
- Screenshots: `npm run visual` (`npm run visual:update` after an intended look change).
- Everything: `npm run check`. Single-file build for artifacts: `npm run build`
  writes `dist/index.html` (see [docs/architecture.md](docs/architecture.md)).

## Read this when...

Open only the file you need. Do not read them all.

| Doc | Read this when... |
| --- | --- |
| [docs/design.md](docs/design.md) | you need to know what the app is, who it is for, or what was ruled out |
| [docs/art-style.md](docs/art-style.md) | you draw, change or add any visual |
| [docs/world.md](docs/world.md) | you touch the room, camera, doorways, Sadie or her speech |
| [docs/painting.md](docs/painting.md) | you touch the easel, canvas, tools, paints, the clothesline or the book |
| [docs/architecture.md](docs/architecture.md) | you add a room or activity, change the build, or decide where code goes |
| [docs/saving.md](docs/saving.md) | you read or write anything saved on the device |
| [docs/testing.md](docs/testing.md) | you write or run tests, or screenshot checks |
| [docs/engineering.md](docs/engineering.md) | you start a feature, or want the checklist of things to plan for (safety, privacy, access, offline, performance, audio, backup, browsers, assets) |
| [docs/decisions.md](docs/decisions.md) | you are about to change or question an earlier choice |
| [docs/mockup.md](docs/mockup.md) | you need the reference look, or facts the mockup already settled |

Each room and activity folder has its own short README (`src/rooms/studio/`,
`src/activities/painting/`). Read it before editing that folder.

## Rules

1. The child is the user. Big touch targets, no required reading, no text menus,
   no settings screens, no timers or fail states. Sadie talks in short speech
   bubbles, but nothing may depend on reading them.
2. No menu. The room is the menu. Do not add menu bars, tab bars, panels or
   dialogs that look like office software.
3. Nothing babyish. No primary-color blob shapes, no baby-talk. Sadie is dry,
   a little grumpy and kind.
4. Pixel art is never smoothed. Integer scaling only (except the painting
   paper's smooth zoom), crisp edges, dithering instead of gradients. See [docs/art-style.md](docs/art-style.md).
5. An activity never shrinks to a thumbnail. Painting takes the ENTIRE screen
   with the least possible UI on top (tools small, tucked at an edge, never
   shrinking the canvas). Never frame an activity in chunky chrome.
6. Must work in portrait and landscape, with mouse and touch, from the first
   commit. Never retrofit.
7. Saved data is versioned. Old paintings must keep loading.
8. Rooms are data. Activities are self-contained modules. Adding one means
   adding files, not editing the painting code.
9. Keep dependencies and tooling minimal. Add one only with a decision-log line.
10. Never ask a child-facing question that needs a parent. No accounts, no
    network calls, no analytics, no ads, no external links.

## Working agreement: act like the software engineer

The user is not an engineer and cannot know what to ask. Do not wait to be asked.

- Before building a feature, walk [docs/engineering.md](docs/engineering.md)
  and raise anything relevant yourself, in the thread, in plain words.
- Record every answer in [docs/decisions.md](docs/decisions.md). Unanswered
  items stay in its "Open questions" list, written as questions, never as
  assumptions. Do not build on an unanswered question; pick the safest default,
  mark it "proposed" and say so.
- If you notice a risk, gap or missing doc while working, say so even if it is
  outside the task.

## Docs rules (keep docs small)

- Aim to keep this file under about 100 lines (a soft cap). The goal is that
  a session never reads text it does not need. It is a map, not a manual.
- One topic per file. If a file grows past about two screens, split it.
- Docs live next to the code they describe once code exists.
- Record decisions and reasons, not history. Delete superseded text; do not
  keep "old approach" sections.
- Every change to behavior updates the matching doc in the same PR. A PR with
  a stale doc is not finished.
- If a rule can be a test, lint or type, make it one instead of prose.
- Do not paste code into docs. Link to the file.

## Process

- Small PRs, one concern each. Run the tests and the smoke test first.
- Open PRs as drafts. Describe what a reader would see, before and after.
- Anything the user has not confirmed stays marked "proposed" in the decision log.
