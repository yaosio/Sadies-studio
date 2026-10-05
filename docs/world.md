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

Tapping an object does something. Only the easel is a real activity. Others
make Sadie say a short line and are placeholders for later activities
(bookshelf: stories, window: birds, cubby: music, and so on).

## Easel and the camera

Tapping the easel makes the camera **glide in** (zoom) until the paper fills as
much of the screen as fits. Tapping Sadie pets her. Escape or the back
object exits. The camera never snaps.

## Sadie's speech

Short speech bubbles that pop in near Sadie and fade. Points at her; docks to
the top if she is off screen. Lines live in one place so they are easy to edit.
Reduced-motion users get no pop animation and no sway.

## Layouts

Layout is chosen per aspect ratio, never by device type:

- **Landscape:** tool shelves on the left (brushes, sponge, cloth, hang, back)
  and right (paint pots) screen edges.
- **Portrait:** one shelf row on top (tools), two rows of pots at the bottom.
- The canvas is centered in the remaining space at the largest even pixel
  size that fits.

Pixel scale is an integer chosen from window size and device pixel ratio.

## Input

One pointer model for mouse and touch (pointer events). Dragging the room
pans it; a tap that does not move is a tap on an object. Never rely on hover.
