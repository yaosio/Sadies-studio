// Stamps: little pictures a child places on the paper in one go. Each is a map of
// paint cells in the stamp's own colors, so a placed stamp is ordinary paint: undo,
// saving, the PNG and the clothesline need nothing special, and the saved format
// does not change. Pure logic, no drawing. See docs/painting.md.
//
// Letters: . see-through, k black, w white, p pink, g green, b blue, n brown,
// d gray (black and white in a checker, so it dithers instead of blending).
const VALUE = { k: 9, w: 10, p: 7, g: 4, b: 5, n: 8 }; // paint value N is PAINT[N - 1], see src/art/palette.js

export const STAMPS = {
  // Sadie, sitting, seen from the front: gray, white legs, pink ears and cheeks, green eyes.
  sadie: [
    '.k............k.',
    '.kk..........kk.',
    '.kdk........kdk.',
    '.kdpk......kpdk.',
    '.kdppkkkkkkppdk.',
    'kddddddddddddddk',
    'kdddwwwwwwwwdddk',
    'kddwwwwwwwwwwddk',
    'kdwwgwwwwwwgwwdk',
    'kwwwwwwppwwwwwwk',
    'kwppwwwkkwwwppwk',
    '.kwwwwwwwwwwwwk.',
    '..kkwwwwwwwwkk..',
    '....kkkkkkkk....',
    '..kddwwwwwwddk..',
    '..kdwwwwwwwwdk..',
    '..kdwwwwwwwwdk..',
    '..kwwwwwwwwwwk..',
    '..kwwkwwwwkwwk..',
    '..kwwkwwwwkwwk..',
    '..kkkkkkkkkkkk..',
  ],
  // Chooter the dog, standing, facing right: black, one ear straight up with a pink inside, a blue collar, a little white on the chin, the chest and the front paws.
  chooter: [
    '..................k.......',
    '.................kk.......',
    '.................kpk......',
    '................kkpk......',
    '................kkppk.....',
    '................kkppkk....',
    '...............kkkkkkkk...',
    '..............kkkkkkwkkk..',
    '..............kkkkkkkkkkkk',
    'k............kkkkkkkkkkkkk',
    'k............kkkkkkkkkkkk.',
    'kk...........kkkkkkkwwwk..',
    '.k.........kkbbbbbkk......',
    '.kk.kkkkkkkkkkkwwwkkk.....',
    '..kkkkkkkkkkkkkwwwkkk.....',
    '..kkkkkkkkkkkkkkkkkkk.....',
    '...kkkkkkkkkkkkkkkkk......',
    '...kkk.kkk....kkk.kkk.....',
    '...kkk.kkk....kkk.kkk.....',
    '...kkk.kkk....kkk.kkk.....',
    '...kkk.kkk....kkk.kkk.....',
    '...kkk.kkk....www.www.....',
  ],
};
export const STAMP_IDS = Object.keys(STAMPS);
export const STAMP_SIZES = [1, 2, 3]; // whole-number multiples of the picture
export const DEFAULT_STAMP_SIZE = 1; // a fresh phone sheet is about 54 cells wide: the dog at 1x is under half of it, 3x only fits on big paper

// The stamp as paint cells: { w, h, cells } with 0 for see-through. scale makes each
// cell scale x scale cells.
export function stampArt(id, scale = 1) {
  const rows = STAMPS[id], bw = rows[0].length, bh = rows.length, w = bw * scale, h = bh * scale;
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
      const ch = rows[sy][sx];
      cells[y * w + x] = ch === '.' ? 0 : ch === 'd' ? ((sx + sy) % 2 ? 9 : 10) : VALUE[ch];
    }
  }
  return { w, h, cells };
}
