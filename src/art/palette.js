// The one palette file. Paint colors, ink and paper live here and nowhere else
// outside art files (see docs/art-style.md). Order of PAINT is saved data:
// painting value N (1..10) means PAINT[N - 1]. Never reorder or insert.
export const INK = '#4b3a5e';
export const PAPER = '#fffaf0';
export const PAPER_SPECK = '#f8f0e2';
export const WALL = '#86ddd0';
export const SHADOW = 'rgba(75,58,94,.35)';

export const PAINT = [
  { name: 'red', hex: '#ec3b3b' },
  { name: 'orange', hex: '#ff8c1a' },
  { name: 'yellow', hex: '#ffd60a' },
  { name: 'green', hex: '#3cc24a' },
  { name: 'blue', hex: '#2e7cf6' },
  { name: 'purple', hex: '#8b4fe0' },
  { name: 'pink', hex: '#ff6fb5' },
  { name: 'brown', hex: '#9a5a2c' },
  { name: 'black', hex: '#2a2238' },
  { name: 'white', hex: '#ffffff' },
];
export const WOOD_TRIM = '#f4dcb4'; // cutaway frame around the room; shows at the very edges
export const FRAME = '#ffffff'; // white border on a painting as it flies to the clothesline
export const PAGE = '#f7ecd2'; // the paper of the book's pages
export const SCRIM = 'rgba(42,34,56,.45)'; // dims everything but the painting being chosen from
