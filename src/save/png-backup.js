// Hides the backup text inside a PNG picture and reads it back. Phone share sheets take
// pictures but refuse JSON or text files, so the backup travels as a picture of the paintings
// with the data in a private chunk ("sdSt", ignored by every viewer). Pure: bytes in, bytes out.
const CHUNK = 'sdSt';
const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

let table = null;
function crc32(bytes) {
  if (!table) { table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const ascii = (s) => Uint8Array.from(s, (ch) => ch.charCodeAt(0));
const isPng = (b) => b && b.length > 20 && SIG.every((v, i) => b[i] === v);

// Walks the chunks: calls fn(type, start, length) with start the index of the chunk's data.
function walk(b, fn) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let at = 8; at + 12 <= b.length;) {
    const len = dv.getUint32(at), type = String.fromCharCode(b[at + 4], b[at + 5], b[at + 6], b[at + 7]);
    if (fn(type, at + 8, len, at) === false) return;
    at += 12 + len;
  }
}

// png: Uint8Array of a PNG. Returns a new PNG with `text` stored just before its end.
export function embedInPng(png, text) {
  if (!isPng(png)) throw new Error('not a png');
  const data = new TextEncoder().encode(text), body = new Uint8Array(4 + data.length);
  body.set(ascii(CHUNK)); body.set(data, 4);
  const chunk = new Uint8Array(12 + data.length), dv = new DataView(chunk.buffer);
  dv.setUint32(0, data.length); chunk.set(body, 4); dv.setUint32(8 + data.length, crc32(body));
  let iend = -1;
  walk(png, (type, s, l, at) => { if (type === 'IEND') { iend = at; return false; } });
  if (iend < 0) throw new Error('no end');
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, iend)); out.set(chunk, iend); out.set(png.subarray(iend), iend + chunk.length);
  return out;
}

// The text hidden in a PNG by embedInPng, or null (not a PNG, or nothing hidden in it).
export function extractFromPng(png) {
  if (!isPng(png)) return null;
  let found = null;
  walk(png, (type, s, l) => { if (type === CHUNK) found = new TextDecoder().decode(png.subarray(s, s + l)); }); // the last one wins
  return found;
}
