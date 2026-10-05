# Painting

The only real activity right now.

## The canvas

A small pixel grid, drawn big. The mockup uses **72 x 54** cells, each shown
as a 2 x 2 block at room scale, then scaled up when the camera zooms in. The
canvas gets the largest even cell size that fits the screen. It is never
framed by chunky chrome; the easel board is the frame.

Every pixel holds one of 11 values: 0 for bare paper, 1 to 10 for the paint
colors. Bare paper shows a faint dither so it looks like paper.

## Tools (physical objects on shelves)

- **Paint pots** (10): tap one to choose a color.
- **Small brush** (radius 1), **big brush** (radius 2).
- **Sponge**: dabs, random partial coverage.
- **Cloth**: erases to paper. Selecting a pot while holding the cloth switches
  back to the big brush.
- **Hang it up**: moves the painting to the clothesline and clears the easel.
- **Back**: leaves the easel.

Strokes are continuous (line interpolation between pointer samples, using
coalesced events where available).

## Clothesline

Finished paintings hang on a clothesline in the studio, with pegs. The mockup
keeps up to 13; the oldest is dropped past that. Tapping one makes Sadie
comment. Hanging plays a short camera move and sparkles.

## Autosave

The current painting and the hung ones save automatically shortly after each
stroke. No save button. See [saving.md](saving.md).

## Sadie reacts

First stroke, many colors, and every few strokes she comments. Keep this rare
enough to be a treat, not noise (at most one line every few seconds).
