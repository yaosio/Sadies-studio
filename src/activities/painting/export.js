// Saving out: a painting as a PNG (long-press a hung painting in the room), or everything as one file
// (from the book's page).
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

// Hand a file to the viewer. On a phone or tablet the system share sheet opens, where they
// pick where it goes (Drive, Files, messages...). Elsewhere, and if the share sheet is not
// available, hosts that run the page in a sandbox offer their own save (the `downloads`
// capability); otherwise a normal download link works.
const phoneLike = () => { try { return matchMedia('(pointer: coarse)').matches && !!navigator.canShare; } catch (e) { return false; } };

async function shareFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  try {
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file] });
    return true;
  } catch (e) {
    return !!e && e.name === 'AbortError'; // they closed the sheet: that was their answer; anything else falls back to saving
  }
}

// share: false skips the share sheet and always downloads (the backup file: see docs/saving.md).
export async function saveFile(blob, filename, share = true) {
  if (share && phoneLike() && (await shareFile(blob, filename))) return true;
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

export async function savePng(p, filename) {
  const blob = await new Promise((done) => paintingToCanvas(p).toBlob(done, 'image/png'));
  return blob ? saveFile(blob, filename) : false;
}

// Everything in one file (see save/backup.js). Always a download: a share sheet refuses JSON files, and a
// picture with the data hidden in it could silently lose the data if an app recompressed it.
export const saveJson = (text, filename) => saveFile(new Blob([text], { type: 'application/json' }), filename, false);

// Asks for a file (the system picker) and gives its text, or null if they cancel. Must run from a tap, or the browser will not open the picker.
export function pickFile() {
  return new Promise((done) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json,text/plain'; input.style.display = 'none';
    input.onchange = async () => { const f = input.files && input.files[0]; input.remove(); try { done(f ? await f.text() : null); } catch (e) { done(null); } };
    input.addEventListener('cancel', () => { input.remove(); done(null); });
    document.body.appendChild(input);
    input.click();
  });
}
