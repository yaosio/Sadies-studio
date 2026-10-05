// Saved data versions. Add one step per change; never edit an old step.
//   v1  the approved mockup: { p: [text], c: text } with 72 x 54 paintings,
//       one letter per pixel, no run counts, under the key "sadies-studio-v1".
//   v2  { version: 2, activities: { painting: { current, hung } } } where each
//       painting is { w, h, d } (see codec.js).
import { encodeCells } from './codec.js';

export const CURRENT_VERSION = 2;
const V1_W = 72;
const V1_H = 54;

export function emptySave() {
  return { version: CURRENT_VERSION, activities: {} };
}

function v1ToV2(old) {
  const painting = (s) => {
    const cells = new Uint8Array(V1_W * V1_H);
    for (let i = 0; i < cells.length && i < s.length; i++) cells[i] = Math.min(10, Math.max(0, s.charCodeAt(i) - 65));
    return { w: V1_W, h: V1_H, d: encodeCells(cells) };
  };
  const hung = old.p.filter((s) => typeof s === 'string').map(painting);
  const current = typeof old.c === 'string' ? painting(old.c) : null;
  return { version: 2, activities: { painting: { current, hung } } };
}

// Takes whatever was read from storage (already JSON-parsed, or anything) and
// returns a current-version save. Unreadable input becomes an empty save.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptySave();
  let data = raw;
  if (data.version === undefined && Array.isArray(data.p)) data = v1ToV2(data);
  if (data.version === 2 && data.activities && typeof data.activities === 'object') return data;
  return emptySave();
}
