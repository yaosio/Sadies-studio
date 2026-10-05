// The book's two corner buttons: save everything as one file, and bring a file back in (merged,
// never replacing anything). The easel passes in what these need to see and change; see
// docs/saving.md and save/backup.js for the file itself.
import { saveBackupText, pickFile } from './export.js';
import { buildBackup, backupName, parseBackup, newFromBackup, MAX_FILE_BYTES } from '../../save/backup.js';
import { decodePainting } from '../../save/codec.js';

// ctx: { env, say, lines, id, size() -> { W, u, touch }, snapshot() -> the easel's saved state,
//        persist(), haveEncoded() -> every painting already here (encoded), add(painting) }
export function createBackupActions(ctx) {
  const { env, say, lines: LINES } = ctx;

  // Drawn 26u wide; the touch area is at least 44 CSS px. They act on lift (the file picker needs a real tap).
  function buttons() {
    const { W, u, touch } = ctx.size();
    const s = 26 * u, g = 3 * u, y = 3 * u, t = Math.max(s, touch), pad = Math.round((t - s) / 2);
    const one = (k, x) => ({ k, v: { x, y, w: s, h: s }, r: { x: x - pad, y: y - pad, w: t, h: t } }); // v: what is drawn, r: what is touched
    return [one('load', W - 2 * (s + g)), one('backup', W - (s + g))];
  }

  async function backupAll() {
    env.sound.play('hang'); say(LINES.backingUp);
    ctx.persist();
    await saveBackupText(JSON.stringify(buildBackup({ ...env.store.all().activities, [ctx.id]: ctx.snapshot() })), backupName());
  }

  // Merge a file into what is here: nothing is replaced (see save/backup.js).
  async function restore() {
    const text = await pickFile(MAX_FILE_BYTES);
    if (text === null) return;
    if (text === 'toobig') { env.sound.play('tool'); say(LINES.restoredBig); return; }
    say(LINES.restoring);
    const got = parseBackup(text);
    if (!got) { env.sound.play('tool'); say(LINES.restoredBad); return; }
    const fresh = newFromBackup(got, ctx.haveEncoded());
    if (!fresh.length) { env.sound.play('tool'); say(LINES.restoredNone); return; }
    for (const e of fresh) { const p = decodePainting(e); if (p) ctx.add(p); }
    ctx.persist(); env.sound.play('pop');
    say(fresh.length === 1 ? 'One painting came back. Welcome home.' : fresh.length + ' paintings came back. Welcome home.');
  }

  return { buttons, run: (k) => (k === 'backup' ? backupAll() : restore()) };
}
