# The approved mockup

https://claude.ai/artifact/CTeZGT1ejERzVzS9fnXnxd

The user said they like this look. It is a single-file HTML page. It is the
reference for the look and for details below; it is not the codebase. Do not
copy its structure; split it per [architecture.md](architecture.md).

## What it settles

- **Rendering:** one full-screen canvas. All art is drawn procedurally in code
  with a small pixel toolkit (rects, dithered gradients, shaded ellipses,
  outlines, ordered dithering). No image files. Fonts: Pixelify Sans.
- **World:** 1724 px wide, about 360 px tall at base scale, scaled by an
  integer to fit the window. Three zones: left side room (warm yellow, reading
  nook in progress), studio (mint), right side room (lilac, music in progress),
  joined as a dollhouse cutaway.
- **Studio objects:** easel on a paint-splattered drop cloth, window with
  curtains and a flower pot, bookshelf with a globe, framed fish painting,
  beanbag with a pillow, cubby shelves with a boombox, cat-faced wall clock,
  potted plant, string pennants, lanterns, clothesline of paintings.
- **Painting:** 72 x 54 grid, 10 colors, brush small and big, sponge, cloth.
- **Sadie:** small sprite, tail sway, blink, hops when petted, hearts and
  sparkles as feedback. Speech bubble with her face.
- **Save:** localStorage `sadies-studio-v1` (see [saving.md](saving.md)).
- **Accessibility:** honors reduced motion.

## What it does not settle

Sound, real learning activities, other rooms, tests, and any build setup.

## Not copied into the repo

The mockup source is not in this repo. If the artifact link stops working, the
facts above and the other docs are the record.
