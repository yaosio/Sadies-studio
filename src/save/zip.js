// A minimal zip writer and reader (files stored, not compressed): enough to put the backup and
// anything added to it later into one .zip. Pure: bytes in, bytes out.
let table = null;
export function crc32(bytes) {
  if (!table) { table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const enc = new TextEncoder(), dec = new TextDecoder();

// files: [{ name, data: Uint8Array | string }] -> Uint8Array of a zip.
export function makeZip(files) {
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); // utf-8 names
    head.setUint32(14, crc, true); head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
    parts.push(new Uint8Array(head.buffer), name, data);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((n, a) => n + a.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const a of all) { out.set(a, at); at += a.length; }
  return out;
}

// Reads a zip made by makeZip (stored files). Returns { name: text }, or null if it is not a readable zip.
export function readZip(bytes) {
  try {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), out = {};
    let end = -1;
    for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 65557; i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) return null;
    const count = dv.getUint16(end + 10, true);
    let at = dv.getUint32(end + 16, true);
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(at, true) !== 0x02014b50) return null;
      const method = dv.getUint16(at + 10, true), size = dv.getUint32(at + 24, true), nlen = dv.getUint16(at + 28, true), xlen = dv.getUint16(at + 30, true), clen = dv.getUint16(at + 32, true), local = dv.getUint32(at + 42, true);
      if (method !== 0) return null; // only stored files
      const name = dec.decode(bytes.subarray(at + 46, at + 46 + nlen)), start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      out[name] = dec.decode(bytes.subarray(start, start + size));
      at += 46 + nlen + xlen + clen;
    }
    return out;
  } catch (e) { return null; }
}
