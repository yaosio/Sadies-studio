// Saving a painting out as a PNG picture (long-press a hung painting in the room).
import { PAPER, PAINT } from '../../art/palette.js';

const TARGET_SIDE = 1600; // the picture is about this many pixels on its long side

// Every cell becomes a whole-number square, so the picture stays crisp.
export function paintingToCanvas(p) {
  const s = Math.max(1, Math.floor(TARGET_SIDE / Math.max(p.w, p.h)));
  const cv = document.createElement('canvas');
  cv.width = p.w * s; cv.height = p.h * s;
  const c = cv.getContext('2d');
  c.fillStyle = PAPER;
  c.fillRect(0, 0, cv.width, cv.height);
  p.forEachPaint((x, y, v) => { c.fillStyle = PAINT[v - 1].hex; c.fillRect(x * s, y * s, s, s); });
  return cv;
}

// Hand the file to the viewer. Hosts that run the page in a sandbox offer their
// own save (the `downloads` capability); otherwise a normal download link works.
export async function savePng(p, filename) {
  const blob = await new Promise((done) => paintingToCanvas(p).toBlob(done, 'image/png'));
  if (!blob) return false;
  try {
    const downloads = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (downloads) { await downloads.save({ filename, data: blob }); return true; }
  } catch (e) { return false; } // the viewer said no, or saving is unavailable
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
