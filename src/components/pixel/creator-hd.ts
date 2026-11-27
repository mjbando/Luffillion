import type { Look } from "./chest-looks";
import { figureFromLook, trimTop } from "./generated";
import { Detail, HAKI_BLACK, HAKI_RED, S, autoShade, selOut, upscale } from "./mythic-hd";
import { ink, gold, shade, type Pose, type RunnerSprite } from "./kit";

// Gear 6 Luffy — the creator's one-of-one. Built on the same high-detail pipeline as the
// mythics, but with its own art direction so it outshines all of them: towering flame-white
// crowned hair, a gold-trimmed crimson captain's coat that billows, Haki-armoured fists
// crackling with gold and red lightning, a high emperor's collar, and a "dawn"
// aura — gold and crimson layered flames, Haki lightning and a rising-sun halo.

type Px = [number, number];

const CRIMSON = "#c4203a", CRIMSON_D = "#8e1430", LINING = "#3a0d1a";
const FLAME = ["#fffdf4", "#fff3c8", "#ffe07a", "#ffbd3a", "#ff7a2a", "#ff3b3b"];
const SUN = "#ffcf4a", SUN_D = "#ff8a2a", EMBER = "#ff4a3a", BLOOD = "#d81e4a";
const GOLD = gold, GOLD_L = "#fff0b0", GOLD_D = "#9a6a1c";
const MARGIN = 10;

const LOOK: Look = {
  h: "#fff6e0", hs: "flame", t: CRIMSON, sl: CRIMSON, l: "#2a1f33", sh: "#e0b955", coat: CRIMSON_D,
  x: ["sash:#f2c56b"], fx: "#ffc23a",
};

/** Flame tongue colour by height (0 = root, 1 = tip). */
const flameAt = (t: number) => FLAME[Math.min(FLAME.length - 1, Math.floor(t * FLAME.length))];

function paint(d: Detail, frame: number) {
  const { hx, hy, hw, cx, sk, tc, ty, th, tx, tw } = d;

  // ---------- Crowned flame hair ----------
  // Jagged Luffy bangs over the forehead, then tall tongues of white fire rising into a crown
  // that warm from white at the roots to gold and orange at the tips.
  const fringe = (x: number) => hy + 3 + [0, 2, 4, 2, 0, 1, 3, 1][((x - hx) % 8 + 8) % 8];
  const overHead = (x: number) => x > hx - 2 && x < hx + hw + 1;
  const hair = new Map<string, string>();
  const put = (x: number, y: number, c: string) => { if (!(overHead(x) && y >= fringe(x))) hair.set(`${x},${y}`, c); };
  // Cap: hugs the skull, with short swept side locks.
  for (let x = hx - 2; x <= hx + hw + 1; x++) for (let y = hy - 3; y < hy + 7; y++) {
    const side = x < hx || x >= hx + hw;
    if (side && y > hy + 3) continue;
    put(x, y, FLAME[0]);
  }
  const tongues: [number, number, number][] = [[-11, 8, -6], [-7, 13, -4], [-3, 17, -1], [1, 21, 1], [5, 16, 3], [9, 12, 5], [12, 7, 6]];
  const strandEdge = new Set<string>();
  const TOP = 24; // colour by height above the skull: white roots, gold body, orange and red tips
  tongues.forEach(([off, height, lean], i) => {
    const h = height + [0, 2, 1, 3][(frame + i) % 4]; // flicker
    for (let k = 0; k <= h; k++) {
      const t = k / h, w = Math.max(1, Math.round(4.6 * Math.pow(1 - t, 0.75)));
      const sway = Math.round(lean * t * t) + (t > 0.8 ? ((frame + i) % 2 ? 1 : -1) : 0);
      const x0 = cx + off + sway - (w >> 1);
      for (let j = 0; j < w; j++) put(x0 + j, hy - 3 - k, flameAt(Math.min(1, (k + 3) / TOP)));
      if (k > 1 && w > 1) strandEdge.add(`${x0},${hy - 3 - k}`);
    }
  });
  const inHair = (x: number, y: number) => hair.has(`${x},${y}`);
  d.asBody(() => {
    for (const [key, c] of hair) {
      const [x, y] = key.split(",").map(Number);
      // Warm shadow on each strand's left edge so the separate flames read.
      d.r(x, y, 1, 1, (strandEdge.has(key) || !inHair(x + 1, y)) && y < hy - 2 ? shade(c, -0.18) : c);
    }
    for (const key of hair.keys()) {
      const [x, y] = key.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inHair(x + dx, y + dy)) d.u(x + dx, y + dy, 1, 1, y < hy - 6 ? "#c0501e" : "#8a5a2a");
    }
  });
  for (let x = hx; x < hx + hw; x++) if (inHair(x, fringe(x) - 1)) d.d(x, fringe(x) - 1, "#f2d27a"); // gold under the bangs

  // ---------- Face ----------
  d.eyes("stern", "#ffb627", "#b8862a").mouth("grin"); // golden dawn eyes
  d.f(d.R, d.ey + 3, 3, 1, "#b04a3a").f(d.R + 1, d.ey + 2, 1, 3, "#b04a3a"); // the scar under his eye
  // Ears in front of the side locks.
  d.asBody(() => { for (const x of [hx - 3, hx + hw]) d.r(x, hy + 6, 3, 6, ink).r(x + 1, hy + 7, 1, 4, sk).r(x === hx - 3 ? x + 2 : x, hy + 7, 1, 4, shade(sk, -0.15)); });

  // ---------- High popped collar framing the head ----------
  d.asBody(() => {
    for (let j = 0; j < 9; j++) {
      const w = 2 + (j >> 1);
      d.u(hx - 2 - w, ty - 1 - j, w, 1, j === 8 ? GOLD : CRIMSON_D).u(hx - 3 - w, ty - 1 - j, 1, 1, GOLD);
      d.u(hx + hw + 2, ty - 1 - j, w, 1, j === 8 ? GOLD : CRIMSON_D).u(hx + hw + 2 + w, ty - 1 - j, 1, 1, GOLD);
    }
  });

  // ---------- Open chest, X scar, gold-trimmed crimson coat ----------
  d.r(tc - 3, ty + 2, 6, th - 9, sk).r(tc - 3, ty + 2, 1, th - 9, shade(sk, 0.2)).r(tc + 2, ty + 2, 1, th - 9, shade(sk, -0.18));
  for (let i = 0; i < 4; i++) d.d(tc - 2 + i, ty + 5 + i, "#b05a4a").d(tc + 1 - i, ty + 5 + i, "#b05a4a");
  d.r(tc - 4, ty + 2, 1, th - 8, GOLD).r(tc + 3, ty + 2, 1, th - 8, GOLD); // gold lapel piping
  d.r(tc - 5, ty + 2, 1, th - 8, LINING).r(tc + 4, ty + 2, 1, th - 8, LINING);
  // Billowing coat tails that flare out behind the legs and flap with each frame.
  const flap = frame % 2;
  d.asBody(() => {
    for (let y = ty + 4; y <= d.bottom - 3; y++) {
      const k = Math.max(0, y - (d.legY - 6));
      const reach = Math.round(k * 0.45) + (k > 0 ? flap : 0);
      d.u(tx - 4 - reach, y, 4 + reach, 1, y > d.bottom - 6 ? GOLD : CRIMSON_D);
      d.u(tx + tw, y, 4 + reach + (k > 0 ? 1 - flap : 0), 1, y > d.bottom - 6 ? GOLD : CRIMSON_D);
    }
  });
  d.trim(CRIMSON_D, GOLD, ty);
  d.folds(CRIMSON_D, d.legY - 4, 5);
  // Gold epaulettes with fringe: an emperor's coat.
  d.asBody(() => {
    for (const x of [tx - 5, tx + tw - 3]) {
      d.r(x, ty - 1, 8, 3, GOLD).r(x, ty - 1, 8, 1, GOLD_L).d(x + 3, ty, "#ff4a5a");
      for (let i = 0; i < 8; i += 2) d.r(x + i, ty + 2, 1, 3 + (i % 4 === 0 ? 1 : 0), i % 4 === 0 ? GOLD : GOLD_D);
    }
  });

  // ---------- Gold sash with a flowing knot ----------
  const sy = ty + th - 7;
  d.r(tx + 2, sy, tw - 4, 3, GOLD).r(tx + 2, sy, tw - 4, 1, GOLD_L).r(tx + 2, sy + 2, tw - 4, 1, GOLD_D);
  d.asBody(() => d.r(tc + 2, sy + 2, 4, 7, GOLD).r(tc + 3, sy + 3, 2, 5, GOLD_L).r(tc + 2, sy + 9, 4, 1, GOLD_D).r(tc + 5, sy + 5 + flap, 3, 4, GOLD_D));

  // ---------- Haki-armoured forearms crackling with lightning ----------
  for (const [ax, hand] of [[d.lx, d.lhy], [d.rx, d.rhy]] as Px[]) {
    d.r(ax + 1, ty + 2, d.aw - 2, 7, CRIMSON).r(ax + 1, ty + 8, d.aw - 2, 1, GOLD);
    d.r(ax, ty + 9, d.aw, hand - ty - 7, HAKI_BLACK).r(ax + 1, ty + 10, 1, hand - ty - 10, "#5a2440").d(ax + 1, hand, "#ff6a7a");
  }
  d.bolt(d.lx - 2, d.lhy - 8, -1, 9, "#ffe27a", HAKI_RED).bolt(d.rx + d.aw + 1, d.rhy - 8, 1, 9, "#ffe27a", HAKI_RED);
  d.bolt(d.lx - 1, d.lhy + 1, -1, 6, HAKI_RED, HAKI_BLACK).bolt(d.rx + d.aw, d.rhy + 1, 1, 6, HAKI_RED, HAKI_BLACK);

  // ---------- Trousers, gold cuffs, sandals ----------
  d.recolor(LOOK.l, 0, d.legY, d.W, d.bottom - d.legY, (x, y) => (y === d.bottom - 4 || y === d.bottom - 5 ? GOLD : (x + y) % 6 === 0 ? "#3a2c48" : null));
  d.recolor("#e0b955", 0, d.bottom - 3, d.W, 4, (x, y) => (y >= d.bottom - 1 ? "#8a5a32" : sk));
  d.clear(d.cx - 1, d.bottom - 4, 2, 5);
}

/**
 * The Dawn aura: layered gold-to-crimson rings that hug the silhouette, two-tone flame licks,
 * jagged Haki lightning and a rising-sun halo behind the head. `frame` varies the flames.
 */
function dawnAura(p: { cells: string[][]; width: number; height: number; key: (c: string) => string }, body: boolean[][], frame: number, head: Px, pad = 11) {
  const w = p.width + pad * 2, h = p.height + pad * 2;
  p.cells = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => p.cells[y - pad]?.[x - pad] ?? "."));
  p.width = w; p.height = h;
  const isBody = (x: number, y: number) => !!body[y - pad]?.[x - pad];
  const outside = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const stack: Px[] = [];
  for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h || outside[y][x] || p.cells[y][x] !== ".") continue;
    outside[y][x] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  const N4: Px[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const N8: Px[] = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ring = Array.from({ length: h }, () => Array<number>(w).fill(0));
  let edge: Px[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (outside[y][x] && N4.some(([dx, dy]) => isBody(x + dx, y + dy))) { ring[y][x] = 1; edge.push([x, y]); }
  for (let r = 2; r <= 6; r++) {
    const next: Px[] = [];
    for (const [x, y] of edge) for (const [dx, dy] of N8) {
      const nx = x + dx, ny = y + dy;
      if (outside[ny]?.[nx] && !ring[ny][nx] && !isBody(nx, ny)) { ring[ny][nx] = r; next.push([nx, ny]); }
    }
    edge = next;
  }
  const hash = (x: number, y: number, salt = 0) => (((x * 73856093) ^ (y * 19349663) ^ ((frame + 1 + salt) * 83492791)) >>> 0);
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < w && y < h) p.cells[y][x] = p.key(c); };
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && outside[y][x] && !isBody(x, y);
  // Rings: white-gold core → gold → orange → ember → crimson haze.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = ring[y][x];
    if (r === 1) set(x, y, "#fff6d8");
    else if (r === 2) set(x, y, "#ffd34d");
    else if (r === 3) set(x, y, `${SUN_D}d8`);
    else if (r === 4) set(x, y, (x + y + frame) % 2 ? `${EMBER}a0` : `${BLOOD}80`);
    else if (r === 5 && (x + y + frame) % 2 === 0) set(x, y, `${BLOOD}60`);
    else if (r === 6 && (x * 3 + y + frame) % 4 === 0) set(x, y, `${BLOOD}38`);
  }
  // Two-tone flame licks off every upward edge: tall gold tongues and crimson ones between them.
  const used = new Set<number>();
  for (let x = 1; x < w - 1; x++) for (let y = 1; y < h; y++) {
    if (ring[y][x] !== 1 || !isBody(x, y + 1) || isBody(x, y - 1)) continue;
    const k = hash(x, 7) % 9;
    if (k > 3 || used.has(x - 1) || used.has(x - 2) || used.has(x)) continue;
    used.add(x);
    const crimson = k % 2 === 1;
    const len = 5 + k * 3 + ((x + frame) % 3);
    for (let i = 1; i <= len; i++) {
      const t = i / len;
      const xx = x + (t > 0.45 ? ((hash(x, 3) & 1) ? 1 : -1) * ((frame + i) % 3 === 0 ? 1 : 0) + (t > 0.75 ? ((hash(x, 5) & 1) ? 1 : -1) : 0) : 0);
      const yy = y - i;
      if (yy < 0 || isBody(xx, yy) || !outside[yy]?.[xx]) break;
      const c = crimson ? (t < 0.4 ? EMBER : t < 0.8 ? BLOOD : `${BLOOD}a0`) : (t < 0.3 ? "#fff6d8" : t < 0.6 ? "#ffd34d" : t < 0.85 ? SUN_D : `${EMBER}c0`);
      set(xx, yy, c);
      if (t < 0.35 && free(xx + 1, yy)) set(xx + 1, yy, crimson ? `${EMBER}c0` : "#ffe07acc");
    }
  }
  // Haki lightning: zigzag bolts with white-gold cores and red glow on both flanks, re-rolled every frame.
  for (let b = 0; b < 2; b++) {
    const side = b ? 1 : -1;
    let x = Math.round(head[0] + pad + side * (24 + (hash(b, 1) % 4))), y = Math.round(head[1] + pad + 18 + (hash(b, 2) % 10));
    for (let seg = 0; seg < 5; seg++) {
      const run = seg % 2 ? 2 : 3 + (hash(b, seg, 5) % 2), dir = seg % 2 ? -side : side;
      for (let i = 0; i < run; i++) {
        if (free(x, y)) set(x, y, "#fff1a8");
        for (const [gx, gy] of [[x - 1, y], [x + 1, y]] as Px[]) if (free(gx, gy) && p.cells[gy][gx] === ".") set(gx, gy, `${HAKI_RED}d0`);
        x += dir * (seg % 2 ? 1 : 0); y += 1;
        if (seg % 2 === 0 && i % 2 === 1) x += dir;
      }
    }
    if (free(x, y)) set(x, y, HAKI_BLACK);
  }
  // Rising-sun halo behind the head: a double ring with rotating rays, only in empty space.
  const [hcx, hcy] = [head[0] + pad, head[1] + pad];
  const R = 27;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (p.cells[y][x] !== ".") continue;
    const dist = Math.hypot(x - hcx, y - hcy);
    const a = Math.atan2(y - hcy, x - hcx);
    if (dist > R - 1 && dist <= R + 0.6) set(x, y, SUN);
    else if (dist > R - 2.6 && dist <= R - 1 && (x + y) % 2 === 0) set(x, y, `${SUN_D}b0`);
    else if (dist > R + 2 && dist <= R + 6.5) {
      const ray = (((a + Math.PI) / (Math.PI * 2)) * 16 + frame * 0.25) % 1;
      if (ray < 0.18 && (dist <= R + 5 || ray < 0.08)) set(x, y, dist < R + 4 ? `${SUN}d0` : `${SUN_D}90`);
    }
  }
  return pad;
}

function build(pose: Pose, frame: number): RunnerSprite {
  const { f } = figureFromLook(LOOK, LOOK.fx!, pose, true);
  const body = upscale(figureFromLook(LOOK, LOOK.fx!, pose, true, true).f.p).cells.map((row) => row.map((k) => k !== "."));
  const faceColors = new Set([f.sk, shade(f.sk, -0.2), shade(f.sk, -0.25)]);
  const mask = f.p.cells.map((row, y) => row.map((k, x) => k !== "." && (faceColors.has(f.p.palette[k]) ||
    (f.p.palette[k] === ink && x > f.hx && x < f.hx + f.hw - 1 && y > f.hy && y < f.hy + f.hh))));
  const m = MARGIN;
  const p = upscale(f.p);
  // Extra headroom for the flame crown, plus side margins for the coat tails.
  const head = 14;
  p.cells = [...Array.from({ length: head }, () => Array<string>(p.width + m * 2).fill(".")), ...p.cells.map((row) => [...Array<string>(m).fill("."), ...row, ...Array<string>(m).fill(".")])];
  p.width += m * 2; p.height += head;
  const padded = [...Array.from({ length: head }, () => Array<boolean>(p.width).fill(false)), ...body.map((row) => [...Array<boolean>(m).fill(false), ...row, ...Array<boolean>(m).fill(false)])];
  const shifted = { ...f, hy: f.hy + head / S, ty: f.ty + head / S, lhy: f.lhy + head / S, rhy: f.rhy + head / S, bottom: f.bottom + head / S,
    g: { ...f.g, legY: f.g.legY + head / S } };
  const shiftedMask = [...Array.from({ length: head / S }, () => Array<boolean>(f.p.width).fill(false)), ...mask];
  autoShade(p);
  selOut(p);
  const d = new Detail(p, shifted, LOOK, LOOK.fx!, pose, shiftedMask, padded, m);
  paint(d, frame);
  const top = trimTop(p);
  padded.splice(0, top);
  const pad = dawnAura(p, padded, frame, [d.cx, d.hy - 2 - top]);
  const sprite = p.finish(Math.max(0, d.hx - 6 + pad + 1), Math.max(0, d.hy - 6 - top + pad + 1));
  return { ...sprite, scale: S, bleed: pad };
}

/** Gear 6 stands still (a single frame — animating it was too heavy); strides are only for walking. */
let idle: RunnerSprite | null = null;
let strides: RunnerSprite[] | null = null;

export function gear6IdleSprite(): RunnerSprite {
  idle ??= build(-1, 0);
  return idle;
}

export function gear6StrideSprite(right: boolean): RunnerSprite {
  strides ??= [build(0, 1), build(1, 2)];
  return strides[right ? 1 : 0];
}
