# Painting

The only real activity right now. Code: `src/activities/painting/` (README there).

## Takes the whole screen

When the child taps the easel the camera glides in, then the paper grows to
cover the **entire screen**, edge to edge. This is the most important rule of
the activity. Nothing may shrink the paper: no side panels, no toolbars, no
frame. The only things on top are small and tucked away:

- **A door** in the top-left corner, drawn faint, to go back to the room
  (Escape does the same). Leaving glides back out to the easel.
- **A tab** at the bottom center, showing the chosen paint. Tapping it slides up
  the **tray** (a wooden shelf along the bottom: tools, "hang it up", paint
  pots). Starting to paint tucks the tray away again. The tray covers paper
  only while it is open.

## The canvas

A grid of paint cells sized to the screen: about 54 cells on the short side
and as many as fit on the long side, each cell a whole number of canvas pixels,
so the paper covers the screen to within a cell and the rest is plain paper.
Cells hold 0 (bare paper) or 1 to 10 (the paint colors). Bare paper shows a
faint speckle.

An empty easel takes the shape of the screen it is opened on. A painting that
has strokes keeps its own size; on a different shape it is centered at the
largest whole-number cell that fits, with plain paper around.

## Tools (physical objects on the tray shelves)

- **Paint pots** (10): tap one to choose a color.
- **Small brush** (radius 1), **big brush** (radius 2).
- **Sponge**: dabs, random partial coverage.
- **Cloth**: erases to paper. Choosing a pot while holding the cloth switches
  back to the big brush.
- **Hang it up** (a peg): flies the painting to the clothesline and clears the
  easel. Does nothing but make Sadie remark if the paper is bare.

The tray is one row on wide screens and three rows on narrow ones.
Strokes are continuous (lines between pointer samples, coalesced events used).
Only one finger paints; a second touch is ignored so a resting palm does not.

## Clothesline

Finished paintings hang on a clothesline in the room, with pegs. Up to 13; the
oldest is dropped past that. Each shows as a small fitted thumbnail (thin lines
survive shrinking). Tapping one makes Sadie comment. The first time the app
opens, two example paintings hang there.

## Autosave

The easel painting and the hung ones save automatically shortly after each
stroke and when the page is hidden. No save button. See [saving.md](saving.md).

## Sadie reacts

First stroke, many colors, and every few strokes she comments, at most one line
every few seconds. In painting her bubble docks at the top center.
