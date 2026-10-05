// Sparkles and hearts floating in the room. Positions are in room pixels.
import { SPARK, HEART } from '../art/effects.js';
import { clamp } from '../art/px.js';

export function createEffects() {
  const items = [];
  return {
    hearts(x, y, n) {
      for (let i = 0; i < n; i++) items.push({ k: 'heart', x: x + Math.random() * 10, y, t: -i * 0.18, vx: (Math.random() - 0.5) * 8 });
    },
    sparkle(x, y) { items.push({ k: 'spark', x, y, t: 0, vx: 0 }); },
    update(dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        items[i].t += dt;
        if (items[i].t > (items[i].k === 'heart' ? 1.4 : 0.7)) items.splice(i, 1);
      }
    },
    draw(c) {
      for (const f of items) {
        if (f.t < 0) continue;
        if (f.k === 'heart') {
          c.globalAlpha = clamp(1.4 - f.t, 0, 1);
          c.drawImage(HEART, Math.round(f.x + f.vx * f.t), Math.round(f.y - f.t * 18));
          c.globalAlpha = 1;
        } else {
          const fr = f.t < 0.15 ? 0 : f.t < 0.3 ? 1 : f.t < 0.5 ? 2 : f.t < 0.65 ? 1 : 0;
          c.drawImage(SPARK[fr], Math.round(f.x - 3), Math.round(f.y - 3));
        }
      }
    },
    count: () => items.length,
  };
}
