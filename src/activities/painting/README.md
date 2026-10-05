# Painting

Full-screen paper activity. Product rules: [docs/painting.md](../../../docs/painting.md).

- `index.js`: the activity (state, pointer handling, tray logic, drawing, what it
  shows in the room). Start here.
- `grid.js`: pure paint-grid logic (default size, growing and shrinking, zoom range and
  view clamping, pull-out tab boxes, stamping, strokes).
- `tools.js`: the four tools. `thumb.js`: fitting and shrinking for the easel
  board and clothesline. `tray.js`: tray layout and hit boxes (pure).
- `art.js`: pot, brush, sponge, cloth, peg, door and tray drawing.
  `clothesline-art.js`: the line with its frames. `examples.js`: first-run paintings.
- `lines.js`: everything Sadie says while painting.

Zoom and scroll are a `view` (`{ cell, ox, oy }`, smooth) that `place` is derived
from; the world forwards pinch (`gestureStart/Move/End`) and wheel input. Pull-out
tabs and the undo stack are in `index.js` and `art.js`. Tall paintings
hang rolled up (`hangShape` in `clothesline-art.js`).

Saved state: `{ current, hung }`, painting codec in `src/save/codec.js`.
`prepare()` runs before the glide-in; `beginHang()` moves the painting to the
saved clothesline at once and the world animates the flight, then `finishHang()`.
