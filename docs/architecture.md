# Architecture (proposed)

Nothing here is built yet. All of it is **proposed** until the user confirms;
see [decisions.md](decisions.md). Change this file when code arrives.

## Principles

- Plain web tech: HTML, CSS, JavaScript ES modules, canvas. No build step, no
  framework, minimal dependencies.
- Growth means adding files. Painting code never gets edited to add a room.

## Proposed layout

```
index.html            entry; loads src/main.js
src/main.js           boot, resize, main loop
src/engine/           camera, input (pointer), layout, pixel drawing helpers
src/world/            room loader, hotspots, Sadie, speech
src/rooms/<room>/     room.json (data) + README.md
src/activities/<name>/  module + README.md
src/save/             versioned storage (see saving.md)
src/art/              palette file, sprite helpers, naming rules
tests/                logic tests
tests/visual/         screenshot checks
docs/                 topic docs
```

## Rooms are data

A room file lists: its width, its wall/floor style, and its objects (position,
size, sprite, and which activity or line it triggers). Doorways link rooms.
A room with no activity yet is allowed; its objects just make Sadie speak.

## Activities are modules

Each activity exports the same tiny interface:

- `open(context)` start; context gives screen size, pointer events, save access
- `close()` stop and release
- `save()` return its saveable state, or `load(state)` to restore it

Painting is the first activity and is the template for the rest. An activity
owns its own tools, art and README. It must not reach into another activity.

## How to add a room / activity

Write these steps here when the first of each is built. Until then, follow the
layout above and write the README for the new folder in the same PR.

## Constraints that shape everything

- Portrait, landscape, mouse and touch from the start (see [world.md](world.md)).
- Integer pixel scaling only (see [art-style.md](art-style.md)).
- No network. Works offline once loaded.
- Everything the child makes must survive updates (see [saving.md](saving.md)).
