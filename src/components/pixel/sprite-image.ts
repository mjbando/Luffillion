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
  // zlib stream with stored (uncompressed) deflate blocks.
  const z: number[] = [0x78, 0x01];
  for (let i = 0; i < raw.length; i += 65535) {
    const len = Math.min(65535, raw.length - i);
    z.push(i + len >= raw.length ? 1 : 0, len & 255, len >> 8, ~len & 255, (~len >> 8) & 255);
    for (let j = 0; j < len; j++) z.push(raw[i + j]);
  }
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
