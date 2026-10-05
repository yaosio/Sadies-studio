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
Cells hold 0 (bare paper) or 1 to 10 (the paint colors). Bare paper is plain.

An empty easel is the default size (below), fitted to the screen it is opened on.
A painting keeps its own size.

### Paper size, more paper, zoom

No zoom buttons and no paper controls in the tray: the controls are gestures and
tabs on the paper.

- **Edge arrows**: while the paper fills the screen the real pull-out tabs are off screen,
  so small arrow tabs sit on the screen edges (left, right, top, and bottom off to the
  side of the tray tab; the bottom one hides while the tray is open). Pressing one
  glides out to the table view, where the real tabs are. They hide while painting.
- **Default size**: every new painting, on a first start, after hanging one up,
  and when an empty easel is reopened, starts at the default size (the natural
  grid for the screen, `naturalGrid` in `grid.js`). Pulling tabs on a bare easel
  does not stick. A check in the smoke test covers it. There are no paper
  controls in the tray.
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
- While a tab is held, new paper is tinted yellow and tick marks every 10 cells run along the pulled edges (the only scale cue; there is no grid).
- Sadie explains pinch/double tap and the tabs the first time each is used.
- Code: view math in `grid.js` (`zoomRange`, `startCell`, `clampView`, `edgeTabs`,
  `growSides`), gestures and tabs in `index.js`, touch routing in `src/world/world.js`.

## Tools (physical objects on the tray shelves)

- **Paint pots** (10): tap one to choose a color.
- **Small brush** (radius 1), **big brush** (radius 2).
- **Undo** (key Ctrl+Z): steps back one thing at a time, up to 30: a stroke, a wipe,
  or a paper size change (undoing a size change shows the table view). Not saved:
  it starts empty on every new painting and after a reload.
- **Bucket**: hold it (about 0.9 s, water rises in it) to wipe every bit of paint
  off the working paper. The paper keeps its size. A quick touch only makes Sadie
  explain. Undo brings it back.
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

Finished paintings hang on a clothesline in the room, with pegs, on the wall
behind everything: the whole easel (frame and legs) and Sadie are in front of
them (the room draws the easel again over the line, `paintFront`). Up to 13; when
it is full a newly hung painting goes into the book instead, so nothing is ever
dropped. Each hangs at 36 art pixels
wide and as tall as its shape says (thin lines survive shrinking). Wide ones are
shorter. Tall ones drop down; past about 84 pixels the rest is **rolled up** with
a ribbon at the bottom. The roll is only how it is drawn: nothing is cut from the
saved painting or the PNG. The first time the app opens, two example paintings hang there.

**Tap a hung painting** (the examples too) to paint on it: the camera glides to the easel
and the painting is there at its own size. The painting that was on the easel takes its
place on the line (a bare easel just gives way), so nothing is lost. Hanging it again
puts it at the end of the line, or in the book when the line is full.

**Hold a hung painting** (about 0.65 s). Right after the finger lands, a big ring of dots
(about 140 css px across, so a big fingertip fits in the middle with the ring visible all round it) fills in clockwise around the
touch to show that holding does something; at the end the rest of the screen dims and three big
wooden buttons, pictures only, appear under it: **save** (a down arrow, offers the
PNG), **to the book** (a closed book), **delete** (a trash can). Delete has no undo,
so the trash must be *held* (about 0.9 s, red water rises in it, like the bucket); a
tap only makes Sadie say to hold it. A tap anywhere else closes the choices.

## The book

A big book standing on the floor left of the easel holds every painting that did not
fit on the line (any number, oldest first). Tap it like the easel: the camera glides
in and the book's page fills the whole screen: small cards in columns, drag or wheel
to scroll, the door top-left leaves. **Tap a card** to paint on it (it goes to the easel,
the easel's painting takes its place in the book). **Hold a card** (same ring)
for the same kind of choices: **save**, **hang** (the peg; it flies to the line; with
the line full it is dimmed and Sadie says the line is full, nothing moves) and
**delete** (held). Code: `book.js` (layout, pure), `book-art.js` (drawing),
`collection.js` (where paintings move, pure), the chooser in `src/ui/`.

## Autosave

The easel painting and the hung ones save automatically shortly after each
stroke and when the page is hidden. No save button. See [saving.md](saving.md).

## Sadie reacts

First stroke, many colors, and every few strokes she comments, at most one line
every few seconds. In painting her bubble docks at the top center.
