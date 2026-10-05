// Sadie's studio as data. See README.md in this folder.
// Hotspots: x is room pixels; fy is the top edge relative to the floor line
// (negative is up); w and h are room pixels. First match wins when they overlap.
// Actions: { activity } opens an activity, { say } makes Sadie speak a line from
// lines.js, { glide } slides the camera to that x first.
import { WORLD_W, EX, BOARD_W, BOARD_H, MIN_H, studioGeometry } from './geometry.js';
import { paintStudio, paintStudioFront } from './art.js';
import { STUDIO_LINES } from './lines.js';

export const studioRoom = {
  id: 'studio',
  width: WORLD_W,
  minHeight: MIN_H,
  startX: EX,
  geometry: studioGeometry,
  paint: paintStudio,
  paintFront: paintStudioFront, // drawn over the clothesline (the easel)
  lines: STUDIO_LINES,
  anchors: {
    board: { x: EX - BOARD_W / 2, fy: -196, w: BOARD_W, h: BOARD_H }, // easel paper
    clothesline: { x: 545, fy: -262 },
    sadie: { x: EX + 12, fy: -234 },
  },
  hotspots: [
    { id: 'easel', x: 674, fy: -220, w: 172, h: 228, action: { activity: 'painting' } },
    { id: 'window', x: 440, fy: -224, w: 200, h: 132, action: { say: 'window' } },
    { id: 'plant', x: 420, fy: -108, w: 52, h: 108, action: { say: 'plant' } },
    { id: 'shelf', x: 878, fy: -210, w: 116, h: 210, action: { say: 'shelf' } },
    { id: 'fish', x: 1028, fy: -164, w: 56, h: 42, action: { say: 'fish' } },
    { id: 'beanbag', x: 1008, fy: -52, w: 118, h: 56, action: { say: 'beanbag' } },
    { id: 'clock', x: 1242, fy: -176, w: 32, h: 32, action: { say: 'clock' } },
    { id: 'cubby', x: 1120, fy: -118, w: 156, h: 118, action: { say: 'cubby' } },
    { id: 'doorA', x: 396, fy: -130, w: 32, h: 134, action: { glide: 207, say: 'roomA' } },
    { id: 'doorB', x: 1296, fy: -130, w: 32, h: 134, action: { glide: 1517, say: 'roomB' } },
    { id: 'roomA', x: 14, fy: null, w: 386, h: null, action: { say: 'roomA' } }, // fy null: full height
    { id: 'roomB', x: 1324, fy: null, w: 386, h: null, action: { say: 'roomB' } },
  ],
};
