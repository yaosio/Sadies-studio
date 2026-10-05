# The world

## Shape of the place

A flat, side-on, cutaway view of Sadie's studio, like a dollhouse seen from the
front. The room is **wider than the screen**. The child drags (or flicks) to
look left and right. Edge arrows on mouse help find the way.

- Center: the studio. Easel with paper, window with curtains and a flower
  pot, bookshelf, framed fish painting, beanbag, cubby shelves with a boombox,
  a cat-shaped wall clock, a plant, a paint-splattered drop cloth.
- Left and right: **doorways to future rooms**, shown "in progress" (ladders,
  paint cans, boxes, a sign with a book or music-note icon). Tapping one slides
  the camera there and Sadie says it is not ready yet.
- Rooms are visible neighbors, not separate screens. Moving between them is
  moving the camera.

## Objects are activities

Tapping an object does something. The easel and the book of paintings are real (both
belong to the painting activity; the book is on the floor left of the easel). Others
make Sadie say a short line and are placeholders for later activities
(bookshelf: stories, window: birds, cubby: music, and so on).

## Easel and the camera

Tapping the easel makes the camera **glide in** (zoom) to the easel board, and
the paper then grows to take the whole screen (see [painting.md](painting.md)).
Leaving reverses it. Tapping Sadie pets her. Escape or the door exits. The
camera never snaps (it does with reduced motion). Hanging a painting flies it
from the full screen to the clothesline while the camera pulls back.

## Sadie's speech

Short speech bubbles that pop in near Sadie and fade. Points at her; docks to
the top if she is off screen. Lines live in one place so they are easy to edit.
Reduced-motion users get no pop animation and no sway.

## Layouts

Layout is chosen by what fits, never by device type. In the room: the whole
height of the room fits the screen at a whole-number scale and the room scrolls
sideways. In painting: the paper fills the screen and the tray is a shelf along
the bottom (one row when wide, three when narrow). Pixel scale is an integer
chosen from window size and device pixel ratio (`src/engine/view.js`).

## Input

One pointer model for mouse and touch (pointer events). Dragging the room
pans it and letting go with speed flicks it (speed measured over the last
~100 ms; catching a flick stops it where it is). A tap that does not move is a
tap on an object; holding on a hung painting opens the picture-only chooser: save, move to the book, delete (see painting.md, saving.md). Never rely on hover.
