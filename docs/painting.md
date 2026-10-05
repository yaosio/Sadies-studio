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

An empty easel takes the shape of the sheet last picked (below), fitted to the
screen it is opened on. A painting keeps its own size.

### Paper size, more paper, zoom

- **Paper stack** (tray): on a bare easel, each tap swaps the sheet: screen
  shaped, big (more cells, finer detail), tall, wide, small (chunky). Tall and
  wide are three times as long as across. Once there is paint, the stack only
  makes Sadie remark. Sizes are never shrunk after painting starts.
- **More paper** (tray): adds bare paper on every side. The painting stays
  exactly where it is on screen. Never removes paint. Stops at 320 cells a side.
- **Zoom** is view only and never saved. Levels are whole multiples of the
  fit-the-whole-paper cell, up to 24 canvas pixels per cell, so pixels stay
  crisp. A sheet opens at the smallest comfortable level that covers the whole
  screen (no plain bars while painting). Ways to zoom: pinch with two fingers,
  ctrl or trackpad pinch wheel, `+`/`-`, or the magnifier on the tray, which steps
  closer and wraps around to the whole paper.
- **Moving around a big paper**: two fingers drag it; the hand on the tray makes
  one finger drag it; mouse wheel, arrow keys, or right-button drag also work.
  A second finger that lands while a stroke is already under way is ignored (a
  resting palm), and a one-dab stroke is taken back when it turns out to be a pinch.
- Code: view math in `grid.js` (`zoomLevels`, `startCell`, `clampView`), gestures
  in `index.js`, touch routing in `src/world/world.js`.

## Tools (physical objects on the tray shelves)

- **Paint pots** (10): tap one to choose a color.
- **Small brush** (radius 1), **big brush** (radius 2).
- **Hand**, **magnifier**, **paper stack**, **more paper**: see above.
- **Sponge**: dabs, random partial coverage.
- **Cloth**: erases to paper. Choosing a pot while holding the cloth switches
  back to the big brush.
- **Hang it up** (a peg): flies the painting to the clothesline and clears the
  easel. Does nothing but make Sadie remark if the paper is bare.

The tray is one row on wide screens and three rows on narrow ones (the short
last row is centered).
Strokes are continuous (lines between pointer samples, coalesced events used).
Only one finger paints; a second touch is ignored so a resting palm does not.

## Clothesline

Finished paintings hang on a clothesline in the room, with pegs, in front of the
easel. Up to 13; the oldest is dropped past that. Each hangs at 36 art pixels
wide and as tall as its shape says (thin lines survive shrinking). Wide ones are
shorter. Tall ones drop down; past about 84 pixels the rest is **rolled up** with
a ribbon at the bottom. The roll is only how it is drawn: nothing is cut from the
saved painting or the PNG. Tapping one makes Sadie comment. The first time the app
opens, two example paintings hang there.

## Autosave

The easel painting and the hung ones save automatically shortly after each
stroke and when the page is hidden. No save button. See [saving.md](saving.md).

## Sadie reacts

First stroke, many colors, and every few strokes she comments, at most one line
every few seconds. In painting her bubble docks at the top center.
