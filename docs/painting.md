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
Cells hold 0 (bare paper) or 1 to 10 (the paint colors). Bare paper is plain
(the grid dots below are optional).

An empty easel takes the shape of the sheet last picked (below), fitted to the
screen it is opened on. A painting keeps its own size.

### Paper size, more paper, zoom

No zoom buttons: the controls are gestures, tabs on the paper, and one pad.

- **Paper pad** (tray, only on a bare easel): opens a shelf of five sheet
  pictures to tap: screen shaped, big (more cells, finer detail), tall, wide,
  small. Tall and wide are three times as long as across. Choosing one closes the
  tray. Once there is paint the pad is gone, so a sheet never changes under a
  painting. Sizes are never shrunk after painting starts.
- **Zoom is smooth**, not stepped: pinch with two fingers (or ctrl-wheel, trackpad
  pinch, `+`/`-`). Cells may be any size between the table view and 32 canvas
  pixels. This deliberately relaxes the whole-number rule of
  [art-style.md](art-style.md) for the paper only (the user's choice); a sheet
  still *opens* at a whole-number cell, at the smallest comfortable size that
  covers the screen. Zoom is view only and never saved.
- **Double tap** (or double click) glides between the whole paper and a
  paintable size. It takes back the first tap's dab, so it leaves no paint.
- **Table view**: the whole paper with bare table (and a shadow) round it. Four
  big **pull-out tabs** sit on the paper's edges only in this view. Touch a tab
  and move outward: paper unrolls on that side; move inward: bare paper is cut
  away, never paint (it stops at the painted area, or at 12 cells). It is a
  joystick, not a drag: the further from where the finger grabbed, the faster
  (up to about 45 cells a second), and holding still keeps going, so no long
  swipe is needed. The view keeps the whole paper in sight while it changes.
  The painting stays where it is on the paper. Paper stops at 320 cells a side.
  There is no "more paper" button.
- **Moving around**: two fingers drag the paper; mouse wheel, arrow keys or
  right/middle-button drag also work. While painting within about a tenth of the
  screen of an edge of a zoomed paper, the view drifts that way and keeps painting
  under the finger. A second finger that lands while a stroke is already under way
  is ignored (a resting palm); a one-dab stroke is taken back when it turns out to
  be a pinch.
- **Grid dots** (tray switch, key `g`): a dot in the middle of every cell. Off by
  default (the setting is saved), and when off they never show. When on they are
  faint at rest and brighter while the view moves (zoom, scroll, pull), fading back
  over a moment, so movement is easy to see. Hidden when cells are under 4 pixels.
- Sadie explains pinch/double tap and the tabs the first time each is used.
- Code: view math in `grid.js` (`zoomRange`, `startCell`, `clampView`, `edgeTabs`,
  `growSides`), gestures and tabs in `index.js`, touch routing in `src/world/world.js`.

## Tools (physical objects on the tray shelves)

- **Paint pots** (10): tap one to choose a color.
- **Small brush** (radius 1), **big brush** (radius 2).
- **Paper pad** and **grid switch**: see above.
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
wall, behind everything (the easel paper and Sadie are in front of them). Up to 13; the oldest is dropped past that. Each hangs at 36 art pixels
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
