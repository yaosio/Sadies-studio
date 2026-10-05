// Little effect sprites: sparkles when you touch things, hearts when Sadie is happy.
import { Px } from './px.js';

function mkSparkle(f){const p=new Px(7,7),c='#ffffff',y='#fff3a0';if(f===0){p.p(3,3,c)}else if(f===1){p.p(3,3,c);p.p(3,2,y);p.p(3,4,y);p.p(2,3,y);p.p(4,3,y)}else{p.p(3,3,c);p.r(3,1,1,5,y);p.r(1,3,5,1,y);p.p(3,0,'#fff8d0');p.p(3,6,'#fff8d0');p.p(0,3,'#fff8d0');p.p(6,3,'#fff8d0');p.p(3,2,c);p.p(3,4,c);p.p(2,3,c);p.p(4,3,c)}return p.done()}
function mkHeart(){const p=new Px(7,6);p.map([".pp.pp.","pwpppp.","ppppppp",".ppppp.","..ppp..","...p..."].map(r=>r.padEnd(7,'.')),{p:'#ff6fa8',w:'#ffffff'},0,0);p.outline('#b03070');return p.done()}
export const SPARK = [0, 1, 2].map(mkSparkle);
export const HEART = mkHeart();

// Arrows at the screen edges that hint the room goes on.
const CHEV = ['....oo', '...oyo', '..oyyo', '.oyyyo', 'oyyyyo', '.oyyyo', '..oyyo', '...oyo', '....oo'];
const chevron = (rows) => { const p = new Px(6, 9); p.map(rows, { o: '#4b3a5e', y: '#ffffff' }, 0, 0); return p.done(); };
export const CHEVRON_LEFT = chevron(CHEV);
export const CHEVRON_RIGHT = chevron(CHEV.map((r) => r.split('').reverse().join('')));
