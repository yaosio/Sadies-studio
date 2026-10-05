// Sadie's speech bubble: a DOM element floating over the canvas. It points at
// her when she is on screen and docks to the top when she is not.
import { clamp } from '../art/px.js';
import { drawSadieFace } from '../art/sadie.js';

export function createSpeech(doc = document) {
  const bubble = doc.getElementById('bubble'), textEl = doc.getElementById('bubbleText');
  drawSadieFace(doc.getElementById('bubbleFace'));
  let until = 0, lastSay = 0;

  return {
    say(text, ms, now) {
      textEl.textContent = text;
      bubble.hidden = false;
      bubble.classList.remove('pop');
      void bubble.offsetWidth; // restart the pop animation
      bubble.classList.add('pop');
      until = now + (ms || Math.max(3200, text.length * 70));
      lastSay = now;
    },
    lastSay: () => lastSay,
    // head: where her head is in CSS pixels, or null to dock. sideX: CSS x to
    // sit left of when there is no room above her.
    place(now, head, sideX) {
      if (bubble.hidden) return;
      if (now > until) { bubble.hidden = true; return; }
      const bw = bubble.offsetWidth, bh = bubble.offsetHeight, vw = innerWidth, vh = innerHeight;
      const visible = head && head.x > -10 && head.x < vw + 10 && head.y > -10 && head.y < vh - 20;
      let x, y, cls = '';
      if (!visible) { x = (vw - bw) / 2; y = 12; cls = 'dock'; }
      else {
        y = head.y - bh - 14; x = head.x - bw * 0.7;
        if (y < 8) { cls = 'side'; x = sideX - bw - 12; y = Math.max(8, head.y - 6); }
        x = clamp(x, 12, vw - bw - 12); y = clamp(y, 8, vh - bh - 8);
      }
      bubble.className = (bubble.classList.contains('pop') ? 'pop ' : '') + cls;
      if (!cls) bubble.style.setProperty('--tx', clamp(head.x - x, 18, bw - 18) + 'px');
      bubble.style.left = Math.round(x) + 'px';
      bubble.style.top = Math.round(y) + 'px';
    },
  };
}
