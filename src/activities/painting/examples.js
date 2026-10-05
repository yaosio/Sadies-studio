// The two paintings hanging on the clothesline the first time the app opens, so
// the studio is not empty. Drawn with a few shapes on a 72 x 54 grid.
import { rng } from '../../art/px.js';

const W = 72, H = 54;
const blank = () => new Uint8Array(W * H);
const set = (a, x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) a[y * W + x] = v; };
const disc = (a, cx, cy, r, v) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) set(a, cx + i, cy + j, v); };
const rect = (a, x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(a, i, j, v); };

function house() {
  const a = blank();
  disc(a,13,11,6,3);for(let k=0;k<8;k++){const t=k/8*Math.PI*2;for(let s=9;s<12;s++)set(a,13+Math.round(Math.cos(t)*s),11+Math.round(Math.sin(t)*s),3)}
  for(let x=0;x<W;x++){const t=44+Math.round(Math.sin(x/7)*1.5);for(let y=t;y<H;y++)set(a,x,y,4)}
  rect(a,26,28,18,17,1);for(let j=0;j<10;j++)rect(a,24+j,27-j,22-j*2,1,8);rect(a,32,36,6,9,8);rect(a,28,31,4,4,10);rect(a,38,31,4,4,10);
  for(let y=30;y<45;y++)set(a,56,y,4);disc(a,56,27,3,7);set(a,56,27,3);disc(a,62,40,1,7);for(let y=41;y<46;y++)set(a,62,y,4);
  for(let k=0;k<3;k++){set(a,40+k*6,9,9);set(a,41+k*6,8,9);set(a,42+k*6,9,9)}
  return { w: W, h: H, cells: a };
}

function fish() {
  const a = blank(), R = rng(9);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(R()<.82)a[y*W+x]=5;
  for(let j=-8;j<=8;j++)for(let i=-14;i<=14;i++)if(i*i/196+j*j/64<=1)set(a,34+i,27+j,2);
  for(let j=-7;j<=7;j++)for(let i=0;i<=Math.abs(j)+1;i++)set(a,48+i,27+j,2);
  disc(a,26,25,1,9);for(let k=0;k<3;k++)set(a,30+k*4,22+k,3);
  disc(a,16,14,2,10);disc(a,12,8,1,10);set(a,14,3,10);
  for(let s=0;s<3;s++)for(let y=36;y<H;y++)set(a,58+s*5+Math.round(Math.sin(y/3+s)*1.5),y,4);
  return { w: W, h: H, cells: a };
}

export const examplePaintings = () => [house(), fish()];
