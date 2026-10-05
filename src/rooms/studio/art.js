// Everything in Sadie's studio that is drawn once into the room bitmap.
// Dense on purpose: it is pixel art written as code. Colors here are the art's
// own swatches; only paint, ink and paper come from the shared palette.
import { Px, bay, mixh, rng } from '../../art/px.js';
import { PAPER } from '../../art/palette.js';
import { WORLD_W, EX, BOOK_X, BOOK_W, BOOK_H } from './geometry.js';

let F = 288, WH = 360, BX = 0, BY = 0, LY = 0;

const ICONPAL={o:'#4b3a5e',r:'#ec4b4b',y:'#ffd23f',w:'#ffffff',b:'#2e7cf6'};
const ICON_BOOK=["oooooo..","orrrrro.","orryrro.","orrrrro.","orrrrro.","orrrrro.","owwwwwo.","oooooo.."];
const ICON_NOTE=["....oo..","....ooo.","....o.oo","....o...","....o...","..ooo...",".oooo...","..oo...."];

function squig(p,x,y,c){[[0,1],[1,0],[2,0],[3,1],[4,2],[5,2],[6,1]].forEach(([i,j])=>p.p(x+i,y+j,c))}
function tri(p,x,y,c){[[2,0],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[4,2]].forEach(([i,j])=>p.p(x+i,y+j,j===2?mixh(c,'#c06a00',.3):c))}
function wainscot(p,x0,x1,base,panel,lite,dark){
  const wy=F-62,w=x1-x0;
  p.r(x0,wy,w,62,base);
  for(let x=x0+6;x+34<=x1-4;x+=42){p.r(x,wy+10,34,40,dark);p.r(x,wy+10,33,39,lite);p.r(x+1,wy+11,32,38,panel);p.d(x+1,wy+34,32,15,base,.5)}
  p.r(x0,wy-5,w,6,'#fff1dc');p.r(x0,wy-5,w,1,'#ffffff');p.r(x0,wy,w,1,'#c9a88a');p.d(x0,wy+1,w,2,dark,.5);
  p.r(x0,F-9,w,9,'#fff1dc');p.r(x0,F-9,w,1,'#ffffff');p.r(x0,F-10,w,1,'#c9a88a');p.r(x0,F-1,w,1,'#b48d6a');
}
function wallStudio(p,x0,x1){
  const wy=F-62;
  p.g2(x0,0,x1-x0,wy,['#a4ebe0','#93e3d7','#82dbce','#74d2c5'],false);
  for(let y=2;y<wy;y+=4)for(let x=x0+((y>>2)&1)*2;x<x1;x+=4)p.p(x,y,'#b6f1e8');
  const R=rng(11);
  for(let gy=22;gy<wy-14;gy+=22)for(let gx=x0+4;gx<x1-12;gx+=26){const ox=gx+(R()*16|0),oy=gy+(R()*12|0),k=R();
    if(k<.38)squig(p,ox,oy,'#f27ab6');else if(k<.72)tri(p,ox,oy,'#ffc93a');else if(k<.9)p.r(ox,oy,2,2,'#a27df0')}
  wainscot(p,x0,x1,'#b7a0f0','#c9b6fa','#e3d8ff','#8e74d8');
}
function wallA(p,x0,x1){
  const wy=F-62;
  for(let x=x0;x<x1;x++)p.r(x,0,1,wy,((x-x0)%14)<7?'#ffeab0':'#ffdc8a');
  for(let y=12;y<wy;y+=16)for(let x=x0+3;x<x1;x+=14){const yy=y+((x/14|0)%2)*8;p.p(x,yy,'#ff9fbe');p.p(x-1,yy,'#ffc4d6');p.p(x+1,yy,'#ffc4d6')}
  wainscot(p,x0,x1,'#8fd9b0','#a6e6c2','#cdf5dd','#5fb88a');
}
function wallB(p,x0,x1){
  const wy=F-62;
  p.g2(x0,0,x1-x0,wy,['#f0e6ff','#e8dbff','#e0d0ff'],false);
  for(let y=8;y<wy;y+=14)for(let x=x0+((y/14|0)%2)*7+3;x<x1;x+=14){p.r(x-1,y,3,1,'#cdb4ff');p.r(x,y-1,1,3,'#cdb4ff')}
  wainscot(p,x0,x1,'#ffb9d6','#ffcae0','#ffe6f0','#e07fa8');
}
function floor(p){
  const R=rng(3),cols=['#e9a866','#e09c5a','#e6a362'];
  for(let row=0,y=F;y<WH;row++,y+=9){const h=Math.min(9,WH-y);
    p.r(14,y,WORLD_W-28,h,cols[row%3]);p.r(14,y,WORLD_W-28,1,'#f4c088');p.r(14,y+h-1,WORLD_W-28,1,'#a9642e');
    for(let x=14+((row*29)%56);x<WORLD_W-14;x+=56){p.r(x,y,1,h,'#a9642e');p.r(x+1,y+1,1,Math.max(0,h-2),'#f4c088')}
    for(let k=0;k<WORLD_W/26;k++){const gx=14+(R()*(WORLD_W-40)|0),gy=y+2+(R()*Math.max(1,h-4)|0);p.r(gx,gy,3+(R()*9|0),1,'#d28c4c')}}
  p.tint(14,F,WORLD_W-28,4,'#5a2a10',.3,.6);
  for(let y=WH-24;y<WH;y++)p.tint(14,y,WORLD_W-28,1,'#7a3a18',(y-(WH-24))/24*.16);
}
function section(p,x,y,w,h){
  p.r(x,y,w,h,'#f4dcb4');
  for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(((i+j)%6)===0)p.p(i,j,'#e6c79a');
  p.r(x,y,1,h,'#8a5a36');p.r(x+w-1,y,1,h,'#8a5a36');
}
function innerWall(p,x,icon){
  section(p,x,0,24,F-126);
  p.r(x,F-127,24,1,'#8a5a36');p.r(x+1,F-126,22,3,'#d8b88c');p.r(x,F-123,24,1,'#8a5a36');
  p.tint(x-6,F-122,36,6,'#3a2010',.18,.5);
  p.r(x-3,F,30,3,'#b8743a');p.r(x-3,F,30,1,'#d8925a');
  p.ellS(x+12,F-152,10,10,['#c88a20','#e8ae30','#ffcf4a','#ffe48a'],'#7a4a12');
  p.disc(x+12,F-152,7,'#fff6e0');
  p.map(icon,ICONPAL,x+8,F-156);
}
function cloud(p,cx,cy,s){
  const parts=[[0,0,5*s],[7*s,-3*s,7*s],[15*s,0,5*s],[7*s,1*s,5*s]];
  parts.forEach(([i,j,r])=>p.disc(cx+i,cy+j+2,Math.round(r),'#cfe4ff'));
  parts.forEach(([i,j,r])=>p.disc(cx+i,cy+j,Math.round(r),'#ffffff'));
}
function windowObj(p,x,y,w,h){
  p.r(x-7,y-7,w+14,h+14,'#a07a58');p.r(x-6,y-6,w+12,h+12,'#fff4e4');p.r(x-6,y+h+5,w+12,1,'#e2ccb0');p.r(x-1,y-1,w+2,h+2,'#c8a888');
  p.g2(x,y,w,h,['#3f8ff2','#5aa6fb','#82c2ff','#b4defe','#e2f5ff'],false);
  const sx=x+w-28,sy=y+20;
  for(let j=-15;j<=15;j++)for(let i=-15;i<=15;i++){const d=Math.hypot(i,j);if(d<15&&d>9&&bay(sx+i,sy+j)<(15-d)/9)p.p(sx+i,sy+j,'#fff4b0')}
  p.disc(sx,sy,9,'#ffd84a');p.disc(sx-1,sy-1,7,'#ffe970');p.disc(sx-3,sy-3,3,'#fff8c8');
  cloud(p,x+16,y+24,1);cloud(p,x+70,y+14,.7);
  for(let i=0;i<w;i++){const X=x+i,hy=Math.round(y+h*.6-6*Math.sin((i+10)/22));for(let j=hy;j<y+h;j++)p.p(X,j,bay(X,j)<(j-hy)/26?'#6cc46a':'#9ade90')}
  [[x+20,y+h*.6-8],[x+28,y+h*.6-5],[x+104,y+h*.6-3]].forEach(([tx,ty])=>{p.disc(tx,Math.round(ty),3,'#3e9a4a');p.p(tx-1,Math.round(ty)-1,'#5cbc5c')});
  for(let i=0;i<w;i++){const X=x+i,hy=Math.round(y+h*.78-7*Math.sin((i+60)/17));p.p(X,hy,'#8ede7c');for(let j=hy+1;j<y+h;j++)p.p(X,j,bay(X,j)<(j-hy)/16?'#3a9a44':'#58bb52')}
  for(let k=0;k<4;k++){p.p(x+56+k*9,y+h*.78+2,'#ffffff');p.p(x+57+k*9,y+h*.78+1,'#ff8ac0')}
  p.r(x+w/2-2,y,4,h,'#fff4e4');p.r(x+w/2+1,y,1,h,'#d8c0a0');p.r(x,y+h/2-2,w,4,'#fff4e4');p.r(x,y+h/2+1,w,1,'#d8c0a0');
  for(let k=0;k<12;k++){p.p(x+8+k,y+h/2-6-k,'#ffffff');p.p(x+13+k,y+h/2-6-k,'#eaf6ff')}
  for(let k=0;k<9;k++)p.p(x+w/2+8+k,y+h-6-k,'#ffffff');
  p.r(x-12,y+h+6,w+24,6,'#fff4e4');p.r(x-12,y+h+6,w+24,1,'#ffffff');p.r(x-12,y+h+11,w+24,1,'#a07a58');p.tint(x-8,y+h+12,w+16,4,'#2a3a40',.18,.5);
  // little flower pot on the sill
  const fx=x+18,fy=y+h+5;p.r(fx-5,fy-7,10,7,'#c25c34');p.r(fx-4,fy-7,8,6,'#e0784a');p.r(fx-4,fy-7,2,6,'#f29a6a');
  p.ln(fx,fy-8,fx,fy-15,'#3a9a44');p.disc(fx,fy-17,3,'#ff6fb5');p.p(fx,fy-17,'#ffd23f');p.r(fx+1,fy-12,3,2,'#58bb52');
  // curtains
  p.r(x-30,y-17,w+60,4,'#a8761e');p.r(x-29,y-16,w+58,2,'#f0bf4a');p.disc(x-31,y-15,3,'#e8ae30');p.disc(x+w+31,y-15,3,'#e8ae30');
  const curtain=(x0,cw)=>{const top=y-14,ch=h+34;
    for(let i=0;i<cw;i++){const f=i%8;p.r(x0+i,top,1,ch,f<2?'#e65c9c':f<3?'#f27ab0':f===5?'#ffc4e0':'#ff94c6')}
    p.r(x0-1,top,1,ch,'#b8407a');p.r(x0+cw,top,1,ch,'#b8407a');
    p.r(x0,top+ch-5,cw,4,'#fff0f6');for(let i=0;i<cw;i+=4)p.p(x0+i+1,top+ch-1,'#fff0f6');p.r(x0,top+ch-6,cw,1,'#e0609e');
    const ty=top+Math.round(ch*.58);p.r(x0-1,ty,cw+2,5,'#a8761e');p.r(x0,ty+1,cw,3,'#f0bf4a');p.disc(x0+cw/2|0,ty+2,2,'#ff6fb5');
    for(let k=0;k<3;k++)p.r(x0,top+3+k,cw,1,k===1?'#ffd6ea':'#ff94c6')};
  curtain(x-30,30);curtain(x+w,30);
}
function plant(p,cx){
  const leaf=(x,y,rx,ry)=>{p.ellS(x,y,rx,ry,['#2a7a3a','#3c9a46','#58bb52','#86d46e'],'#1f5a2c');p.ln(x-rx+3,y+1,x+rx-3,y-1,'#2a7a3a')};
  [[-14,-52],[12,-62],[-4,-84],[8,-38],[-16,-34],[16,-82]].forEach(([dx,dy])=>p.ln(cx,F-24,cx+dx,F+dy,'#2f7a3a',2));
  leaf(cx-14,F-52,11,6);leaf(cx+12,F-62,12,7);leaf(cx-4,F-84,9,7);leaf(cx+8,F-38,11,6);leaf(cx-16,F-34,9,5);leaf(cx+16,F-82,8,5);leaf(cx+2,F-100,7,6);
  for(let j=0;j<22;j++){const w=Math.round(22+j*.36),x0=cx-(w>>1);p.r(x0-1,F-22+j,w+2,1,'#7a3418');p.r(x0,F-22+j,w,1,'#e0784a');p.r(x0+w-5,F-22+j,4,1,'#c25c34');p.r(x0+2,F-22+j,2,1,'#f29a6a')}
  p.r(cx-15,F-27,30,6,'#7a3418');p.r(cx-14,F-26,28,4,'#ea885a');p.r(cx-14,F-26,28,1,'#ffb48a');
}
function dropCloth(p,x0,x1){
  for(let x=x0;x<x1;x++){const top=F+2+Math.round(1.5*Math.sin(x/9)),bot=F+28+Math.round(2*Math.sin(x/13+1));p.r(x,top,1,bot-top,'#f6f2e8');p.p(x,top,'#ffffff');p.p(x,bot,'#bfb6a4')}
  const R=rng(40);for(let k=0;k<14;k++){const x=x0+8+(R()*(x1-x0-16)|0),y=F+8+(R()*16|0);p.ln(x,y,x+6+(R()*10|0),y+(R()*3|0)-1,'#ddd4c2')}
  const S=['#ec3b3b','#2e7cf6','#ffd60a','#3cc24a','#ff6fb5','#8b4fe0','#ff8c1a'];
  for(let k=0;k<18;k++){const x=x0+10+(R()*(x1-x0-20)|0),y=F+7+(R()*18|0),c=S[k%S.length],r=1+(R()*2|0);p.disc(x,y,r,c);if(R()<.5)p.p(x+r+2,y+1,c);if(R()<.5)p.p(x-r-2,y-1,c)}
}
function easel(p){
  const ex=EX,wood='#d99a55',woodL='#f2c088',woodD='#b0703a',ol='#6e3e1e';
  const leg=(a,b,c,d,col)=>{p.ln(a,b,c,d,ol,9);p.ln(a,b,c,d,col,7);p.ln(a-2,b,c-2,d,woodL,1)};
  leg(ex,BY-20,ex,F-2,woodD);
  leg(ex-22,BY,ex-72,F+6,wood);leg(ex+22,BY,ex+72,F+6,wood);
  p.r(ex-58,F-48,116,7,ol);p.r(ex-57,F-47,114,5,wood);p.r(ex-57,F-47,114,1,woodL);
  // mast top + clamp
  p.r(ex-5,BY-22,10,20,ol);p.r(ex-4,BY-21,8,18,wood);p.r(ex-4,BY-21,2,18,woodL);
  p.r(ex-10,BY-11,20,7,ol);p.r(ex-9,BY-10,18,5,woodD);p.r(ex-9,BY-10,18,1,woodL);
  // board frame
  p.r(BX-5,BY-5,154,118,ol);p.r(BX-4,BY-4,152,116,wood);p.r(BX-4,BY-4,152,1,woodL);p.r(BX-4,BY-4,1,116,woodL);p.r(BX-1,BY-1,146,110,'#8a5a30');
  p.r(BX,BY,144,108,PAPER);
  // ledge with paint tubes
  p.r(BX-13,BY+109,170,9,ol);p.r(BX-12,BY+110,168,7,wood);p.r(BX-12,BY+110,168,2,woodL);p.r(BX-12,BY+116,168,1,woodD);
  [['#ec3b3b',BX+6],['#2e7cf6',BX+18],['#ffd60a',BX+120],['#3cc24a',BX+131]].forEach(([c,x])=>{p.r(x,BY+104,8,6,'#4b3a5e');p.r(x+1,BY+105,6,4,c);p.r(x+1,BY+105,2,4,'#ffffff');p.r(x+8,BY+106,2,2,'#c9d2e0')});
}
function brushJar(p,cx,bottom){
  [['#ec3b3b',-4,-28],['#3cc24a',0,-32],['#2e7cf6',4,-26]].forEach(([c,dx,dy])=>{p.ln(cx+dx/2,bottom-6,cx+dx,bottom+dy,'#e8504a',2);p.r(cx+dx-1,bottom+dy-4,3,4,'#c9d2e0');p.r(cx+dx-1,bottom+dy-8,3,4,c);p.p(cx+dx,bottom+dy-9,c)});
  p.r(cx-7,bottom-14,14,14,'#5a7ea8');p.r(cx-6,bottom-13,12,12,'#d8f0ff');p.r(cx-6,bottom-8,12,7,'#9fd0f0');p.r(cx-5,bottom-12,2,10,'#ffffff');p.r(cx-8,bottom-15,16,2,'#5a7ea8');
}
function bookshelf(p,x,top){
  const w=112,h=F-top,ol='#5e3016',wd='#b8743c',wdl='#d8955a';
  p.tint(x-4,F,w+8,4,'#5a2a10',.3,.7);
  p.r(x-1,top-1,w+2,h+1,ol);p.r(x,top,w,h,wd);p.r(x,top,w,2,wdl);p.r(x,top,2,h,wdl);
  p.r(x+6,top+6,w-12,h-12,'#7a4422');p.d(x+6,top+6,w-12,h-12,'#6a381a',.4);
  const R=rng(21),BC=['#ec4b4b','#2e7cf6','#ffc93a','#3cb44a','#8b4fe0','#ff6fb5','#ff8c1a','#1fb8b0','#f4efe4'];
  const comp=4,ch=Math.floor((h-12)/comp);
  for(let k=0;k<comp;k++){const sy=top+6+k*ch,by=sy+ch-5;
    p.tint(x+6,sy,w-12,3,'#2a1008',.35,.6);
    p.r(x+6,by,w-12,5,wd);p.r(x+6,by,w-12,1,wdl);p.r(x+6,by+4,w-12,1,ol);
    let bx=x+8;
    while(bx<x+w-14){
      if(R()<.12){
        if(R()<.5&&bx+12<x+w-8){p.ellS(bx+5,by-5,5,5,['#c84a8a','#e86aa8','#ff9ccc'],'#7a2a5a');p.ln(bx+1,by-6,bx+9,by-4,'#ffd6ea')} // yarn ball
        bx+=12;continue}
      const bw=5+(R()*5|0),bh=Math.min(ch-8,18+(R()*15|0)),c=BC[R()*BC.length|0];
      if(bx+bw>x+w-8)break;
      const dk=mixh(c,'#2a1840',.45);
      p.r(bx,by-bh,bw,bh,dk);p.r(bx+1,by-bh+1,bw-2,bh-1,c);p.r(bx+1,by-bh+1,1,bh-1,mixh(c,'#ffffff',.45));
      p.r(bx+1,by-bh+4,bw-2,1,mixh(c,'#ffffff',.6));p.r(bx+1,by-7,bw-2,1,dk);
      bx+=bw+(R()<.3?1:0)}
  }
  // globe and a book stack on top
  const gx=x+28;
  p.r(gx-8,top-4,16,4,'#7a4a12');p.r(gx-7,top-3,14,2,'#e8ae30');p.r(gx-1,top-9,2,6,'#c08a28');
  p.ellS(gx,top-20,10,10,['#1f5fb8','#2e7cf6','#5aa6fb','#9fd0ff'],'#1a3f7a');
  p.disc(gx-4,top-23,3,'#4caf50');p.disc(gx+3,top-16,3,'#4caf50');p.disc(gx+5,top-25,1,'#4caf50');p.p(gx-5,top-24,'#86d46e');
  for(let a=-1.25;a<=1.25;a+=.04)p.p(gx-12*Math.cos(a),top-20+12*Math.sin(a),'#e8ae30');
  [[x+62,top-6,36,6,'#2e7cf6'],[x+65,top-11,30,5,'#ffc93a'],[x+61,top-15,33,4,'#ec4b4b']].forEach(([bx,by,bw,bh,c])=>{p.r(bx,by,bw,bh,mixh(c,'#2a1840',.45));p.r(bx+1,by+1,bw-2,bh-2,c);p.r(bx+bw-4,by+1,3,bh-2,'#fff6e0')});
}
function beanbag(p,cx){
  p.tint(cx-50,F-3,100,6,'#5a2a10',.3,.7);
  const cols=['#5f3cb8','#7a52d4','#9468e6','#ad88f4','#cdb2ff'];
  p.ellS(cx,F-18,47,20,cols,'#45288a');
  p.ellS(cx-6,F-32,30,15,cols,'#45288a');
  p.ln(cx-30,F-28,cx+20,F-22,'#7a52d4');
  p.ellS(cx+18,F-38,11,7,['#e05a9a','#ff8ac0','#ffc4e0'],'#a0386a');
  p.ellS(cx+56,F-6,6,6,['#c83030','#ec4b4b','#ff8a7a'],'#7a1a1a');p.ln(cx+52,F-8,cx+60,F-4,'#ffb0a0');p.ln(cx+61,F-2,cx+72,F,'#ec4b4b');
}
// Sadie's big book of paintings, standing on the floor: paper corners poking out the top, a little picture on the cover.
function paintingBook(p,x){
  const top=F+2-BOOK_H,w=BOOK_W,ol='#5e2a18',cv='#e0684a',cvD='#b04630',cvL='#f09070';
  p.tint(x-2,F-2,w+8,7,'#5a2a10',.3,.7);
  [['#7ccabe',x+16,6],['#ffd860',x+30,9],['#ff9fc4',x+44,5]].forEach(([c,sx,up])=>{p.r(sx-1,top-up-1,15,up+2,ol);p.r(sx,top-up,13,up+2,'#fffaf0');p.r(sx,top-up,13,3,c);p.r(sx,top-up,1,up+2,'#ffffff')});
  p.r(x,top-1,w,BOOK_H+1,ol);
  p.r(x+1,top,w-2,BOOK_H-1,cv);
  p.d(x+1,top+BOOK_H-22,w-2,20,cvD,.35);
  p.r(x+1,top,10,BOOK_H-1,cvD);p.r(x+10,top,1,BOOK_H-1,cvL);p.r(x+1,top,1,BOOK_H-1,'#8a3420');
  for(const yy of [top+14,top+BOOK_H-18]){p.r(x+1,yy,10,3,'#ffd860');p.r(x+1,yy,10,1,'#fff0a0')}
  p.r(x+w-4,top+1,3,BOOK_H-3,'#fff6e8');for(let yy=top+3;yy<top+BOOK_H-3;yy+=3)p.r(x+w-4,yy,3,1,'#d8c8b0');
  [[x+12,top+2],[x+w-12,top+2],[x+12,top+BOOK_H-8],[x+w-12,top+BOOK_H-8]].forEach(([cx,cy])=>{p.r(cx,cy,5,5,'#ffd860');p.r(cx,cy,5,1,'#fff0a0');p.r(cx+1,cy+1,3,3,cv)});
  const lx=x+20,ly=top+18,lw=40,lh=34;
  p.r(lx-1,ly-1,lw+2,lh+2,ol);p.r(lx,ly,lw,lh,'#fffaf0');
  p.r(lx+3,ly+3,lw-6,lh-9,'#8fd9f0');p.r(lx+3,ly+lh-14,lw-6,8,'#58bb52');p.ellS(lx+lw-12,ly+10,4,4,['#ffd860','#ffe890'],null);
  p.r(lx+10,ly+lh-20,10,8,'#ec3b3b');p.r(lx+8,ly+lh-22,14,2,'#9a5a2c');p.r(lx+13,ly+lh-16,4,4,'#fffaf0');
  p.r(lx+8,ly+lh-5,24,2,'#d8c8b0');
  p.r(x+w-18,F-3,4,11,'#ff6fb5');p.r(x+w-18,F-3,1,11,'#ff9fc4');p.r(x+w-18,F+8,2,2,null);
}
function framedFish(p,x,y){
  p.r(x-1,y-1,54,40,'#7a4a12');p.r(x,y,52,38,'#e8ae30');p.r(x,y,52,1,'#ffe48a');p.r(x+4,y+4,44,30,'#7a4a12');
  p.g2(x+5,y+5,42,28,['#9fd6ff','#5aa6fb','#2e7cf6'],false);
  p.ellS(x+24,y+19,9,5,['#e06010','#ff8c1a','#ffb84a'],'#9a3a08');
  for(let k=0;k<6;k++){p.ln(x+33,y+19,x+39,y+14+k*2,'#ff8c1a')}
  p.p(x+19,y+18,'#2a2238');p.p(x+13,y+12,'#ffffff');p.p(x+11,y+9,'#ffffff');p.disc(x+9,y+6,1,'#ffffff');
  p.ln(x+42,y+33,x+44,y+22,'#3cc24a');p.ln(x+45,y+33,x+46,y+25,'#2a9a3a');
}
function cubby(p,x,top){
  const w=152,h=F-top,ol='#5e3016',wd='#d08a48',wdl='#f0b070',bk='#8e5226';
  p.tint(x-4,F,w+8,4,'#5a2a10',.3,.7);
  p.r(x-1,top-1,w+2,h+1,ol);p.r(x,top,w,h,wd);p.r(x,top,w,2,wdl);
  const cw=(w-8)/3|0,chh=(h-8)/2|0;
  for(let r=0;r<2;r++)for(let c=0;c<3;c++){const cx=x+4+c*cw+2,cy=top+4+r*chh+2,iw=cw-4,ih=chh-4,b=cy+ih;
    p.r(cx-1,cy-1,iw+2,ih+2,ol);p.r(cx,cy,iw,ih,bk);p.d(cx,cy,iw,4,'#6a381a',.6);
    const k=r*3+c,m=cx+iw/2|0;
    if(k===0)brushJar(p,m,b);
    if(k===1)for(let s=0;s<5;s++){p.r(cx+6+(s%2),b-3-s*3,iw-12,3,'#c8bca8');p.r(cx+6+(s%2),b-3-s*3,iw-13,2,['#ffffff','#ffe2ee','#e2f4ff','#fff6c8','#ffffff'][s])}
    if(k===2){p.r(m-14,b-16,28,16,'#2a7a3a');p.r(m-13,b-15,26,14,'#ffd23f');p.r(m-13,b-9,26,3,'#3cc24a');['#ec3b3b','#2e7cf6','#ff8c1a','#8b4fe0','#3cc24a','#ff6fb5'].forEach((c,i)=>{p.r(m-12+i*4,b-21,3,6,c);p.p(m-11+i*4,b-22,c)})}
    if(k===3)[[-10,'#fff6e0'],[0,'#e2f4ff'],[10,'#ffe2ee']].forEach(([dx,c])=>{p.ellS(m+dx,b-5,5,5,['#c8bca8',c,'#ffffff'],'#8a7a68');p.disc(m+dx,b-5,1,'#c8bca8')});
    if(k===4){p.r(m-16,b-9,14,9,'#9a6a18');p.r(m-15,b-8,12,7,'#ffd84a');p.r(m+1,b-7,14,7,'#9a6a18');p.r(m+2,b-6,12,5,'#7fe0ff');p.p(m-10,b-5,'#e0a020');p.p(m-6,b-6,'#e0a020')}
    if(k===5){p.r(m-10,b-12,20,12,'#4b3a5e');p.r(m-9,b-11,18,10,'#ff8ac0');p.r(m-9,b-11,18,2,'#ffc4e0');p.disc(m,b-6,2,'#ffffff')}
  }
  // boombox on top
  const bx=x+44,by=top-26;
  p.ln(bx+52,by,bx+60,by-14,'#8e98b0');p.p(bx+60,by-15,'#ec3b3b');
  p.r(bx+12,by-7,36,3,'#4b3a5e');p.r(bx+12,by-7,3,8,'#4b3a5e');p.r(bx+45,by-7,3,8,'#4b3a5e');
  p.r(bx-1,by-1,62,27,'#7a1a3a');p.r(bx,by,60,25,'#ff5a7a');p.r(bx,by,60,2,'#ff9ab0');p.r(bx,by+21,60,4,'#d83a5a');
  [bx+12,bx+48].forEach(sx=>{p.ellS(sx,by+13,9,9,['#3a3048','#5a4e6a','#7a6e8a','#9e94ae'],'#2a2238');p.disc(sx,by+13,3,'#2a2238');p.p(sx-1,by+12,'#9e94ae')});
  p.r(bx+23,by+5,14,10,'#2a2238');p.r(bx+24,by+6,12,8,'#bfe8ff');p.disc(bx+27,by+10,1,'#2a2238');p.disc(bx+33,by+10,1,'#2a2238');
  [0,1,2,3].forEach(i=>p.r(bx+22+i*4,by+17,3,2,['#ffd23f','#3cc24a','#2e7cf6','#ffffff'][i]));
}
function wallClock(p,cx,cy){
  p.ellS(cx,cy,12,12,['#c88a20','#e8ae30','#ffcf4a','#ffe48a'],'#7a4a12');p.disc(cx,cy,9,'#fffaf0');
  for(let a=0;a<12;a++){const t=a/12*Math.PI*2;p.p(cx+Math.round(Math.sin(t)*7),cy-Math.round(Math.cos(t)*7),a%3?'#c9a88a':'#4b3a5e')}
  p.ln(cx,cy,cx,cy-6,'#4b3a5e');p.ln(cx,cy,cx+4,cy+2,'#4b3a5e');p.p(cx,cy,'#ec3b3b');
  // ears so the clock is a cat
  p.ln(cx-10,cy-7,cx-8,cy-15,'#7a4a12',2);p.ln(cx-8,cy-15,cx-3,cy-11,'#7a4a12',2);p.ln(cx+10,cy-7,cx+8,cy-15,'#7a4a12',2);p.ln(cx+8,cy-15,cx+3,cy-11,'#7a4a12',2);
}
function box(p,x,y,w,h){
  p.r(x,y,w,h,'#8a5a30');p.r(x+1,y+1,w-2,h-2,'#dcab6c');p.r(x+1,y+1,w-2,2,'#efc48a');p.d(x+w-8,y+3,7,h-4,'#c4935a',.5);
  p.r(x+(w>>1)-3,y+1,6,h-2,'#f0dca8');p.r(x+1,y+6,w-2,1,'#b8864c');
}
function ladder(p,x){
  const top=F-112,ol='#4a5a78';
  p.ln(x,F+2,x+20,top,ol,5);p.ln(x,F+2,x+20,top,'#c9d2e0',3);p.ln(x+40,F+2,x+20,top,ol,5);p.ln(x+40,F+2,x+20,top,'#a8b4c8',3);
  for(let k=1;k<6;k++){const y=F-k*18,t=(F-y)/(F-top),xl=x+20*t+3,xr=x+40-20*t-3;if(xr-xl>2){p.r(xl,y-1,xr-xl,4,ol);p.r(xl,y,xr-xl,2,'#e8eef8')}}
  p.r(x+12,top+4,16,4,ol);p.r(x+13,top+5,14,2,'#ffd23f');
}
function paintCan(p,x,c){
  p.r(x-1,F-17,16,17,'#5a6478');p.r(x,F-16,14,15,'#c9d2e0');p.r(x,F-16,3,15,'#ffffff');p.r(x,F-11,14,6,c);p.r(x,F-17,14,2,'#8e98b0');p.r(x+4,F-16,2,4,c);p.ln(x,F-20,x+7,F-24,'#5a6478');p.ln(x+7,F-24,x+14,F-20,'#5a6478');
}
function sawhorse(p,x,w){
  [x+6,x+w-10].forEach(lx=>{p.ln(lx,F+3,lx+4,F-28,'#6e3e1e',4);p.ln(lx+8,F+3,lx+4,F-28,'#6e3e1e',4)});
  p.r(x-1,F-35,w+2,10,'#4b3a5e');
  for(let i=0;i<w;i++){for(let j=0;j<8;j++)p.p(x+i,F-34+j,(((i+j)>>3)%2)?'#ffffff':'#ffc93a')}
}
function sign(p,x,y,icon){
  p.r(x-1,y-1,34,28,'#8a5a30');p.r(x,y,32,26,'#fffaf0');p.d(x,y+18,32,8,'#f0e6d4',.5);
  const q=new Px(8,8);q.map(icon,ICONPAL,0,0);
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){const v=q.b[j*8+i];if(v){const r=v&255,g=(v>>8)&255,b=(v>>16)&255,h='#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('');p.r(x+8+i*2,y+5+j*2,2,2,h)}}
  [[x-3,y-3],[x+27,y-3]].forEach(([tx,ty])=>{p.r(tx,ty,8,4,'#f4e6b8');p.d(tx,ty,8,4,'#e2d09a',.4)});
}
function sheetPiano(p,x0,x1){
  for(let x=x0;x<x1;x++){const u=(x-x0)/(x1-x0);const top=Math.round(F-74+(u<.08?(1-u/.08)*14:0)+(u>.92?((u-.92)/.08)*14:0)+Math.sin(u*9)*1.5);const bot=F-6+((x>>2)%2);
    p.p(x,top-1,'#7a84a8');for(let y=top;y<bot;y++){const fold=((x-x0)%16);p.p(x,y,fold<2?'#cdd5ee':fold<4&&bay(x,y)<.5?'#dfe5f6':'#f6f8ff')}p.p(x,bot,'#7a84a8')}
  p.r(x0+8,F-6,4,6,'#5e3016');p.r(x1-12,F-6,4,6,'#5e3016');p.r(x0+60,F-5,4,5,'#5e3016');
  p.tint(x0,F-2,x1-x0,4,'#5a2a10',.25,.7);
}

function upperDecor(p){
  const free=LY-16;
  if(free>40){
    const R=rng(77);
    [[430,1290],[30,390],[1340,1700]].forEach(([x0,x1],ri)=>{const y0=16+Math.round((free-34)/2),C=ri===0?['#ff6fb5','#ffd23f','#2e7cf6','#3cc24a','#8b4fe0','#ff8c1a']:['#ffffff','#ffd23f'];
      const sag=x=>y0+Math.round(12*Math.sin((x-x0)/(x1-x0)*Math.PI));
      for(let x=x0;x<=x1;x++)p.p(x,sag(x),'#7a5a48');
      for(let x=x0+8,i=0;x+10<x1;x+=16,i++){const y=sag(x+5)+1,c=C[i%C.length],d=mixh(c,'#2a1840',.4);for(let j=0;j<12;j++){const hw=Math.round(5*(1-j/12));p.r(x+5-hw,y+j,hw*2+1,1,c);p.p(x+5-hw,y+j,d);p.p(x+5+hw,y+j,d)}p.r(x,y,11,1,d)}});
  }
  if(free>70){
    [690,1010].forEach(x=>{const ly=16+free-46;p.r(x,14,1,ly-14,'#5e4a5a');p.r(x-3,ly-3,7,3,'#4b3a5e');
      const t=new Px(30,20);t.ellS(15,12,13,8,['#e0507a','#ff6f8e','#ff9ab0','#ffc4d2'],'#8a2848');for(let j=0;j<=12;j++)for(let i=0;i<30;i++){const v=t.b[j*30+i];if(v)p.b[(ly-7+j)*p.w+x-15+i]=v}p.r(x-13,ly+4,27,2,'#c83a62');
      p.disc(x,ly+6,3,'#fff6c8');for(let j=0;j<16;j++)for(let i=-12-j;i<=12+j;i++)if(bay(x+i,ly+8+j)<.18*(1-j/16))p.tint(x+i,ly+8+j,1,1,'#fff8d0',.45)});
  }
}

// Just the easel, on a transparent layer the same size as the studio. The world
// draws it over the clothesline so hung paintings go behind the easel's frame.
export function paintStudioFront(g) {
  ({ F, WH, BX, BY, LY } = g);
  const p = new Px(WORLD_W, WH);
  easel(p);
  return p.done();
}

// Draw the whole studio (three zones, the dollhouse cutaway frame) into a new
// world-sized bitmap. g is the geometry from studioGeometry(height).
export function paintStudio(g) {
  ({ F, WH, BX, BY, LY } = g);
  const p = new Px(WORLD_W, WH);
  wallA(p, 14, 412); wallStudio(p, 412, 1312); wallB(p, 1312, 1710);
  floor(p);
  // window light on the floor
  for (let y = F; y < WH; y++) { const t = (y - F) / (WH - F), xl = Math.round(474 + 70 * t), xr = Math.round(606 + 100 * t); for (let x = xl; x < xr; x++) if (bay(x, y) < .5) p.tint(x, y, 1, 1, '#fff4cc', .38); }
  // left room: reading nook in progress
  dropCloth(p, 40, 380); ladder(p, 70); paintCan(p, 130, '#8fd9b0'); paintCan(p, 150, '#ffdc8a');
  sawhorse(p, 186, 64); box(p, 280, F - 26, 46, 26); box(p, 330, F - 22, 40, 22); box(p, 296, F - 46, 40, 20);
  sign(p, 196, F - 180, ICON_BOOK);
  // studio
  windowObj(p, 474, F - 206, 132, 92);
  plant(p, 446);
  dropCloth(p, EX - 120, EX + 120);
  paintingBook(p, BOOK_X);
  easel(p);
  brushJar(p, EX + 104, F + 18);
  bookshelf(p, 880, F - 178);
  framedFish(p, 1030, F - 162);
  beanbag(p, 1058);
  wallClock(p, 1258, F - 158);
  cubby(p, 1122, F - 74);
  // right room: music room in progress
  ladder(p, 1340); sheetPiano(p, 1410, 1560); box(p, 1600, F - 28, 50, 28); box(p, 1610, F - 50, 38, 22); box(p, 1655, F - 20, 40, 20);
  sign(p, 1470, F - 180, ICON_NOTE); paintCan(p, 1575, '#ffb9d6');
  upperDecor(p);
  // dollhouse cutaway frame
  section(p, 0, 0, WORLD_W, 10); p.r(0, 9, WORLD_W, 1, '#8a5a36');
  p.r(14, 10, WORLD_W - 28, 4, '#fff6e8'); p.r(14, 13, WORLD_W - 28, 1, '#d8bc98'); p.tint(14, 14, WORLD_W - 28, 3, '#203040', .14, .5);
  innerWall(p, 400, ICON_BOOK); innerWall(p, 1300, ICON_NOTE);
  section(p, 0, 0, 14, WH); section(p, WORLD_W - 14, 0, 14, WH);
  p.r(0, WH - 4, WORLD_W, 4, '#f4dcb4'); p.r(0, WH - 4, WORLD_W, 1, '#8a5a36');
  return p.done();
}
