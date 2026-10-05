# Painting

Full-screen paper activity. Product rules: [docs/painting.md](../../../docs/painting.md).

- `index.js`: the activity (state, pointer handling, tray logic, drawing, what it
  shows in the room). Start here.
- `grid.js`: pure paint-grid logic (default size, growing and shrinking, zoom range and
  view clamping, pull-out tab boxes, stamping, strokes).
- `tools.js`: the four tools. `stamps.js`: the stamp pictures as paint cells (pure).
  `thumb.js`: fitting and shrinking for the easel board and clothesline. `tray.js`: tray
  layout, hit boxes and what each drawer holds (pure).
- `art.js`: pot, brush, sponge, cloth, peg, door, drawer knob and tray drawing.
  `clothesline-art.js`: the line with its frames. `examples.js`: first-run paintings.
- `lines.js`: everything Sadie says while painting.
- The book (paintings that did not fit on the line): `collection.js` (moving paintings
  between line, book and nowhere; pure), `book.js` (card layout; pure), `book-art.js`
  (drawing). The book is a *view* of this activity (`prepare('book')`), not a second
  activity. The long-press choices come from `src/ui/chooser.js`.

Zoom and scroll are a `view` (`{ cell, ox, oy }`, smooth) that `place` is derived
from; the world forwards pinch (`gestureStart/Move/End`) and wheel input. Pull-out
tabs and the undo journal are in `index.js` and `art.js`. The paper is a sparse tile store (`paper.js`), drawn by `paper-art.js` (tiles, scroll ticks). Tall paintings
hang rolled up (`hangShape` in `clothesline-art.js`).

Saved state: `{ current, hung, book }`, painting codec in `src/save/codec.js`.
`prepare()` runs before the glide-in; `beginHang()` moves the painting to the
saved clothesline (or the book, when the line is full) at once and the world animates the flight, then `finishHang()`.
