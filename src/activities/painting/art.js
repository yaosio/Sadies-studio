// Sprites and chrome for the painting tools: paint pots, brushes, sponge, cloth,
// the peg for "hang it up", the door back to the room, and the wooden tray.
// Drawn in code. Colors here are the art's own swatches (see docs/art-style.md).
import { Px, mixh, rng } from '../../art/px.js';
import { PAINT } from '../../art/palette.js';
import { stampArt } from './stamps.js';

export function mkPot(col){const p=new Px(22,24),dk=mixh(col,'#2a1840',.5),lt=mixh(col,'#ffffff',.5);
  for(let y=8;y<23;y++){const ins=y>19?y-19:0;for(let x=2+ins;x<20-ins;x++){const t=(x-2)/17;let c=t>.74?'#d4cbe8':t<.18?'#ffffff':'#f3efff';if(y>=13&&y<=16)c=t>.74?dk:t<.18?lt:col;p.p(x,y,c)}}
  p.r(1,6,20,3,'#ffffff');p.r(1,8,20,1,'#d4cbe8');p.r(3,4,16,2,col);p.r(5,3,12,1,col);p.r(6,3,4,1,lt);
  p.r(6,9,2,4,col);p.p(6,13,col);p.r(14,9,2,2,col);
  p.outline(col==='#ffffff'?'#8a7aa0':dk);return p.done()}
export function mkBrush(big,col){const w=big?14:10,p=new Px(w,28),c=w>>1,bc=col||'#c08a50';
  const hw=big?4:2;p.r(c-hw/2,12,hw,15,'#e8504a');p.r(c-hw/2,12,1,15,'#ff8a7a');
  const fw=big?8:4;p.r(c-fw/2,8,fw,5,'#c9d2e0');p.r(c-fw/2,8,1,5,'#ffffff');p.r(c-fw/2,12,fw,1,'#8e98b0');
  if(big){p.r(c-4,2,8,6,bc);p.r(c-3,1,6,1,bc);p.r(c-3,3,1,4,mixh(bc,'#ffffff',.4))}else{p.r(c-2,4,4,4,bc);p.r(c-1,2,2,2,bc);p.p(c-1,5,mixh(bc,'#ffffff',.4))}
  p.outline('#4b3050');return p.done()}
export function mkSponge(col){const p=new Px(20,16),R=rng(5);p.r(1,3,18,11,'#ffd84a');p.r(1,3,18,2,'#fff0a0');p.r(14,5,5,9,'#f0b82a');
  for(let k=0;k<9;k++)p.r(2+(R()*15|0),5+(R()*6|0),1+(R()*2|0),1,'#e0a020');p.r(1,12,18,2,col||'#f0b82a');p.outline('#9a6a18');return p.done()}
export function mkCloth(){const p=new Px(22,16);for(let y=4;y<14;y++)for(let x=1;x<21;x++){const a=(x>>1)%2,b=(y>>1)%2;p.p(x,y,a&&b?'#ff5f9a':a||b?'#ff9fc4':'#ffffff')}
  for(let k=0;k<6;k++)p.r(15+k,4+k,6-k,1,null);p.ln(15,4,20,9,'#e05a8a');p.r(1,10,20,1,'#f080b0');p.outline('#a0386a');return p.done()}
export function mkHang(){const p=new Px(22,24);p.r(0,4,22,1,'#8a6a50');p.r(3,8,16,13,'#fffaf0');
  ['#ec3b3b','#ffd60a','#3cc24a','#2e7cf6'].forEach((c,i)=>{for(let x=5;x<17;x++)p.p(x,18-i-Math.round(Math.sin((x-5)/11*Math.PI)*4),c)});
  p.r(9,1,4,13,'#e8b070');p.r(9,1,1,13,'#ffd8a0');p.r(9,6,4,2,'#c9d2e0');p.outline('#6e3e1e');return p.done()}
export function mkBack(){const p=new Px(20,26);p.r(3,6,14,19,'#c97a3a');p.r(4,4,12,2,'#c97a3a');p.r(6,3,8,1,'#c97a3a');
  p.r(5,8,4,6,'#e09a58');p.r(11,8,4,6,'#e09a58');p.r(5,16,4,6,'#e09a58');p.r(11,16,4,6,'#e09a58');p.r(13,14,2,2,'#ffd23f');
  p.r(1,24,18,2,'#ff8ac0');p.outline('#5e3014');return p.done()}

// The bucket: hold it to wipe the whole paper clean.
export function mkClear() {
  const p = new Px(22, 24);
  for (let y = 9; y < 22; y++) { const ins = (y - 9) >> 2; p.r(4 + ins, y, 14 - 2 * ins, 1, y % 4 === 0 ? '#5a8fc4' : '#7ab4e6'); }
  p.r(3, 8, 16, 2, '#c9d2e0'); p.r(5, 10, 12, 2, '#9fe6ff'); p.r(6, 10, 3, 1, '#ffffff');
  p.ln(4, 8, 8, 2, '#8a7a98'); p.ln(18, 8, 14, 2, '#8a7a98'); p.ln(8, 2, 14, 2, '#8a7a98');
  p.r(9, 12, 2, 6, '#ffffff'); p.r(9, 12, 1, 6, '#d8f4ff');
  p.outline('#3d5a80'); return p.done();
}
// The undo arrow: a curved arrow turning back.
export function mkUndo() {
  const p = new Px(22, 24);
  for (let a = -170; a <= 70; a += 4) { const r = (a * Math.PI) / 180; p.disc(12 + Math.round(6 * Math.cos(r)), 13 + Math.round(6 * Math.sin(r)), 1, '#3d78c4'); }
  for (let k = 0; k < 6; k++) p.r(5 - k, 13 + k, 2 * k + 3, 1, '#3d78c4'); // arrowhead pointing down at the start
  p.outline('#23406a'); return p.done();
}

const CHEV = ['.....', '..o..', '.oyo.', 'oyyyo', 'ooooo'];
const rotate = (rows) => rows.map((_, r) => [...rows].reverse().map((row) => row[r]).join('')); // a quarter turn clockwise
// Arrow for the pull-out paper tabs, pointing out of the paper: 'up' | 'right' | 'down' | 'left'.
export function mkArrow(dir) {
  let rows = CHEV;
  for (let k = 0; k < ['up', 'right', 'down', 'left'].indexOf(dir); k++) rows = rotate(rows);
  const p = new Px(5, 5);
  p.map(rows, { o: '#4b3a5e', y: '#ffffff' }, 0, 0);
  return p.done();
}

// A pull-out tab on the edge of the paper (x, y, w, h in screen pixels).
export function drawEdgeTab(c, x, y, w, h, u, arrow) {
  c.fillStyle = '#6e3e1e'; c.fillRect(x, y, w, h);
  c.fillStyle = '#d48e4c'; c.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
  c.fillStyle = '#f2bc7c'; c.fillRect(x + u, y + u, w - 2 * u, u);
  const s = 10 * u; // the arrow is 5 art pixels, drawn twice as big
  c.drawImage(arrow, Math.round(x + (w - s) / 2), Math.round(y + (h - s) / 2), s, s);
}

// Small arrow for the tray handle: up when the tray is closed, down when open.
export function mkChevron(up) {
  const p = new Px(5, 5);
  p.map(up ? CHEV : [...CHEV].reverse(), { o: '#4b3a5e', y: '#ffffff' }, 0, 0);
  return p.done();
}

// A wooden shelf board, x/y/w in screen pixels, u = size of one art pixel.
export function drawShelf(c, x, y, w, u) {
  c.fillStyle = '#6e3e1e'; c.fillRect(x, y, w, 6 * u);
  c.fillStyle = '#f2bc7c'; c.fillRect(x, y + u, w, 4 * u);
  c.fillStyle = '#d48e4c'; c.fillRect(x, y + 3 * u, w, 2 * u);
  c.fillStyle = '#6e3e1e'; c.fillRect(x, y + 5 * u, w, u);
}

// The back wall of the tray: planks behind the shelves.
export function drawTrayBack(c, x, y, w, h, u) {
  c.fillStyle = '#6e3e1e'; c.fillRect(x, y, w, h);
  c.fillStyle = '#9a5a2a'; c.fillRect(x, y + u, w, h - u);
  c.fillStyle = '#8a4e22';
  for (let yy = y + 6 * u; yy < y + h; yy += 6 * u) c.fillRect(x, yy, w, u);
  c.fillStyle = '#d48e4c'; c.fillRect(x, y + u, w, u);
}

// The little tab that opens and closes the tray, showing the chosen paint.
export function drawHandle(c, x, y, w, h, u, paint, chevron) {
  c.fillStyle = '#6e3e1e'; c.fillRect(x, y, w, h);
  c.fillStyle = '#d48e4c'; c.fillRect(x + u, y + u, w - 2 * u, h - u);
  c.fillStyle = '#f2bc7c'; c.fillRect(x + u, y + u, w - 2 * u, u);
  const cx = x + 8 * u, cy = y + (h >> 1) + u;
  c.fillStyle = '#4b3a5e'; c.fillRect(cx - 4 * u, cy - 4 * u, 8 * u, 8 * u);
  c.fillStyle = paint; c.fillRect(cx - 3 * u, cy - 3 * u, 6 * u, 6 * u);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(cx - 3 * u, cy - 3 * u, 2 * u, 2 * u);
  c.drawImage(chevron, x + w - 14 * u, cy - 2 * u, 5 * u * 1, 5 * u * 1);
}

// The three drawers on the bottom shelf: each is a wooden drawer front with a brass knob
// and a little picture of what is inside (paints, a brush, a stamp), so it reads as a drawer.
function mkDrawer(icon) {
  const p = new Px(22, 24);
  p.r(0, 5, 22, 18, '#6e3e1e'); p.r(1, 6, 20, 16, '#d48e4c'); p.r(1, 6, 20, 2, '#f2bc7c'); p.r(1, 20, 20, 2, '#b87438');
  p.r(1, 8, 20, 1, '#4a2810'); // the gap above the drawer
  p.r(4, 10, 14, 8, '#fff6e8'); p.r(4, 10, 14, 1, '#ffffff'); p.r(4, 17, 14, 1, '#d8c8b0'); // a paper label
  icon(p);
  p.r(8, 18, 6, 3, '#8a5a1e'); p.r(9, 19, 4, 1, '#ffd860'); p.r(9, 18, 4, 1, '#fff0a0'); // brass pull
  return p.done();
}
export function mkDrawerPaints() {
  return mkDrawer((p) => { [['#ec3b3b', 5], ['#ffd60a', 8], ['#3cc24a', 11], ['#2e7cf6', 14]].forEach(([c, x]) => { p.r(x, 12, 3, 3, c); p.r(x, 12, 1, 1, '#ffffff'); }); });
}
export function mkDrawerTools() {
  return mkDrawer((p) => { p.ln(6, 16, 15, 12, '#e8504a', 2); p.r(14, 11, 3, 3, '#4b3a5e'); p.r(5, 15, 2, 2, '#c9d2e0'); });
}
export function mkDrawerStamps() {
  return mkDrawer((p) => { p.r(10, 11, 2, 2, '#ec3b3b'); p.r(7, 13, 8, 3, '#ec3b3b'); p.r(8, 12, 1, 1, '#ec3b3b'); p.r(13, 12, 1, 1, '#ec3b3b'); p.r(10, 14, 2, 1, '#ffffff'); });
}
// A stamp's picture, standing on the shelf (id from stamps.js).
export function mkStampThumb(id) {
  const a = stampArt(id), p = new Px(a.w, a.h);
  for (let i = 0; i < a.cells.length; i++) if (a.cells[i]) p.p(i % a.w, Math.floor(i / a.w), PAINT[a.cells[i] - 1].hex);
  return p.done();
}
// How big the stamp is: three squares, the chosen size (1 to 3) in ink.
export function mkStampSize(step) {
  const p = new Px(22, 24);
  const sizes = [4, 6, 8], xs = [1, 6, 13];
  [0, 1, 2].forEach((i) => {
    const s = sizes[i], on = i + 1 <= step, x = xs[i], y = 21 - s;
    p.r(x, y, s, s, on ? '#8b4fe0' : '#d4cbe8');
    p.r(x, y, s, 1, on ? '#b88cf0' : '#ece7f6');
  });
  p.outline('#4b3a5e'); return p.done();
}

// The wall at the edge of the biggest paper: dark planks outside the paper (drawn
// behind it) with a lit lip where they meet it. Only on the sides at the limit.
export function drawWall(c, place, atX, atY, W, H, u) {
  const plank = 7 * u, lip = Math.max(1, u);
  const band = (x, y, w, h, vertical) => {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = '#6e4a2e'; c.fillRect(x, y, w, h);
    c.fillStyle = '#5a3a22';
    if (vertical) for (let px = x + plank; px < x + w; px += plank) c.fillRect(px, y, lip, h);
    else for (let py = y + plank; py < y + h; py += plank) c.fillRect(x, py, w, lip);
  };
  const L = Math.round(place.x), T = Math.round(place.y), R = Math.round(place.x + place.w), B = Math.round(place.y + place.h);
  if (atX) { band(0, 0, L, H, true); band(R, 0, W - R, H, true); }
  if (atY) { band(0, 0, W, T, false); band(0, B, W, H - B, false); }
  c.fillStyle = '#a87a4e';
  if (atX) { if (L > 0) c.fillRect(L - lip, 0, lip, H); if (R < W) c.fillRect(R, 0, lip, H); }
  if (atY) { if (T > 0) c.fillRect(0, T - lip, W, lip); if (B < H) c.fillRect(0, B, W, lip); }
}

// Faint fibres in the paper, fixed to the paper (not the screen) so scrolling over
// bare paper still looks like moving. Sparse, only on bare cells. Fibres sit on
// blocks of cells so they stay about the same size on screen at any zoom.
export function drawGrain(c, place, cells, gw, gh, W, H, u) {
  const k = place.cell, m = Math.max(1, Math.ceil((8 * u) / k)), B = m * k;
  if (B > 80 * u) return;
  const x0 = Math.max(0, Math.floor(-place.x / B)), y0 = Math.max(0, Math.floor(-place.y / B));
  const x1 = Math.min(Math.floor((gw - 1) / m), Math.floor((W - place.x) / B)), y1 = Math.min(Math.floor((gh - 1) / m), Math.floor((H - place.y) / B));
  c.fillStyle = 'rgba(150,120,80,.2)';
  const len = Math.max(2, Math.round(B * 0.45)), t = Math.max(1, Math.round(u * 0.75));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const h = Math.imul(x * 73856093 ^ y * 19349663, 0x9e3779b1) >>> 0;
    if (h % 60 !== 0 || cells[y * m * gw + x * m] !== 0) continue;
    const ox = place.x + x * B, oy = place.y + y * B, a = (h >>> 8) % Math.max(1, B - len), b = (h >>> 16) % Math.max(1, B - t);
    if ((h >>> 5) & 1) c.fillRect(Math.round(ox + a), Math.round(oy + b), len, t); else c.fillRect(Math.round(ox + b), Math.round(oy + a), t, len);
  }
}
