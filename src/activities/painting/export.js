// Saving out: a painting as a PNG (long-press a hung painting in the room), or everything as one file
// (from the book's page).
import { PAPER, PAINT, PAGE } from '../../art/palette.js';
import { fitted } from './thumb.js';
import { embedInPng, extractFromPng } from '../../save/png-backup.js';

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

export async function saveFile(blob, filename) {
  if (phoneLike() && (await shareFile(blob, filename))) return true;
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

// Everything in one picture: a sheet of every painting with the backup text hidden inside it
// (save/png-backup.js), because share sheets take pictures but refuse JSON files.
const TILE_W = 64, TILE_H = 48, TILE_S = 3, TILE_GAP = 8, COLS = 6;
export async function saveBackupPicture(paintings, text, filename) {
  const n = Math.max(1, paintings.length), rows = Math.ceil(n / COLS), cw = TILE_W * TILE_S, ch = TILE_H * TILE_S;
  const cv = document.createElement('canvas');
  cv.width = COLS * (cw + TILE_GAP) + TILE_GAP; cv.height = rows * (ch + TILE_GAP) + TILE_GAP;
  const c = cv.getContext('2d');
  c.fillStyle = PAGE; c.fillRect(0, 0, cv.width, cv.height);
  paintings.forEach((p, i) => {
    const x = TILE_GAP + (i % COLS) * (cw + TILE_GAP), y = TILE_GAP + Math.floor(i / COLS) * (ch + TILE_GAP), cells = fitted(p, TILE_W, TILE_H);
    c.fillStyle = PAPER; c.fillRect(x, y, cw, ch);
    for (let j = 0; j < TILE_H; j++) for (let k = 0; k < TILE_W; k++) { const v = cells[j * TILE_W + k]; if (v) { c.fillStyle = PAINT[v - 1].hex; c.fillRect(x + k * TILE_S, y + j * TILE_S, TILE_S, TILE_S); } }
  });
  const blob = await new Promise((done) => cv.toBlob(done, 'image/png'));
  if (!blob) return false;
  const png = embedInPng(new Uint8Array(await blob.arrayBuffer()), text);
  return saveFile(new Blob([png], { type: 'image/png' }), filename);
}

// Asks for a file (the system picker) and gives its text (a backup picture's hidden text, or a
// plain file's contents), or null if they cancel. Must run from a tap, or the browser will not open the picker.
export function pickFile() {
  return new Promise((done) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/png,.png,.json,application/json,text/plain'; input.style.display = 'none';
    input.onchange = async () => {
      const f = input.files && input.files[0]; input.remove();
      try {
        if (!f) return done(null);
        const bytes = new Uint8Array(await f.arrayBuffer());
        done(extractFromPng(bytes) ?? new TextDecoder().decode(bytes));
      } catch (e) { done(null); }
    };
    input.addEventListener('cancel', () => { input.remove(); done(null); });
    document.body.appendChild(input);
    input.click();
  });
}
