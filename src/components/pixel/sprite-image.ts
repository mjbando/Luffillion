import type { RunnerSprite } from "./kit";

// Turns a pixel sprite into a single PNG data URL, so heavy high-detail art renders as one
// <image> element instead of thousands of SVG rects (much cheaper to paint and re-render).
// Pure JS (uncompressed "stored" deflate), so the server and the browser produce identical markup.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(out: number[], v: number) { out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); }

function chunk(out: number[], type: string, data: Uint8Array) {
  u32(out, data.length);
  const start = out.length;
  for (let i = 0; i < 4; i++) out.push(type.charCodeAt(i));
  for (let i = 0; i < data.length; i++) out.push(data[i]);
  u32(out, crc32(Uint8Array.from(out.slice(start)), 0, out.length - start));
}

function parse(color: string): [number, number, number, number] {
  const n = parseInt(color.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, color.length > 7 ? parseInt(color.slice(7, 9), 16) : 255];
}

// ---------- Tiny deflate ----------
// Pixel art is mostly runs (transparent space, flat colours) and rows that repeat the row above,
// so a fixed-Huffman block that only looks back one pixel or one row shrinks it a lot, while
// staying small, synchronous and deterministic (server and browser markup must match).
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

function deflateFixed(data: Uint8Array, stride: number): number[] {
  const out: number[] = [];
  let bits = 0, n = 0;
  const put = (value: number, count: number) => { // LSB first
    bits |= value << n; n += count;
    while (n >= 8) { out.push(bits & 255); bits >>>= 8; n -= 8; }
  };
  const code = (value: number, count: number) => { // Huffman codes go MSB first
    let r = 0;
    for (let i = 0; i < count; i++) r = (r << 1) | ((value >> i) & 1);
    put(r, count);
  };
  const literal = (v: number) => {
    if (v < 144) code(0x30 + v, 8); else if (v < 256) code(0x190 + v - 144, 9);
    else if (v < 280) code(v - 256, 7); else code(0xc0 + v - 280, 8);
  };
  put(1, 1); put(1, 2); // final block, fixed Huffman
  for (let i = 0; i < data.length;) {
    let best = 0, dist = 0;
    for (const d of [4, stride, 1]) {
      if (d > i || d > 32768) continue;
      let len = 0;
      while (len < 258 && i + len < data.length && data[i + len] === data[i + len - d]) len++;
      if (len > best) { best = len; dist = d; }
    }
    if (best < 3) { literal(data[i]); i++; continue; }
    let li = LEN_BASE.length - 1;
    while (LEN_BASE[li] > best) li--;
    literal(257 + li); put(best - LEN_BASE[li], LEN_EXTRA[li]);
    let di = DIST_BASE.length - 1;
    while (DIST_BASE[di] > dist) di--;
    code(di, 5); put(dist - DIST_BASE[di], DIST_EXTRA[di]);
    i += best;
  }
  literal(256);
  if (n > 0) out.push(bits & 255);
  return out;
}

function encode(sprite: RunnerSprite) {
  const { width: w, height: h, rows, palette } = sprite;
  const colors: Record<string, [number, number, number, number]> = {};
  for (const [k, c] of Object.entries(palette)) colors[k] = parse(c);
  // Raw scanlines: a filter byte (0) followed by RGBA pixels.
  const raw = new Uint8Array((w * 4 + 1) * h);
  rows.forEach((row, y) => {
    const base = y * (w * 4 + 1) + 1;
    for (let x = 0; x < w; x++) {
      const c = colors[row[x]];
      if (c) raw.set(c, base + x * 4);
    }
  });
  // zlib stream: one fixed-Huffman deflate block (see deflateFixed).
  const z: number[] = [0x78, 0x01, ...deflateFixed(raw, w * 4 + 1)];
  let a = 1, b = 0;
  for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  u32(z, ((b << 16) | a) >>> 0);

  const out: number[] = [137, 80, 78, 71, 13, 10, 26, 10];
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, w);
  new DataView(ihdr.buffer).setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  chunk(out, "IHDR", ihdr);
  chunk(out, "IDAT", Uint8Array.from(z));
  chunk(out, "IEND", new Uint8Array(0));
  let bin = "";
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.slice(i, i + 0x8000));
  return `data:image/png;base64,${btoa(bin)}`;
}

const cache = new WeakMap<RunnerSprite, string>();
export function spriteDataUrl(sprite: RunnerSprite): string {
  let url = cache.get(sprite);
  if (!url) { url = encode(sprite); cache.set(sprite, url); }
  return url;
}
