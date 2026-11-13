// Reads the character map of a WOFF2 font without a dependency (retro-skin design "Fonts", Requirement 3.8).
// WOFF2: a 48-byte header, a table directory with UIntBase128 lengths, then one Brotli stream holding the
// tables back to back in directory order. `cmap` is never transformed, so its bytes sit in that stream as they are.
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
/** Known-tag indexes used here (WOFF2 spec, table of known tags). */
const CMAP = 0;
const GLYF = 10;
const LOCA = 11;
function base128(b: Buffer, at: { pos: number }): number {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = b[at.pos++]!;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error('UIntBase128 longer than 5 bytes');
}
/** The raw `cmap` table of a WOFF2 file. */
export function woff2Cmap(file: string): Buffer {
  const b = readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file} is not WOFF2`);
  const numTables = b.readUInt16BE(12);
  const compressed = b.readUInt32BE(20);
  const at = { pos: 48 };
  let offset = 0;
  let cmap: { offset: number; length: number } | null = null;
  for (let i = 0; i < numTables; i++) {
    const flags = b[at.pos++]!;
    const tag = flags & 0x3f;
    const version = flags >> 6;
    if (tag === 63) at.pos += 4; // an arbitrary tag follows
    const origLength = base128(b, at);
    // glyf and loca are transformed at version 0; every other table at a non-zero version.
    const transformed = tag === GLYF || tag === LOCA ? version === 0 : version !== 0;
    const length = transformed ? base128(b, at) : origLength;
    if (tag === CMAP) cmap = { offset, length };
    offset += length;
  }
  if (cmap === null) throw new Error(`${file} has no cmap`);
  const stream = brotliDecompressSync(b.subarray(at.pos, at.pos + compressed));
  return stream.subarray(cmap.offset, cmap.offset + cmap.length);
}
function format4(t: Buffer, base: number, out: Set<number>): void {
  const segX2 = t.readUInt16BE(base + 6);
  const ends = base + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  for (let i = 0; i < segX2 / 2; i++) {
    const end = t.readUInt16BE(ends + 2 * i);
    const start = t.readUInt16BE(starts + 2 * i);
    const delta = t.readUInt16BE(deltas + 2 * i);
    const rangeAt = ranges + 2 * i;
    const range = t.readUInt16BE(rangeAt);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph: number;
      if (range === 0) glyph = (c + delta) & 0xffff;
      else {
        const g = t.readUInt16BE(rangeAt + range + 2 * (c - start));
        glyph = g === 0 ? 0 : (g + delta) & 0xffff;
      }
      if (glyph !== 0) out.add(c);
    }
  }
}
function format12(t: Buffer, base: number, out: Set<number>): void {
  const groups = t.readUInt32BE(base + 12);
  for (let i = 0; i < groups; i++) {
    const g = base + 16 + 12 * i;
    const start = t.readUInt32BE(g);
    const end = t.readUInt32BE(g + 4);
    const glyph = t.readUInt32BE(g + 8);
    for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) out.add(c);
  }
}
/** Every code point the font maps to a glyph other than .notdef (format 4 and 12 subtables). */
export function codePoints(file: string): Set<number> {
  const t = woff2Cmap(file);
  const out = new Set<number>();
  const n = t.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const base = t.readUInt32BE(4 + 8 * i + 4);
    const format = t.readUInt16BE(base);
    if (format === 4) format4(t, base, out);
    else if (format === 12) format12(t, base, out);
  }
  return out;
}
