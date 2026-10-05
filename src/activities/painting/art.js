// Sprites and chrome for the painting tools: paint pots, brushes, sponge, cloth,
// the peg for "hang it up", the door back to the room, and the wooden tray.
// Drawn in code. Colors here are the art's own swatches (see docs/art-style.md).
import { Px, mixh, rng } from '../../art/px.js';

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
// The grid switch: a sheet with dots in rows.
export function mkGridIcon() {
  const p = new Px(22, 24); p.r(3, 3, 16, 18, '#fffaf0');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p.r(5 + x * 4, 5 + y * 4, 2, 2, '#8b4fe0');
  p.outline('#6e5a48'); return p.done();
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

// Dots at the middle of every visible cell. alpha 0 hides them.
export function drawGridDots(c, place, W, H, alpha) {
  const cell = place.cell;
  if (cell < 4 || alpha < 0.02) return;
  const gw = Math.round(place.w / cell), gh = Math.round(place.h / cell);
  const x0 = Math.max(0, Math.floor(-place.x / cell)), x1 = Math.min(gw, Math.ceil((W - place.x) / cell));
  const y0 = Math.max(0, Math.floor(-place.y / cell)), y1 = Math.min(gh, Math.ceil((H - place.y) / cell));
  const d = Math.max(1, Math.round(cell / 7));
  c.fillStyle = 'rgba(75,58,94,' + alpha.toFixed(2) + ')';
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) c.fillRect(Math.round(place.x + (x + 0.5) * cell - d / 2), Math.round(place.y + (y + 0.5) * cell - d / 2), d, d);
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
