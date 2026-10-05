// Everything the child made, in one file, and back again. Pure: the browser side
// (share sheet, download, file picker) is in activities/painting/export.js.
// The file is an ordinary version-2 save plus a marker, so it goes through
// migrate.js like anything else and old backups keep loading. See docs/saving.md.
import { migrate, CURRENT_VERSION } from './migrate.js';
import { decodePainting, paintedCells } from './codec.js';

export const BACKUP_APP = 'sadies-studio';
// Limits on a file brought back in, so a wrong or crafted file cannot hang a phone.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PAINTINGS = 300;
export const MAX_PAINTED_CELLS = 100e6;

// activities: every activity's saved state, as the store holds it ({ painting: { current, hung, book }, ... }).
// A new activity is carried along automatically; bringing it back needs a merge for it (see parseBackup).
export function buildBackup(activities, when = new Date()) {
  return { app: BACKUP_APP, kind: 'backup', version: CURRENT_VERSION, saved: when.toISOString(), activities };
}

export const backupName = (when = new Date()) => 'sadies-studio-backup-' + when.toISOString().slice(0, 10) + '.txt';

const same = (a, b) => a.w === b.w && a.h === b.h && a.d === b.d;

// Text of a file -> { current, hung, book } (paintings still encoded, junk dropped),
// or null if it is not a Sadie's Studio file, or asks for more than the limits above allow.
export function parseBackup(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return null; }
  const data = migrate(raw);
  const s = data.activities && data.activities.painting;
  if (!s || typeof s !== 'object') return null;
  const lists = [s.hung, s.book].map((v) => (Array.isArray(v) ? v : []));
  const all = [...lists[0], ...lists[1], s.current];
  if (lists[0].length + lists[1].length > MAX_PAINTINGS) return null;
  if (all.reduce((n, p) => n + paintedCells(p), 0) > MAX_PAINTED_CELLS) return null;
  const ok = (p) => (decodePainting(p) ? { w: p.w, h: p.h, d: p.d } : null);
  const list = (v) => v.map(ok).filter(Boolean);
  return { current: ok(s.current), hung: list(lists[0]), book: list(lists[1]) };
}

// Merge a file into what the device already has. Nothing is replaced or removed:
// every painting in the file that is not already here (same size and paint) is
// added; one that is already here is skipped. A painting changed since the backup is a
// different painting, so both stay. Returns the encoded paintings to add, line first
// (oldest first), then the book, then the easel's.
export function newFromBackup(incoming, have) {
  const seen = [...have];
  const out = [];
  for (const p of [...incoming.hung, ...incoming.book, ...(incoming.current ? [incoming.current] : [])]) {
    if (/^A\d*$/.test(p.d) || seen.some((q) => same(p, q))) continue; // bare paper, or already here
    seen.push(p); out.push(p);
  }
  return out;
}
