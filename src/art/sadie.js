// Sadie the cat: grey and white, pink ears, green eyes. Drawn from character maps.
import { Px } from './px.js';

const SPAL = { o: '#4b3a5e', G: '#7e7a92', g: '#a19db3', l: '#c9c5d6', w: '#fffdf8', s: '#e2dbe8', p: '#ffa3c0', P: '#e0718f', e: '#74c96f', E: '#24402c', c: '#f2bf94' };
const HEAD = [
  '.o............o.', '.oo..........oo.', '.oGo........oGo.', '.oGpo......opGo.', '.oGppooooooppGo.',
  'oGGgggwwwwgggGGo', 'oGgggwwwwwwgggGo', 'oggGwwwccwwwGggo', 'oggoowwcccwoowwo', 'ogweEwwcccwEewwo',
  'owpwwwwPPwwwwpwo', 'owppwwwsswwwppwo', '.owwwwwwwwwwwwo.', '..oowwwwwwwwoo..', '....oooooooo....'];
const HEAD_BLINK = HEAD.map((r, i) => (i === 8 ? 'ogggwwwcccwwwwwo' : i === 9 ? 'ogwooowcccwooowo' : r));
const BODY = [
  '....oooooooooooooo......', '..oGGGgggggggggggggo....', '.oGGgggggggglllgggggo...', '.oGgggggggllwwwwwwwwwo..',
  '.oggggllwwwwwwwwwwwwwo..', '.oglwwwwwwwwwwwwwwwwwo..', '.owwwwwwwwwwwwwwwwwwwo..', '.owwwwwwwwwwwwwwwwwwso..',
  '.oswwwwwwwwwwwwwwwwsso..', '..osswwwwssssswwwwsso...', '..owwooowwoooowwoowwoo..', '..owwo.owwo..owwoowwo...',
  '..owwo.owwo..owwoowwo...', '..owwo.owwo..owwoowwo...', '..oooo.oooo..oooooooo...'];

export const SADIE_W = 40;
export const SADIE_H = 34;
// Spare room to the left of her, so a wagging tail is never cut off. The sprite is drawn
// SADIE_PAD pixels left of her anchor to make up for it.
export const SADIE_PAD = 12;
const px = new Px(SADIE_W + SADIE_PAD, SADIE_H);

// state: { blinking: bool, flick: 0..1 tail flick, sway: number (0 when motion is reduced) }
export function sadieSprite(state, T) {
  const p = px;
  p.b.fill(0);
  const fl = state.flick > 0 ? Math.sin((1 - state.flick) * Math.PI * 3) * 1.4 : 0;
  const sway = (state.sway ? Math.sin(T * 1.5) * 0.35 : 0) + fl;
  const pts = [];
  for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push([SADIE_PAD + 10 - 7 * Math.sin(t * 1.7) + sway * 6 * t * t + (t > 0.8 ? (t - 0.8) * 16 : 0), 20 - 16 * t, t]); }
  pts.forEach(([x, y]) => p.r(Math.round(x) - 2, Math.round(y) - 2, 4, 4, SPAL.o));
  pts.forEach(([x, y, t]) => p.r(Math.round(x) - 1, Math.round(y) - 1, 2, 2, t > 0.78 ? SPAL.G : SPAL.g));
  p.map(BODY, SPAL, SADIE_PAD + 8, 18);
  p.map(state.blinking ? HEAD_BLINK : HEAD, SPAL, SADIE_PAD + 22, 8);
  [[20, 18], [21, 18], [20, 20], [21, 19], [38, 18], [39, 18], [38, 19], [39, 20]].forEach(([x, y]) => p.p(SADIE_PAD + x, y, '#8e8aa2'));
  return p.done();
}

// Just her face, for the speech bubble.
export function drawSadieFace(canvas) {
  const s = sadieSprite({ blinking: false, flick: 0, sway: false }, 0);
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 20, 17);
  g.drawImage(s, SADIE_PAD + 20, 7, 20, 17, 0, 0, 20, 17);
}
