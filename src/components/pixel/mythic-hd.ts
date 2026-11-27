import type { ChestCharacterId } from "@/data/chest-characters";
import type { Look } from "./chest-looks";
import { buildFigure, trimTop, HEAD, type Frame } from "./generated";
import { Pixels, ink, white, gold, silver, shade, type Pose, type RunnerSprite } from "./kit";

// High-detail mythic art. The mythic silhouette is built on the normal pixel grid,
// doubled, then given real pixel-art treatment: light/shadow shading, coloured inner
// outlines, proper eyes and mouths, and a hand-written detail pass for every character
// (scars, tattoos, emblems, trims, jewellery, weapons and power effects).

const S = 2;
const GOLD_D = "#9a6a1c", GOLD_L = "#fff0b0", BLOOD = "#c42a3a", HAKI_RED = "#ff2d55", HAKI_BLACK = "#160d22", SHIRT = "#f4f6fa";

type Px = [number, number];

function colorAt(p: Pixels, x: number, y: number): string | null {
  return x >= 0 && y >= 0 && x < p.width && y < p.height && p.cells[y][x] !== "." ? p.palette[p.cells[y][x]] : null;
}

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function upscale(src: Pixels) {
  const q = new Pixels(src.width * S, src.height * S);
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const k = src.cells[y][x];
    if (k !== ".") q.r(x * S, y * S, S, S, src.palette[k]);
  }
  return q;
}

/** Light from the top-left: a highlight along top edges and a shadow along bottom/right edges. */
function autoShade(p: Pixels) {
  const edits: [number, number, string][] = [];
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const c = colorAt(p, x, y);
    if (!c || c === ink) continue;
    const open = (dx: number, dy: number) => { const n = colorAt(p, x + dx, y + dy); return n === null || n === ink; };
    if (open(1, 0) || open(0, 1)) edits.push([x, y, shade(c, -0.24)]);
    else if (open(0, -1) || open(-1, 0)) edits.push([x, y, shade(c, 0.24)]);
  }
  for (const [x, y, c] of edits) p.r(x, y, 1, 1, c);
}

/** Selective outlining: inner outline pixels take a deep shade of the colour they border. */
function selOut(p: Pixels) {
  const edits: [number, number, string][] = [];
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    if (colorAt(p, x, y) !== ink) continue;
    let open = false;
    const seen = new Map<string, number>();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = colorAt(p, x + dx, y + dy);
      if (n === null) open = true;
      else if (n !== ink) seen.set(n, (seen.get(n) ?? 0) + 1);
    }
    if (!open && seen.size) edits.push([x, y, shade([...seen].sort((a, b) => b[1] - a[1])[0][0], -0.55)]);
  }
  for (const [x, y, c] of edits) p.r(x, y, 1, 1, c);
}

type EyeStyle = "stern" | "glare" | "happy" | "ring" | "nika" | "hawk" | "closedLeft" | "shadow" | "none";
type MouthStyle = "line" | "smile" | "smirk" | "grin" | "gapGrin" | "fangs" | "laugh" | "open" | "none";

class Detail {
  readonly hx: number; readonly hy: number; readonly hw: number; readonly hh: number; readonly cx: number;
  readonly tx: number; readonly ty: number; readonly tw: number; readonly th: number; readonly tc: number;
  readonly lx: number; readonly rx: number; readonly lhy: number; readonly rhy: number; readonly aw: number;
  readonly legX: number; readonly legY: number; readonly legH: number; readonly gap: number; readonly bottom: number; readonly W: number;
  readonly sk: string; readonly move: number; readonly L: number; readonly R: number; readonly ey: number;
  private bodyMode = false;
  /** `m` is a transparent margin added on both sides, for characters whose gear reaches past the body. */
  constructor(readonly p: Pixels, f: Frame, readonly look: Look, readonly accent: string, pose: Pose, private faceMask: boolean[][], private body: boolean[][], readonly m = 0) {
    this.hx = f.hx * S + m; this.hy = f.hy * S; this.hw = f.hw * S; this.hh = f.hh * S; this.cx = f.cx * S + m;
    this.tx = f.tx * S + m; this.ty = f.ty * S; this.tw = f.tw * S; this.th = f.th * S; this.tc = this.tx + this.tw / 2;
    this.lx = f.lx * S + m; this.rx = f.rx * S + m; this.lhy = f.lhy * S; this.rhy = f.rhy * S; this.aw = f.g.aw * S;
    this.legX = f.g.legX * S + m; this.legY = (f.g.legY + HEAD) * S; this.legH = f.g.legH * S; this.gap = f.g.gap * S;
    this.bottom = (f.bottom + 1) * S - 1; this.W = p.width; this.sk = f.sk;
    this.move = (pose === -1 ? 0 : pose === 0 ? -1 : 1) * S;
    this.L = this.hx + 3; this.R = this.hx + this.hw - 6; this.ey = this.hy + 8;
  }
  at(x: number, y: number) { return colorAt(this.p, x, y); }
  private mark(x: number, y: number, on = true) { if (this.body[y] && x >= 0 && x < this.body[y].length) this.body[y][x] = on; }
  /** Pixels painted inside `draw` count as part of the body, so the aura traces them. */
  asBody(draw: () => void) { this.bodyMode = true; try { draw(); } finally { this.bodyMode = false; } return this; }
  r(x: number, y: number, w: number, h: number, c: string) {
    this.p.r(x, y, w, h, c);
    if (this.bodyMode) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.mark(i, j);
    return this;
  }
  u(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.p.cells[j]?.[i] === ".") this.r(i, j, 1, 1, c);
    return this;
  }
  d(x: number, y: number, c: string) { return this.r(x, y, 1, 1, c); }
  clear(x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.p.cells[j]?.[i] !== undefined) { this.p.cells[j][i] = "."; this.mark(i, j, false); }
    return this;
  }
  /** Repaints the low-res scar/tattoo cell column with skin before drawing a sharper one. */
  wipeScar(names = ["scar", "tattoo"]) {
    const spec = this.look.x?.find((x) => names.includes(x.split(":")[0]));
    if (spec) this.recolor(spec.split(":")[1], this.hx, this.hy, this.hw, this.hh, (x, y) => {
      const row = this.faceMask[Math.floor(y / S)];
      if (row) row[Math.floor((x - this.m) / S)] = true;
      return this.sk;
    });
    return this;
  }
  pts(list: Px[], c: string, behind = false) { for (const [x, y] of list) behind ? this.u(x, y, 1, 1, c) : this.d(x, y, c); return this; }
  isFace(x: number, y: number) { return !!this.faceMask[Math.floor(y / S)]?.[Math.floor((x - this.m) / S)]; }
  /** Paints only over skin, so features never spill onto hair, hats or glasses. */
  f(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.isFace(i, j)) this.d(i, j, c);
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string, behind = false) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    for (;;) {
      behind ? this.u(x, y, 1, 1, c) : this.d(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }
  /** Recolours pixels whose colour belongs to `family` inside a box. */
  recolor(family: string, x: number, y: number, w: number, h: number, paint: (x: number, y: number) => string | null) {
    const set = new Set([family, shade(family, -0.24), shade(family, 0.24)]);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const c = this.at(i, j);
      if (c && set.has(c)) { const n = paint(i, j); if (n) this.d(i, j, n); }
    }
    return this;
  }
  /** Gold (or any) piping along every outer edge of a cloth colour. */
  trim(family: string, c: string, fromY = 0) {
    const own = new Set([family, shade(family, -0.24), shade(family, 0.24)]);
    const edge = (x: number, y: number) => { const n = this.at(x, y); return n === null || n === ink || (lum(n) < 0.12 && !own.has(n)); };
    const hits: Px[] = [];
    this.recolor(family, 0, fromY, this.p.width, this.p.height - fromY, (x, y) => {
      if (edge(x - 1, y) || edge(x + 1, y) || edge(x, y + 1)) hits.push([x, y]);
      return null;
    });
    return this.pts(hits, c);
  }
  /** Vertical cloth folds every few pixels in the lower half of a garment. */
  folds(family: string, fromY: number, every = 4) {
    return this.recolor(family, 0, fromY, this.p.width, this.p.height - fromY, (x, y) => (x + (y > fromY + 6 ? 1 : 0)) % every === 0 ? shade(family, -0.28) : null);
  }

  /** Two separate round lenses with a bridge and a glint (replaces the low-res glasses). */
  glasses(frame: string, lens: string) {
    this.wipeScar(["glasses"]);
    for (const x of [this.L - 1, this.R]) {
      this.r(x + 1, this.ey - 2, 2, 1, frame).r(x + 1, this.ey + 2, 2, 1, frame).r(x, this.ey - 1, 1, 3, frame).r(x + 3, this.ey - 1, 1, 3, frame);
      this.r(x + 1, this.ey - 1, 2, 3, lens).d(x + 1, this.ey - 1, white);
    }
    return this.r(this.L + 3, this.ey, this.R - this.L - 3, 1, frame);
  }

  // ---------- Face ----------
  eyes(style: EyeStyle = "stern", iris = this.accent, brow = shade(this.look.h, -0.4)) {
    const { L, R, ey } = this;
    this.f(L, ey - 1, 3, 3, this.sk).f(R, ey - 1, 3, 3, this.sk);
    const both = (draw: (x: number, mirror: boolean) => void) => { draw(L, false); draw(R, true); };
    const brows = (lower = 0) => both((x, m) => {
      const inner = m ? x : x + 2, outer = m ? x + 2 : x;
      this.f(Math.min(x, x + 2), ey - 3 + lower, 3, 1, brow).f(inner, ey - 2 + lower, 1, 1, brow);
      this.f(outer, ey - 4 + lower, 1, 1, this.sk);
    });
    switch (style) {
      case "stern": case "glare":
        both((x) => { this.f(x, ey, 3, 1, ink).f(x, ey + 1, 3, 1, white).f(x + 1, ey + 1, 1, 1, iris); });
        if (style === "glare") both((x, m) => this.f(m ? x + 2 : x, ey + 1, 1, 1, ink));
        brows(style === "glare" ? 1 : 0); break;
      case "hawk":
        both((x, m) => { this.f(x, ey, 3, 1, ink).f(x, ey + 1, 3, 1, iris).f(x + 1, ey + 1, 1, 1, ink).f(m ? x : x + 2, ey - 1, 1, 1, ink); });
        brows(0); break;
      case "happy":
        both((x) => { this.f(x + 1, ey, 1, 1, ink).f(x, ey + 1, 1, 1, ink).f(x + 2, ey + 1, 1, 1, ink); }); break;
      case "ring":
        both((x) => { this.f(x, ey - 1, 3, 3, HAKI_RED).f(x + 1, ey, 1, 1, white); }); break;
      case "nika":
        both((x) => { this.f(x, ey - 1, 3, 1, HAKI_RED).f(x, ey, 3, 1, white).f(x + 1, ey, 1, 1, ink).f(x, ey + 1, 3, 1, HAKI_RED); }); break;
      case "closedLeft": // the character's own left eye, i.e. on the viewer's right
        this.f(R, ey + 1, 3, 1, ink);
        this.f(L, ey, 3, 1, ink).f(L, ey + 1, 3, 1, white).f(L + 1, ey + 1, 1, 1, iris);
        brows(0);
        this.line(R + 1, ey - 4, R + 1, ey + 4, "#8a2a2a"); break;
      case "shadow":
        both((x) => { this.f(x, ey, 3, 2, iris).f(x + 1, ey, 1, 1, white); }); break;
      case "none": break;
    }
    // Nose: a highlight and a shadow pixel.
    this.f(this.cx - 1, this.hy + 10, 1, 1, shade(this.sk, 0.25)).f(this.cx, this.hy + 11, 1, 1, shade(this.sk, -0.3));
    return this;
  }
  mouth(style: MouthStyle = "line") {
    const { cx, hy, sk } = this, dark = shade(sk, -0.55);
    this.f(cx - 2, hy + 12, 4, 2, sk);
    switch (style) {
      case "line": this.f(cx - 2, hy + 13, 4, 1, dark); break;
      case "smirk": this.f(cx - 2, hy + 13, 3, 1, dark).f(cx + 1, hy + 12, 1, 1, dark); break;
      case "smile": this.f(cx - 2, hy + 13, 4, 1, dark).f(cx - 3, hy + 12, 1, 1, dark).f(cx + 2, hy + 12, 1, 1, dark); break;
      case "open": // a laughing open mouth, the same size as the grin
        this.r(cx - 4, hy + 11, 8, 1, ink).r(cx - 4, hy + 12, 1, 2, ink).r(cx + 3, hy + 12, 1, 2, ink).r(cx - 3, hy + 14, 6, 1, ink)
          .r(cx - 3, hy + 12, 6, 1, white).r(cx - 3, hy + 13, 6, 1, "#a82a3a").r(cx - 1, hy + 13, 2, 1, "#e85a6a");
        break;
      case "laugh": // a wide-open laughing mouth with upper and lower teeth
        this.r(cx - 5, hy + 10, 10, 1, white).r(cx - 5, hy + 11, 10, 2, "#4a0c18").r(cx - 5, hy + 11, 1, 2, white).r(cx + 4, hy + 11, 1, 2, white)
          .r(cx - 3, hy + 12, 6, 1, "#c8344a").r(cx - 4, hy + 13, 8, 1, white).r(cx - 6, hy + 9, 1, 1, white).r(cx + 5, hy + 9, 1, 1, white);
        break;
      case "grin": case "gapGrin": case "fangs":
        this.r(cx - 4, hy + 11, 8, 1, ink).r(cx - 4, hy + 12, 8, 1, ink).r(cx - 3, hy + 12, 6, 1, white).r(cx - 3, hy + 13, 6, 1, ink);
        this.d(cx - 1, hy + 12, "#d8dce6");
        if (style === "gapGrin") this.d(cx + 1, hy + 12, ink);
        if (style === "fangs") this.d(cx - 3, hy + 13, white).d(cx + 2, hy + 13, white);
        break;
      case "none": break;
    }
    return this;
  }

  // ---------- Clothing ----------
  /** Open jacket: shirt V-neck, lapels and an optional tie. */
  suit(shirt = SHIRT, tie?: string, lapel = shade(this.look.t, 0.3)) {
    const { tc, ty } = this;
    for (let i = 0; i < 7; i++) {
      const half = Math.max(0, 3 - Math.floor(i / 2));
      this.r(tc - half - 1, ty + 2 + i, (half + 1) * 2, 1, shirt);
      this.d(tc - half - 2, ty + 2 + i, lapel).d(tc + half + 1, ty + 2 + i, lapel);
    }
    if (tie) this.r(tc - 1, ty + 2, 2, 2, shade(tie, -0.2)).r(tc - 1, ty + 4, 2, 6, tie).d(tc - 1, ty + 10, tie);
    return this;
  }
  buttons(c = gold, n = 3, start = this.ty + 5, step = 4) {
    for (let i = 0; i < n; i++) this.r(this.tc - 1, start + i * step, 2, 1, c).d(this.tc - 1, start + i * step, shade(c, 0.4));
    return this;
  }
  belt(c: string, buckle: string | null = gold, y = this.ty + this.th - 6) {
    this.r(this.tx + 2, y, this.tw - 4, 2, c).r(this.tx + 2, y, this.tw - 4, 1, shade(c, 0.25));
    if (buckle) this.r(this.tc - 2, y - 1, 4, 4, buckle).r(this.tc - 1, y, 2, 2, shade(buckle, -0.45));
    return this;
  }
  epaulettes(c = gold) {
    const { tx, tw, ty } = this;
    for (const x of [tx - 3, tx + tw - 3]) {
      this.r(x, ty, 6, 2, c).r(x, ty, 6, 1, shade(c, 0.4));
      for (let i = 0; i < 6; i += 2) this.r(x + i, ty + 2, 1, 2, shade(c, -0.2));
    }
    return this;
  }
  cuffs(c: string) {
    const { lx, rx, lhy, rhy, aw } = this;
    return this.r(lx + 1, lhy - 2, aw - 2, 1, c).r(rx + 1, rhy - 2, aw - 2, 1, c);
  }

  // ---------- Effects ----------
  bolt(x: number, y: number, dir: 1 | -1, len: number, a = HAKI_RED, b = HAKI_BLACK) {
    let px = x, py = y;
    for (let i = 0; i < len; i++) {
      this.d(px, py, i % 3 === 2 ? b : a);
      px += dir * (i % 2 === 0 ? 1 : 0); py += i % 2 === 0 ? 1 : 0;
      if (i % 4 === 3) px -= dir * 2;
    }
    return this;
  }
  sparkle(x: number, y: number, c = white) {
    return this.u(x, y - 1, 1, 3, c).u(x - 1, y, 3, 1, c).u(x, y, 1, 1, white);
  }
  flame(x: number, y: number, h: number, colors: string[]) {
    for (let i = 0; i < h; i++) {
      const w = Math.max(1, Math.round((h - i) / 2));
      this.u(x - Math.floor(w / 2) + ((i % 3) === 1 ? 1 : 0), y - i, w, 1, colors[Math.min(colors.length - 1, Math.floor((i / h) * colors.length))]);
    }
    return this;
  }
  orb(x: number, y: number, rad: number, c: string, crack?: string) {
    for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (i * i + j * j <= rad * rad + 1) this.u(x + i, y + j, 1, 1, i + j < -rad / 2 ? shade(c, 0.4) : c);
    if (crack) this.line(x - rad + 1, y, x, y - 1, crack).line(x, y - 1, x + 1, y + rad - 1, crack);
    return this;
  }
}

type Painter = (d: Detail) => void;

/** Extra transparent canvas (HD pixels per side) for characters whose gear reaches past the body. */
const MARGIN: Partial<Record<ChestCharacterId, number>> = {
  "prime-rayleigh": 4, "blackbeard-full": 4, "kaido-hybrid": 8, "big-mom-full": 8, "luffy-gear-5-bajrang": 6,
  "zoro-conqueror": 10, "whitebeard-quake": 8, "dragon-full": 6, "mihawk-strongest": 8, "shanks-divine": 6,
};

/** Characters drawn as flat silhouettes (no light/shadow shading). */
const FLAT = new Set<ChestCharacterId>(["joy-boy"]);
const LAVENDER = "#d6ccf6", SWIRL = "#9f8fe6", SIL = "#0b0910";

/** A 5×5 hand-drawn spiral, for Gear 5 cloud hair. */
const SPIRAL: Px[] = [[1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 3], [1, 2], [2, 1], [0, 1], [0, 2], [0, 3], [1, 4], [2, 4]];

function gear5(d: Detail) {
  const { cx, hy, hx, hw, sk } = d;
  // Clear the low-res afro, then build big cloud hair from overlapping puffs.
  d.clear(hx - 4, hy - 10, hw + 8, 10).clear(hx - 4, hy + 2, 4, 6).clear(hx + hw, hy + 2, 4, 6);
  const puffs: [number, number, number][] = [[-9, -1, 6], [-3, -6, 7], [4, -6, 7], [10, -1, 6], [0, -11, 4], [-13, 6, 5], [13, 6, 5], [-12, 13, 4], [12, 13, 4]];
  const cloud = new Map<string, number>();
  puffs.forEach(([ox, oy, r], i) => {
    for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) if (k * k + j * j <= r * r + r / 2 && !cloud.has(`${cx + ox + k},${hy + oy + j}`)) cloud.set(`${cx + ox + k},${hy + oy + j}`, i);
  });
  const fringe = (x: number) => hy + 3 + (((x - hx) >> 1) % 2 ? 2 : 0);
  const inCloud = (x: number, y: number) => cloud.has(`${x},${y}`);
  const overHead = (x: number) => x > hx - 2 && x < hx + hw + 1;
  d.asBody(() => {
    for (const [key, i] of cloud) {
      const [x, y] = key.split(",").map(Number);
      if (overHead(x) && y >= fringe(x) && y < d.ty) continue;
      const [ox, oy, r] = puffs[i];
      const below = !inCloud(x, y + 1) || y - (hy + oy) > r * 0.45;
      const c = below ? LAVENDER : x - (cx + ox) < -r / 2 && y - (hy + oy) < 0 ? "#ffffff" : "#f6f4ff";
      if (overHead(x) && y < fringe(x)) d.r(x, y, 1, 1, c); else d.u(x, y, 1, 1, c);
    }
    for (const key of cloud.keys()) {
      const [x, y] = key.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inCloud(x + dx, y + dy)) d.u(x + dx, y + dy, 1, 1, ink);
      if (overHead(x) && y === fringe(x) - 1 && x > hx && x < hx + hw - 1) d.d(x, y, "#b8aef0");
    }
  });
  // Lavender swirls in the bigger puffs.
  for (const [ox, oy] of [[-3, -7], [4, -6], [-10, -1], [10, -1], [-13, 6], [13, 6]] as Px[])
    for (const [sx, sy] of SPIRAL) {
      const x = cx + ox - 2 + sx, y = hy + oy - 2 + sy;
      if (inCloud(x, y) && (y < fringe(x) || !overHead(x))) { const c = d.at(x, y); if (c && c !== ink) d.d(x, y, SWIRL); }
    }
  // Ears in front of the hair.
  d.asBody(() => { for (const x of [hx - 3, hx + hw]) d.r(x, hy + 6, 3, 6, ink).r(x + 1, hy + 7, 1, 4, sk).r(x === hx - 3 ? x + 2 : x, hy + 7, 1, 4, shade(sk, -0.15)); });
  // Big round black eyes with a glint, and a little smile.
  // Gear 5 face in the shared style: bright eyes, a toothy grin and the stitched scar under his eye.
  d.eyes("happy").mouth("open");
  d.f(d.R, d.ey + 3, 3, 1, "#b04a3a").f(d.R + 1, d.ey + 2, 1, 3, "#b04a3a");
  // Open white vest over the bare chest with the X scar, a purple sash, white shorts and sandals.
  const { tc, ty, th, tx, tw } = d;
  d.r(tc - 3, ty + 2, 6, th - 9, sk).r(tc - 3, ty + 2, 1, th - 9, shade(sk, 0.2)).r(tc + 2, ty + 2, 1, th - 9, shade(sk, -0.18));
  d.r(tc - 4, ty + 2, 1, th - 8, LAVENDER).r(tc + 3, ty + 2, 1, th - 8, LAVENDER);
  for (let i = 0; i < 4; i++) d.d(tc - 2 + i, ty + 5 + i, "#b05a4a").d(tc + 1 - i, ty + 5 + i, "#b05a4a");
  const sy = ty + th - 7;
  d.r(tx + 2, sy, tw - 4, 3, "#8a4ad0").r(tx + 2, sy, tw - 4, 1, "#a874f0").r(tx + 2, sy + 2, tw - 4, 1, "#6a32a8");
  d.asBody(() => d.r(tc + 2, sy + 2, 4, 6, "#7a3ec0").r(tc + 3, sy + 3, 2, 4, "#a874f0").r(tc + 2, sy + 8, 4, 1, "#5a2a90"));
  // White short sleeves and bare forearms.
  for (const [ax, hand] of [[d.lx, d.lhy], [d.rx, d.rhy]] as Px[]) {
    d.r(ax + 1, ty + 2, d.aw - 2, 7, "#f6f4ff").r(ax + 1, ty + 8, d.aw - 2, 1, LAVENDER).r(ax + 1, ty + 9, d.aw - 2, hand - ty - 8, sk);
  }
  // Bare feet in sandals with a gap between them.
  d.recolor("#d9a274", 0, d.bottom - 4, d.W, 5, (x, y) => y >= d.bottom - 1 ? "#8a5a32" : sk);
  d.clear(d.cx - 1, d.bottom - 4, 2, 5);
  // Baggy white trousers ending in fluffy fur cuffs above bare feet.
  d.asBody(() => { for (const x of [d.legX - 1, d.legX + d.gap - 1]) for (let i = 0; i < 9; i++) d.r(x + i, d.bottom - 7 + ((i + 1) % 3 === 0 ? -1 : 0), 1, 3, i % 3 === 1 ? "#ffffff" : "#e8e2fa").d(x + i, d.bottom - 4, LAVENDER); });
  d.recolor("#ffffff", 0, d.legY, d.W, 6, (x, y) => (x + y) % 5 === 0 ? LAVENDER : null);
  // Curling steam clouds of Nika drifting around him.
  for (const [ox, oy] of [[d.tx - 9, d.ty + 4], [d.tx + d.tw + 4, d.ty - 2], [d.tx - 7, d.bottom - 9], [d.tx + d.tw + 3, d.bottom - 12]] as Px[]) {
    for (let j = -2; j <= 3; j++) for (let k = -2; k <= 4; k++) if (k * k + j * j <= 9) d.u(ox + k, oy + j, 1, 1, j > 1 ? LAVENDER : "#fbfaff");
    for (const [sx, sy] of SPIRAL) d.u(ox - 2 + sx, oy - 2 + sy, 1, 1, SWIRL);
    d.u(ox + 4, oy - 3, 2, 1, "#fbfaff").u(ox + 6, oy - 4, 1, 1, "#fbfaff");
  }
  // Shade the white clothes with lavender instead of grey, as in the anime.
  for (const [grey, lav] of [["#c2c2c2", LAVENDER], ["#737373", "#8f80cf"], ["#575757", "#6f60b0"]]) d.recolor(grey, 0, d.ty - 2, d.W, d.bottom, () => lav);
}

const ROCKS_BLUE = "#3a78d0", ROCKS_BLUE_L = "#8cc4ff", ROCKS_BLUE_D = "#24508f", ROCKS_STREAK = "#0e1424";
const FUR = "#1a1620", FUR_L = "#3a3442";

/** Rocks D. Xebec: towering blue hair streaked black, a manic toothy grin, a cracked scar, braided whiskers and a black fur coat. */
/** Draws a free-form shape (hair, beard, moustache) as body pixels with an ink outline. */
function blob(d: Detail, cells: Map<string, string>, front: (x: number, y: number) => boolean = () => true) {
  d.asBody(() => {
    for (const [key, c] of cells) { const [x, y] = key.split(",").map(Number); if (front(x, y)) d.r(x, y, 1, 1, c); else d.u(x, y, 1, 1, c); }
    for (const key of cells.keys()) {
      const [x, y] = key.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cells.has(`${x + dx},${y + dy}`)) d.u(x + dx, y + dy, 1, 1, ink);
    }
  });
  return d;
}
const SUIT_BLACK = "#1e1e28";

/** Saturn: white barrister curls framing a scarred face, a white beard, black suit, white cape and a twisted cane. */
function saturn(d: Detail) {
  const { hx, hy, hw, cx, ty, tc } = d;
  d.wipeScar(["scar"]).wipeScar(["beard"]).eyes("stern", "#5a4a6a", "#d8d8e0").mouth("none");
  d.f(d.L - 1, d.ey - 1, 4, 1, shade(d.sk, -0.25)).f(d.R, d.ey - 1, 4, 1, shade(d.sk, -0.25)); // heavy lids
  d.line(d.R + 4, hy + 2, d.R - 1, d.ey - 2, "#9a5a3a").line(d.R + 4, hy + 3, d.R, d.ey - 2, "#b8704a"); // forehead scar
  d.suit(SHIRT, SUIT_BLACK).cuffs(SHIRT);
  // White moustache and a rounded beard.
  const beard = new Map<string, string>();
  for (let y = hy + 11; y < hy + d.hh + 4; y++) {
    const half = y < hy + 13 ? 4 : Math.max(2, 6 - Math.max(0, y - (hy + d.hh)));
    for (let x = cx - half - 1; x < cx + half + 1; x++) beard.set(`${x},${y}`, (x + y) % 4 === 0 ? "#d8d8e4" : "#f6f6fa");
  }
  for (let x = cx - 2; x < cx + 2; x++) beard.delete(`${x},${hy + 13}`);
  blob(d, beard);
  d.r(cx - 2, hy + 13, 4, 1, "#7a3a3a");
  // White barrister curls fanning out from the sides of his head, each with a grey rolled end.
  const curls = new Map<string, string>();
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const a = (-10 + i * 16) * Math.PI / 180, len = 4 + (i % 2) + (i > 2 ? 1 : 0), bx = s < 0 ? hx : hx + hw - 1, by = hy + i * 3;
    for (let t = 0; t <= len; t++) {
      const x = Math.round(bx + s * t * Math.cos(a)), y = Math.round(by + t * Math.sin(a));
      const end = t >= len - 1;
      curls.set(`${x},${y}`, end ? "#a8a8bc" : "#ffffff");
      curls.set(`${x},${y + 1}`, end ? "#8a8aa0" : "#d8d8e4");
    }
  }
  blob(d, curls, (x) => x < hx || x >= hx + hw);
  // Black suit, white shirt and tie, white cape over the shoulders.
  d.recolor("#e8e8f0", 0, ty - 2, d.W, d.p.height, () => "#262630"); // the low-res cape becomes jacket
  // The white cape draped over both shoulders, hanging outside the arms.
  d.asBody(() => {
    for (const [x0, s] of [[d.lx - 4, -1], [d.rx + d.aw, 1]] as Px[]) {
      for (let y = ty - 2; y < d.legY + 6; y++) {
        const w = 4 + Math.min(2, (y - ty) >> 3);
        for (let i = 0; i < w; i++) {
          const x = s < 0 ? x0 + 4 - w + i : x0 + i, outer = s < 0 ? i === 0 : i === w - 1;
          d.u(x, y, 1, 1, outer ? "#b8b8cc" : (x + y) % 6 === 0 ? "#dcdce8" : "#f4f4f8");
        }
      }
      d.r(s < 0 ? d.lx - 2 : d.rx, ty - 2, d.aw + 2, 3, "#f4f4f8").r(s < 0 ? d.lx - 2 : d.rx, ty + 1, d.aw + 2, 1, "#c8c8d8");
    }
  });
  d.r(tc - 1, ty, 2, 2, SHIRT);
}

/** Mars: long white hair down his back, a huge flowing white beard, navy suit. */
function mars(d: Detail) {
  const { hx, hy, hw, cx, ty } = d;
  d.wipeScar(["beard"]).eyes("stern", "#5a5a6a", "#e8e8f0").mouth("none");
  d.f(d.L - 1, d.ey - 1, 4, 1, shade(d.sk, -0.25)).f(d.R, d.ey - 1, 4, 1, shade(d.sk, -0.25));
  d.suit("#e8e4f4", SUIT_BLACK, "#2a3060").cuffs(SHIRT);
  const hair = new Map<string, string>();
  for (let y = hy - 2; y < ty + 12; y++) for (let x = hx - 3; x < hx + hw + 3; x++) {
    const side = x < hx || x >= hx + hw;
    if (!side && y > hy + 1 && !(y < hy + 4 && (x < hx + 3 || x >= hx + hw - 3))) continue;
    if (side && (x === hx - 3 || x === hx + hw + 2) && y < hy + 1) continue;
    hair.set(`${x},${y}`, x === cx - 1 && y < hy + 2 ? "#c8c8d4" : (x * 2 + y) % 6 === 0 ? "#d0d0dc" : "#f2f2f6");
  }
  blob(d, hair, (x, y) => y < ty || x < hx - 1 || x > hx + hw);
  // Moustache sweeping out, then a long two-pointed beard over the tie.
  const beard = new Map<string, string>();
  for (let y = hy + 11; y < ty + 14; y++) {
    const t = (y - hy - 11) / (ty + 14 - hy - 11), half = Math.round(6 - 3 * t);
    for (let x = cx - half; x < cx + half; x++) {
      if (y > ty + 6 && Math.abs(x - cx + 0.5) < 1 + (y - ty - 6) / 3) continue; // split into two points
      beard.set(`${x},${y}`, (x + y * 2) % 5 === 0 ? "#d0d0dc" : "#f6f6fa");
    }
  }
  blob(d, beard);
  d.suit("#e8e4f4", SUIT_BLACK, "#2a3060").cuffs(SHIRT);
}

/** Warcury: bald, purple birthmark, side tufts, and a gigantic tusk-shaped moustache. */
function warcury(d: Detail) {
  const { hx, hy, hw, cx } = d;
  d.wipeScar(["stache"]).eyes("glare", "#3a2a4a", "#3a2a4a").mouth("none");
  d.f(cx - 3, hy + 3, 5, 3, "#6a4a7a").f(cx - 2, hy + 2, 3, 1, "#6a4a7a").f(cx - 1, hy + 4, 1, 1, "#8a6a9a").f(cx + 1, hy + 3, 1, 1, "#4a2a5a"); // birthmark
  d.f(cx - 1, hy + 9, 2, 3, shade(d.sk, -0.18)); // nose
  for (const x of [hx - 1, hx + hw - 1]) d.asBody(() => d.r(x, hy + 2, 2, 4, "#f2f2f6").d(x, hy + 5, "#c8c8d4")); // white side tufts
  d.suit("#d8d0ec", "#3a3a5a", "#3a3a5a").cuffs("#d8d0ec");
  const stache = new Map<string, string>();
  for (const s of [-1, 1]) for (let i = 0; i <= 40; i++) {
    const t = i / 40, x = Math.round(cx + s * (1 + 14 * t)) - (s < 0 ? 1 : 0), y = Math.round(hy + 13 + 2 * Math.sin(t * Math.PI) - 7 * t * t * t);
    const th = Math.max(2, Math.round(5 * (1 - t) + 1.5));
    for (let j = 0; j < th; j++) stache.set(`${x},${y - j}`, j === th - 1 ? "#ffffff" : t > 0.75 ? "#e8e8f0" : "#f4f4f8");
  }
  blob(d, stache);
  d.r(cx - 2, hy + 16, 4, 1, shade(d.sk, -0.55));
  d.suit("#d8d0ec", "#3a3a5a", "#3a3a5a").cuffs("#d8d0ec");
}

/** Nusjuro: bald, round spectacles, an open white kimono over a lean chest, orange obi, katana. */
function nusjuro(d: Detail) {
  const { hy, cx, tc, ty, th, tx, tw } = d;
  d.wipeScar(["glasses"]).eyes("stern", "#3a2a1a", "#7a5a3a").glasses("#4a3a2a", "#e8e0d0").mouth("line");
  for (const x of [d.L, d.R + 1]) d.d(x + 1, d.ey, ink);
  d.f(cx - 4, hy + 2, 8, 1, shade(d.sk, -0.2)).f(cx - 3, hy + 4, 6, 1, shade(d.sk, -0.2)); // wrinkles
  d.f(cx - 3, hy + 13, 1, 1, shade(d.sk, -0.3)).f(cx + 2, hy + 13, 1, 1, shade(d.sk, -0.3)); // stern frown
  // Open kimono: bare chest in a deep V with muscle lines.
  for (let i = 0; i < th - 7; i++) {
    const half = Math.max(1, 5 - Math.floor(i / 3));
    d.r(tc - half, ty + 1 + i, half * 2, 1, d.sk).d(tc - half - 1, ty + 1 + i, "#d8d8e0").d(tc + half, ty + 1 + i, "#d8d8e0");
  }
  const mus = shade(d.sk, -0.22);
  d.r(tc - 4, ty + 4, 3, 1, mus).r(tc + 1, ty + 4, 3, 1, mus).r(tc, ty + 3, 1, 8, mus).r(tc - 2, ty + 7, 1, 1, mus).r(tc + 1, ty + 7, 1, 1, mus);
  // Orange obi with diagonal stripes.
  const oy = ty + th - 7;
  d.r(tx + 1, oy, tw - 2, 4, "#e0901a").r(tx + 1, oy, tw - 2, 1, "#f4b04a").r(tx + 1, oy + 3, tw - 2, 1, "#a8640a");
  for (let x = tx + 2; x < tx + tw - 2; x += 3) d.d(x, oy + 2, "#b8700e").d(x + 1, oy + 1, "#b8700e");
  d.folds("#f2f2f2", d.legY);
}

/** Ju Peter: slicked blond hair, a short blond beard, a scar on his chest, black suit and a grey fur-collared cape. */
function juPeter(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw } = d;
  d.wipeScar(["goatee"]).eyes("stern", "#4a3a2a", "#a88a40").mouth("line");
  d.f(d.L - 1, d.ey - 1, 4, 1, shade(d.sk, -0.22)).f(d.R, d.ey - 1, 4, 1, shade(d.sk, -0.22));
  const gold2 = "#e8d090", goldD = "#b89a50";
  // Beard along the jaw and a moustache.
  d.f(hx, hy + 9, 2, 6, gold2).f(hx + hw - 2, hy + 9, 2, 6, gold2).f(hx + 1, hy + 13, hw - 2, 3, gold2).f(cx - 4, hy + 11, 8, 1, gold2);
  d.f(cx - 2, hy + 13, 4, 1, shade(d.sk, -0.5)).f(hx + 3, hy + 14, 1, 1, goldD).f(hx + hw - 4, hy + 14, 1, 1, goldD);
  d.asBody(() => d.r(cx - 4, hy + d.hh, 8, 2, gold2).r(cx - 2, hy + d.hh + 2, 4, 1, goldD));
  // Open white collar with the scar on his chest, buttoned black jacket.
  for (let i = 0; i < 6; i++) { const half = Math.max(1, 4 - Math.floor(i / 2)); d.r(tc - half - 1, ty + 1 + i, half * 2 + 2, 1, SHIRT).r(tc - half + 1, ty + 1 + i, Math.max(0, half * 2 - 2), 1, d.sk); }
  d.d(tc - 4, ty, SHIRT).d(tc + 3, ty, SHIRT).line(tc - 2, ty + 1, tc + 1, ty + 4, "#a04a3a");
  d.buttons("#3a3a48", 2, ty + 9, 5).cuffs(SHIRT);
  // Grey fur collar on the cape.
  d.asBody(() => {
    for (let x = tx - 5; x < tx + tw + 5; x++) {
      if (x > tc - 6 && x < tc + 5) continue;
      const hgt = 3 + ((x * 7) % 3);
      d.r(x, ty - 2, 1, hgt, (x * 3) % 5 === 0 ? "#b8b8c0" : "#9a9aa2");
    }
  });
  d.recolor("#6a6a70", 0, ty + 3, d.W, d.p.height, (x, y) => (x + y * 2) % 7 === 0 ? "#585860" : null);
}

/** Garling: star-burst blond hair, dark glasses, a long pointed beard, black suit, a red coat and a sword. */
function garling(d: Detail) {
  const { hx, hy, hw, cx, ty } = d;
  d.eyes("none").mouth("line");
  d.f(d.L - 2, d.ey - 1, d.R - d.L + 6, 3, "#14141c").f(d.L - 1, d.ey - 1, 2, 1, "#5a5a70").f(d.R, d.ey - 1, 2, 1, "#5a5a70"); // dark glasses
  d.f(d.L - 2, d.ey - 3, 5, 1, "#a89868").f(d.R + 1, d.ey - 3, 5, 1, "#a89868"); // frowning brows
  d.suit(SHIRT, "#8a1a2a", "#2a2a36").cuffs(SHIRT);
  const HAIR = "#ece2bc", HAIR_D = "#c8b88a", LINE = "#a8946a";
  const star = new Map<string, string>();
  const put = (x: number, y: number, edge: boolean, hatch: boolean) => star.set(`${x},${y}`, hatch ? LINE : edge ? HAIR_D : HAIR);
  // Upward spike.
  for (let k = 0; k < 18; k++) { const half = Math.max(0, Math.round((hw / 2) * (1 - k / 18))); for (let x = cx - half; x < cx + half + (half ? 0 : 1); x++) put(x, hy + 1 - k, x === cx + half - 1, (x - cx) % 3 === 0 && k > 2); }
  // Sideways spikes from the temples.
  for (const s of [-1, 1]) for (let k = 0; k < 13; k++) {
    const half = Math.max(0, Math.round(3.5 * (1 - k / 13))), x = s < 0 ? hx - k : hx + hw - 1 + k;
    for (let j = -half; j <= half; j++) put(x, hy + 4 + j, j === half, j === 0 && k > 2 && k % 3 !== 0);
  }
  // Long beard tapering to a point over the tie: the star's lower ray.
  for (let y = hy + 11; y < ty + 14; y++) {
    const t = (y - hy - 11) / (ty + 14 - hy - 11), half = Math.max(0, Math.round(7 * (1 - t)));
    for (let x = cx - half; x < cx + half + (half ? 0 : 1); x++) put(x, y, x === cx + half - 1, (x - cx) % 3 === 1 && y % 2 === 0);
  }
  for (let x = cx - 2; x < cx + 2; x++) star.delete(`${x},${hy + 13}`);
  blob(d, star);
  d.r(cx - 2, hy + 13, 4, 1, "#5a4a3a");
  // Black suit, dark red tie, red coat draped on the shoulders.
  d.recolor("#c83040", 0, ty - 2, d.W, d.p.height, (x, y) => (x + y) % 6 === 0 ? "#a02030" : null);
  d.trim("#c83040", "#ff6a7a", ty);
}

// ---------- Upgraded heroes (modelled on the user's reference art) ----------

/** A thick curved stroke: samples a parametric curve and stamps a tapering width. */
function stroke(cells: Map<string, string>, n: number, at: (t: number) => [number, number], width: (t: number) => number, color: (t: number, j: number, w: number) => string) {
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y] = at(t), w = Math.max(1, Math.round(width(t)));
    for (let j = 0; j < w; j++) cells.set(`${Math.round(x)},${Math.round(y) - j}`, color(t, j, w));
  }
  return cells;
}
/** Two-tone gold fringe hanging from an epaulette. */
function fringe(d: Detail, x: number, y: number, w: number, c = gold) {
  for (let i = 0; i < w; i += 2) d.r(x + i, y, 1, 3 + (i % 4 === 0 ? 1 : 0), i % 4 === 0 ? c : shade(c, -0.2));
  return d;
}
/** A small four-point haki crack / shatter star in the air. */
function shatter(d: Detail, x: number, y: number, r: number, c: string, glow: string) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) for (let k = 1; k <= (dx && dy ? r - 1 : r); k++) d.u(x + dx * k + (k > 2 && dy === 0 ? (k % 2) : 0), y + dy * k, 1, 1, k === 1 ? glow : c);
  return d.u(x, y, 1, 1, white);
}

function garp(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw } = d;
  const hair = "#2a2d3a";
  d.wipeScar().eyes("glare", "#3a2a1a", "#14141c").mouth("grin");
  d.recolor(hair, hx - 2, hy - 4, hw + 4, 9, (x, y) => (x * 2 + y) % 7 === 0 ? "#6a6c78" : (x + y * 2) % 9 === 0 ? "#c8cad4" : "#9a9ca8"); // short grey hair
  d.f(d.R + 3, hy + 4, 1, 7, "#b56a5a"); // scar over his left eye
  // Short dark beard along the jaw and chin, moustache over the gritted grin.
  d.f(hx, hy + 9, 2, 6, hair).f(hx + hw - 2, hy + 9, 2, 6, hair).f(hx + 1, hy + 14, hw - 2, 2, hair).f(cx - 4, hy + 10, 8, 1, hair);
  d.asBody(() => d.r(cx - 4, hy + d.hh, 8, 2, hair).d(cx - 1, hy + d.hh + 2, hair).d(cx, hy + d.hh + 2, hair));
  // Black double-breasted suit, white shirt, red tie.
  d.suit(SHIRT, "#b02a2a", "#2a2a36").cuffs(SHIRT);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) d.r(s < 0 ? tc - 7 : tc + 5, ty + 10 + i * 4, 2, 2, "#7a7c88").d(s < 0 ? tc - 7 : tc + 5, ty + 10 + i * 4, "#a8aab4");
  // White Marine coat over the shoulders with blue-striped cuffs, red epaulettes and gold fringe.
  d.recolor("#f2f4f7", 0, d.legY - 2, d.W, 9, (x, y) => (y - d.legY) % 3 === 0 ? "#2a4a8a" : null);
  d.trim("#f2f4f7", "#b8bccc", ty + 2);
  d.asBody(() => { for (const x of [tx - 4, tx + tw - 4]) { d.r(x, ty - 1, 8, 3, "#c8282c").r(x, ty - 1, 8, 1, "#ff6a6a").d(x + 3, ty, gold); fringe(d, x, ty + 2, 8); } });
  // Fist of Love: the haki-black fist crackles with red lightning.
  d.bolt(d.rx + 10, d.rhy - 8, 1, 9).bolt(d.rx - 4, d.rhy + 4, -1, 7);
  shatter(d, d.rx + d.aw + 6, d.rhy + 2, 4, "#ff6a6a", "#ffe0e0");
}

function rayleigh(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
  const hairC = "#f0d890";
  d.wipeScar(["glasses"]).eyes("stern", "#5a7a8a", "#c8a858").glasses("#8a7a50", "#e8f4f8").mouth("smirk");
  for (const x of [d.L, d.R + 1]) d.d(x + 1, d.ey, ink);
  d.line(d.L - 1, hy + 4, d.L + 1, hy + 12, "#b0806a"); // scar over his right eye
  d.recolor(hairC, hx - 3, hy - 4, hw + 6, 24, (x, y) => (x * 2 + y) % 9 === 0 ? "#c8a858" : (x + y * 2) % 11 === 0 ? "#fff0c0" : null); // swept-back strands
  d.f(cx - 4, hy + 11, 3, 1, hairC).f(cx + 1, hy + 11, 3, 1, hairC); // moustache
  // Tall purple patterned collar rising either side of his jaw.
  d.asBody(() => {
    for (const x0 of [hx - 3, hx + hw - 1]) for (let y = ty - 7; y < ty + 4; y++) for (let i = 0; i < 4; i++) {
      const c = (i + y) % 4 === 0 ? "#8a6ac8" : (i * 3 + y) % 5 === 0 ? "#3a1e5a" : "#5a3a8a";
      if (y < ty) d.u(x0 + i, y, 1, 1, c); else d.r(x0 + i, y, 1, 1, c);
    }
  });
  // Navy long coat open over a bare chest.
  for (let i = 0; i < 10; i++) { const half = Math.max(1, 4 - Math.floor(i / 3)); d.r(tc - half, ty + 1 + i, half * 2, 1, d.sk); }
  d.r(tc - 3, ty + 4, 2, 1, shade(d.sk, -0.22)).r(tc + 1, ty + 4, 2, 1, shade(d.sk, -0.22)).r(tc, ty + 5, 1, 4, shade(d.sk, -0.18));
  d.trim("#2a2a50", "#4a4a80", ty).folds("#2a2a50", d.legY);
  // White sash with a hanging end, red wristband.
  const sy = ty + th - 7;
  d.r(tx, sy, tw, 3, "#f4f4f8").r(tx, sy + 2, tw, 1, "#c8c8d8").asBody(() => d.r(tx + tw - 5, sy + 3, 3, 8, "#f4f4f8").r(tx + tw - 3, sy + 3, 1, 8, "#c8c8d8"));
  d.r(d.lx + 1, d.lhy - 3, d.aw - 1, 2, "#c8282c");
  // Sabre at his hip: green scabbard and a gold ring guard.
  const gx = tx + tw - 7, gy = sy - 4;
  d.asBody(() => {
    for (let o = 0; o < 2; o++) d.line(gx + 2 + o, gy + 4, tx + tw + 7 + o, d.bottom - 6, "#2a5a4a");
    d.line(gx + 2, gy + 4, tx + tw + 7, d.bottom - 6, "#4a8a6a").d(tx + tw + 8, d.bottom - 5, gold);
    for (const [dx, dy] of [[-2, 0], [-2, 1], [-1, -1], [0, -2], [1, -2], [2, -1], [3, 0], [3, 1]]) d.d(gx + dx, gy + dy, gold);
    d.r(gx, gy - 1, 2, 4, "#3a4a4a").d(gx, gy - 2, GOLD_L);
  });
  d.folds("#c8c0e8", d.legY + 2, 3);
}

function shanks(d: Detail) {
  const { hx, hy, hw, cx, tc, ty } = d;
  d.wipeScar().eyes("glare", "#ff3b3b", "#8a1818").mouth("grin");
  for (let i = 0; i < 3; i++) d.f(d.R - 1 + i * 2, d.ey - 3 + (i === 1 ? -1 : 0), 1, 7, "#9a2a34"); // three scars over his left eye
  d.recolor("#d82828", hx - 3, hy - 4, hw + 6, 26, (x, y) => (x * 2 + y) % 9 === 0 ? "#a01418" : (x + y * 3) % 13 === 0 ? "#ff6a5a" : null);
  for (let i = 0; i < 10; i += 2) d.f(hx + 3 + i, hy + 14, 1, 1, shade(d.sk, -0.3)).f(hx + 2 + i, hy + 15, 1, 1, shade(d.sk, -0.3)); // stubble
  d.f(cx - 3, hy + 10, 6, 1, shade(d.sk, -0.25));
  // Open white shirt: collar flaps over a bare chest.
  for (let i = 0; i < 9; i++) { const half = Math.max(1, 4 - Math.floor(i / 3)); d.r(tc - half, ty + 1 + i, half * 2, 1, d.sk).d(tc - half - 1, ty + 1 + i, "#c8ccd8"); }
  d.r(tc - 3, ty + 4, 2, 1, shade(d.sk, -0.22)).r(tc + 1, ty + 4, 2, 1, shade(d.sk, -0.22));
  d.asBody(() => d.r(tc - 6, ty - 1, 3, 3, SHIRT).r(tc + 3, ty - 1, 3, 3, SHIRT));
  d.belt("#4a3a2a", gold);
  // Black cape over both shoulders (and over the missing left arm), lined in red.
  d.asBody(() => d.r(d.lx - 2, ty, d.aw + 4, d.th - 2, "#1a1a22").r(d.lx - 1, ty + 1, d.aw + 2, 1, "#3a3a4a"));
  d.trim("#1a1a22", "#a01818", ty);
  // Gryphon: a sabre with a curled guard, blade wreathed in Divine Departure lightning.
  const x = Math.min(d.rx + d.aw + 1, d.W - 6), top = d.hy - 10;
  d.asBody(() => {
    d.u(x, top, 3, d.rhy - top - 2, ink).u(x + 1, top + 1, 1, d.rhy - top - 5, "#e8eef8").u(x + 1, top, 1, 1, "#ffffff");
    d.r(x - 3, d.rhy - 4, 9, 2, gold).r(x - 3, d.rhy - 2, 2, 3, gold).r(x, d.rhy - 2, 3, 4, "#5a2a2a");
  });
  for (let y = top + 2; y < d.rhy - 5; y += 3) d.u(x + 2, y, 1, 1, "#ff4d6d");
  d.bolt(x + 4, top, 1, 12).bolt(x - 3, top + 6, -1, 10).bolt(x + 5, top + 14, 1, 8);
  shatter(d, x + 1, top - 3, 3, "#ff4d6d", "#ffd0d8");
}

function blackbeard(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
  const hairC = "#1e1e28";
  d.wipeScar(["beard"]).eyes("glare", "#7a5cff", "#120a20").mouth("gapGrin");
  d.r(cx - 4, hy + 13, 8, 2, "#c83a4a").r(cx - 3, hy + 14, 6, 1, "#ff7a8a"); // wide-open laughing mouth
  // Scruffy curled beard along the jaw.
  d.f(hx, hy + 8, 3, 9, hairC).f(hx + hw - 3, hy + 8, 3, 9, hairC).f(hx + 2, hy + 15, hw - 4, 2, hairC);
  d.asBody(() => { d.r(cx - 5, hy + d.hh, 10, 3, hairC); for (const x of [cx - 5, cx - 1, cx + 3]) d.d(x + 1, hy + d.hh + 3, hairC); });
  d.recolor(hairC, hx - 6, hy + 2, hw + 12, 22, (x, y) => (x * 3 + y) % 5 === 0 ? "#3a3a4a" : null);
  // Tricorn with a green band and upturned points.
  d.recolor("#f7f8fb", hx - 4, hy - 10, hw + 8, 10, () => hairC);
  // The brim sits low on his brow, with curls poking out underneath: a short forehead.
  d.recolor(hairC, hx + 1, hy - 2, hw - 2, 2, () => "#3aa88a");
  d.r(hx - 4, hy, hw + 8, 3, hairC).r(hx - 4, hy, hw + 8, 1, "#3a3a4a");
  d.asBody(() => d.r(hx - 6, hy - 3, 3, 5, hairC).r(hx + hw + 3, hy - 3, 3, 5, hairC).d(hx - 6, hy - 4, hairC).d(hx + hw + 5, hy - 4, hairC));
  for (let x = hx; x < hx + hw; x++) d.f(x, hy + 3, 1, x % 3 === 0 ? 2 : 1, x % 3 === 1 ? "#3a3a4a" : hairC);
  // Red shirt hanging open over a hairy belly, beaded necklaces.
  for (let i = 0; i < th - 8; i++) { const half = Math.min(7, 3 + Math.floor(i / 2)); d.r(tc - half, ty + 1 + i, half * 2, 1, d.sk); }
  for (let y = ty + 6; y < ty + th - 8; y += 2) for (let x = tc - 5; x < tc + 5; x += 3) d.d(x + (y % 4 ? 1 : 0), y, shade(d.sk, -0.3));
  for (let i = -6; i <= 6; i += 2) d.r(tc + i, ty + 3 + Math.round((i * i) / 14), 2, 2, i % 4 === 0 ? "#7a5cff" : "#4a2ab0").d(tc + i, ty + 3 + Math.round((i * i) / 14), "#c8b8ff");
  for (let i = -4; i <= 4; i += 2) d.d(tc + i, ty + 1 + Math.round((i * i) / 12), "#3aa86a");
  d.recolor("#d83a40", 0, ty, d.W, th, (x, y) => (x + y) % 6 === 0 ? "#b02a30" : null);
  // Yellow sash with flintlocks tucked in, gold-trimmed captain's coat with epaulettes.
  const sy = ty + th - 7;
  for (const [x, c] of [[tc - 6, "#8a5a2a"], [tc + 2, "#6a6a78"], [tc + 5, "#6a6a78"]] as [number, string][]) d.asBody(() => d.r(x, sy - 4, 2, 6, c).r(x - 1, sy - 5, 3, 2, gold));
  d.asBody(() => d.r(tx + tw - 5, sy + 3, 3, 7, "#e8c040").d(tx + tw - 4, sy + 9, "#c89a20"));
  d.trim("#16141c", gold, ty);
  d.asBody(() => { d.epaulettes(gold); fringe(d, tx - 3, ty + 4, 6); fringe(d, tx + tw - 3, ty + 4, 6); });
  // Camo trousers, buckled boots.
  d.recolor("#5a8a5a", 0, d.legY, d.W, d.legH + 6, (x, y) => ((x * 7 + y * 3) % 11 < 2 || (x + y * 5) % 13 === 0) ? "#3a6a3a" : null);
  d.r(d.legX + 1, d.bottom - 2, 3, 1, gold).r(d.legX + d.gap + 3, d.bottom - 2, 3, 1, gold);
  // Darkness pooling at his feet, a black hole in one hand and a quake bubble in the other.
  d.orb(d.rx + d.aw + 4, d.rhy, 4, "#e8f4ff", "#7aa8d8").orb(d.lx - 5, d.lhy, 4, "#1a0a30", "#7a5cff");
  d.u(d.lx - 8, d.lhy - 4, 1, 1, "#b8a8ff").u(d.lx - 1, d.lhy - 5, 1, 1, "#b8a8ff");
}

function kaido(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw, th, sk } = d;
  const hairC = "#1e1a24";
  d.wipeScar(["goatee"]).eyes("glare", "#ffd84a", "#0e0a14").mouth("line");
  d.f(cx - 3, hy + 13, 1, 1, shade(sk, -0.5)).f(cx + 2, hy + 13, 1, 1, shade(sk, -0.5)); // scowl
  d.f(cx - 1, hy + 9, 2, 3, shade(sk, -0.2));
  // Fur cape spread wide behind him.
  d.asBody(() => {
    for (let y = ty - 4; y < d.bottom - 4; y++) {
      const spread = 9 + Math.min(5, (y - ty + 4) >> 2), jag = (y * 7) % 3;
      for (let x = tx - spread - jag; x < tx + tw + spread + jag; x++) d.u(x, y, 1, 1, (x * 3 + y * 2) % 13 === 0 ? "#6a6ac0" : (x + y * 3) % 11 === 0 ? "#2a2a5a" : "#3a3a7a");
    }
    for (let x = tx - 14; x < tx + tw + 14; x += 3) d.u(x, d.bottom - 4, 2, 2 + (x % 2), "#3a3a7a");
  });
  // Wild black locks flaring out around the head.
  const locks = new Map<string, string>();
  for (const [ang, len] of [[-160, 10], [-140, 12], [-115, 10], [-65, 10], [-40, 12], [-20, 10], [175, 9], [5, 9], [150, 8], [30, 8]] as [number, number][]) {
    const a = (ang * Math.PI) / 180, bx = cx + Math.cos(a) * (hw / 2 - 1), by = hy + 5 + Math.sin(a) * 6;
    stroke(locks, 24, (t) => [bx + Math.cos(a) * len * t, by + Math.sin(a) * len * t + 3 * t * t], (t) => 3 - 2 * t, (t, j) => j === 0 && t < 0.7 ? "#3a3442" : hairC);
  }
  blob(d, locks, (x, y) => y < hy + 1 && x >= hx - 1 && x <= hx + hw);
  // Huge curved horns from the temples.
  const horns = new Map<string, string>();
  for (const s of [-1, 1]) stroke(horns, 40, (t) => [cx + s * (hw / 2 - 3 + 8 * Math.sin(t * 1.4)), hy + 2 - 20 * t + 4 * t * t], (t) => 5 * (1 - t) + 1, (t, j, w) => j === w - 1 && t < 0.9 ? "#ffffff" : j === 0 ? "#b8b4a8" : "#f0ece0");
  blob(d, horns);
  // Long whisker strands hanging to his belly, and a short chin beard.
  d.asBody(() => {
    d.r(cx - 3, hy + d.hh, 6, 3, hairC).d(cx - 1, hy + d.hh + 3, hairC);
    d.line(cx - 3, hy + 11, cx - 7, hy + 14, hairC).line(cx - 7, hy + 14, cx - 6, ty + 10, hairC).line(cx - 6, ty + 10, cx - 8, ty + 18, hairC);
    d.line(cx + 2, hy + 11, cx + 6, hy + 14, hairC).line(cx + 6, hy + 14, cx + 7, ty + 9, hairC).line(cx + 7, ty + 9, cx + 5, ty + 16, hairC);
  });
  // Bare, scarred chest with abs.
  const ab = shade(sk, -0.24);
  d.r(tc - 6, ty + 5, 5, 1, ab).r(tc + 1, ty + 5, 5, 1, ab).r(tc, ty + 4, 1, th - 12, ab);
  for (let y = ty + 8; y < ty + th - 9; y += 3) d.r(tc - 4, y, 3, 1, ab).r(tc + 2, y, 3, 1, ab);
  d.line(tc - 8, ty + 8, tc - 3, ty + 13, "#a0503a").line(tc - 7, ty + 8, tc - 2, ty + 13, "#c86a4a");
  // Dragon-scale tattoo down his left arm with a skull at the elbow.
  d.recolor(sk, d.rx - 1, ty, d.aw + 2, d.rhy - ty - 1, (x, y) => ((x + (Math.floor(y / 2) % 2)) % 3 === 0 || y % 2 === 0) ? "#e8883a" : "#a83a3a");
  d.r(d.rx, d.rhy - 9, d.aw, 4, "#f2f2f2").d(d.rx + 1, d.rhy - 8, ink).d(d.rx + d.aw - 2, d.rhy - 8, ink).r(d.rx + 1, d.rhy - 6, d.aw - 2, 1, "#c8c8d0");
  // Spiked wristbands.
  for (const [x, y] of [[d.lx, d.lhy - 2], [d.rx, d.rhy - 2]] as Px[]) d.asBody(() => { d.r(x - 1, y, d.aw + 2, 2, "#2a2a30"); for (let i = 0; i < d.aw + 2; i += 2) d.d(x - 1 + i, y - 1, gold).d(x - 2, y + 1, gold).d(x + d.aw + 1, y + 1, gold); });
  // Shimenawa rope belt with zig-zag paper streamers, purple cloth, gold chains.
  const ry = ty + th - 8;
  d.r(tx - 1, ry, tw + 2, 3, "#f4f4f8").r(tx - 1, ry + 2, tw + 2, 1, "#c8c8d4");
  for (let x = tx; x < tx + tw; x += 3) d.d(x, ry + 1, "#b8b8c8");
  for (const x of [tc - 5, tc + 3]) d.asBody(() => { for (let i = 0; i < 4; i++) d.r(x + (i % 2 ? 1 : 0), ry + 3 + i * 2, 2, 2, i % 2 ? "#d8d8e4" : "#ffffff"); });
  d.recolor("#8a5aa8", 0, ry + 3, d.W, 8, (x) => x % 3 === 0 ? "#6a3a7a" : null);
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) d.u(tc + s * (5 + i) - (s < 0 ? 1 : 0), d.legY + 1 + Math.round(Math.sin((i / 5) * Math.PI) * 4), 1, 1, i % 2 ? gold : GOLD_D);
  d.folds("#4a5a4a", d.legY + 2, 4);
  // Kanabo: a studded iron club, crackling with purple lightning.
  const kx = Math.min(d.rx + d.aw + 1, d.W - 6), top = hy - 6;
  d.asBody(() => {
    d.r(kx - 2, top, 6, d.rhy - top + 2, ink).r(kx - 1, top + 1, 4, d.rhy - top - 2, "#4a4a5a").r(kx - 1, top + 1, 1, d.rhy - top - 2, "#6a6a7a");
    for (let y = top + 2; y < d.rhy - 6; y += 4) d.d(kx + 2, y, silver).d(kx - 1, y + 2, silver);
    d.r(kx - 2, top - 1, 6, 2, "#6a6a7a");
  });
  d.bolt(kx + 4, top - 2, 1, 14, "#d8a8ff", "#4a1a8a").bolt(d.lx - 4, ty - 6, -1, 12, "#d8a8ff", "#4a1a8a").bolt(tx + tw + 10, ty + 10, 1, 9, "#d8a8ff", "#4a1a8a");
}

function bigMom(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
  const HAT = "#b8285e", HAT_D = "#7a1a40", HAIR = "#f290c0", HAIR_D = "#c85a90", TOP = "#ec6a98", DOT = "#9a1838";
  const COAT = "#fbd6e8", COAT_D = "#e8b0cc", LINING = "#5a2266", LINING_D = "#3e1648", PANTS = "#dcdce4";
  d.eyes("glare", "#c03a8a", "#8a2a5a").mouth("smirk");
  d.f(cx - 2, hy + 12, 4, 1, "#e83a6a").f(cx - 1, hy + 13, 2, 1, "#c02a50"); // red lips
  for (const x of [d.L - 1, d.R + 3]) d.f(x, d.ey - 1, 1, 1, ink); // lashes
  // Long wavy pink hair falling past the shoulders.
  const hair = new Map<string, string>();
  for (const s2 of [-1, 1]) for (let y = hy + 1; y < ty + 12; y++) {
    const wave = Math.round(Math.sin((y - hy) / 3) * 1.2), x0 = s2 < 0 ? hx - 3 + wave : hx + hw - 1 + wave;
    for (let i = 0; i < 4; i++) hair.set(`${x0 + i},${y}`, (s2 < 0 ? i === 0 : i === 3) ? HAIR_D : (i + y) % 9 === 0 ? "#ffc0e0" : HAIR);
  }
  blob(d, hair, (x, y) => y < ty);
  d.recolor("#ff8ac8", hx - 4, hy - 4, hw + 8, 30, (x, y) => (x * 2 + y) % 11 === 0 ? HAIR_D : HAIR);
  // Pirate hat: a tall magenta tricorn with an upturned brim, gold edging and a small skull.
  d.clear(hx - 6, hy - 12, hw + 12, 10);
  d.asBody(() => {
    for (let y = hy - 10; y < hy - 2; y++) { const inset = y === hy - 10 ? 3 : y === hy - 9 ? 1 : 0; d.r(hx + inset, y, hw - inset * 2, 1, y < hy - 7 ? "#c83a6e" : HAT); }
    d.r(hx - 5, hy - 3, hw + 10, 3, HAT).r(hx - 5, hy - 3, hw + 10, 1, gold).r(hx - 5, hy - 1, hw + 10, 1, HAT_D);
    for (let k = 0; k < 4; k++) d.r(hx - 6 - (k >> 1), hy - 4 - k, 2, 1, HAT).r(hx + hw + 4 + (k >> 1), hy - 4 - k, 2, 1, HAT);
    d.d(hx - 8, hy - 8, gold).d(hx + hw + 7, hy - 8, gold);
  });
  const sx = cx - 2, sy = hy - 8;
  d.r(sx, sy, 4, 2, white).r(sx + 1, sy + 2, 2, 1, white).d(sx + 1, sy + 1, ink).d(sx + 2, sy + 1, ink);
  d.d(sx - 1, sy + 3, white).d(sx + 4, sy + 3, white).d(sx - 1, sy - 1, white).d(sx + 4, sy - 1, white);
  // Long pale-pink coat draped open, flaring to the ankles, its purple lining showing.
  d.asBody(() => {
    for (let y = ty; y < d.bottom - 1; y++) {
      const k = y - ty, spread = Math.floor(k / 3), w = 3 + spread, lin = Math.min(1 + Math.floor(k / 3), w - 3);
      for (const s2 of [-1, 1]) for (let i = 0; i < w; i++) {
        const x = s2 < 0 ? tx - 1 - i : tx + tw + i, inner = i < lin;
        const c = i === w - 1 ? COAT_D : inner ? (i === 0 ? LINING_D : LINING) : i === lin ? gold : COAT;
        d.u(x, y, 1, 1, c);
      }
    }
    for (let y = ty + 6; y < d.bottom - 4; y += 6) d.u(tx - 4 - Math.floor((y - ty) / 3), y, 1, 1, gold).u(tx + tw + 3 + Math.floor((y - ty) / 3), y, 1, 1, gold);
  });
  // Fitted polka-dot blouse with puffed sleeves, a thin gold belt and a ruffled peplum.
  d.recolor("#ff8ab8", 0, ty, d.W, th + 2, (x, y) => {
    const gx = ((x - tc) % 5 + 5) % 5, gy = ((y - ty) % 5 + 5) % 5, off = Math.floor((y - ty) / 5) % 2 ? 2 : 0;
    return ((gx + off) % 5 < 2 && gy < 2) ? DOT : TOP;
  });
  for (let i = 0; i < 5; i++) { const half = Math.max(0, 2 - Math.floor(i / 2)); d.r(tc - half, ty + 1 + i, half * 2, 1, d.sk); }
  const by = ty + th - 6;
  d.r(tx, by, tw, 2, "#e8a040").r(tx, by + 1, tw, 1, "#b87a28");
  d.asBody(() => { for (let x = tx - 1; x < tx + tw + 1; x++) d.r(x, by + 2, 1, 3 + ((x - tx) % 3 === 0 ? 1 : 0), (x - tx) % 3 === 0 ? "#c84a78" : TOP); });
  // Wide grey-white trousers that flare out at the hem, bare feet in sandals.
  d.recolor("#f2eef4", 0, d.legY, d.W, d.legH * 2 + 6, (x, y) => (x + y) % 9 === 0 ? "#c4c4d0" : PANTS);
  d.asBody(() => { for (const x of [d.legX, d.legX + d.gap]) for (let j = 0; j < 4; j++) d.r(x - 1 - (j >> 1), d.bottom - 6 + j, 1, 1, PANTS).r(x + 4 + (j >> 1) + 3, d.bottom - 6 + j, 1, 1, "#c4c4d0"); });
  // Gold epaulettes with fringe on her shoulders.
  d.asBody(() => { d.epaulettes(gold); fringe(d, tx - 2, ty + 3, 5); fringe(d, tx + tw - 3, ty + 3, 5); });
  // Zeus, the smiling thundercloud, over her raised hand; Prometheus, a little laughing sun, at her shoulder.
  const zx = d.rx + d.aw + 3, zy = hy + 2;
  for (const [ox, oy, r] of [[0, 0, 4], [5, -2, 4], [9, 1, 3], [4, 3, 3]] as [number, number, number][]) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) if (k * k + j * j <= r * r) d.u(zx + ox + k, zy + oy + j, 1, 1, j > r / 2 ? "#c8d4f0" : "#f6f9ff");
  d.r(zx + 3, zy - 1, 1, 2, ink).r(zx + 7, zy - 1, 1, 2, ink).r(zx + 4, zy + 2, 3, 1, ink).r(zx + 5, zy + 3, 1, 1, "#e85a8a").r(zx + 2, zy + 1, 1, 1, "#ffb0c8").r(zx + 8, zy + 1, 1, 1, "#ffb0c8");
  const px = d.lx - 6, py = ty - 2;
  for (let j = -4; j <= 4; j++) for (let k = -4; k <= 4; k++) { const r2 = k * k + j * j; if (r2 <= 18) d.u(px + k, py + j, 1, 1, r2 >= 13 ? "#e89a1a" : j < -1 && k < 0 ? "#fff07a" : "#ffd23a"); }
  d.r(px - 2, py - 1, 1, 2, ink).r(px + 1, py - 1, 1, 2, ink).r(px - 2, py + 2, 4, 1, ink).r(px - 1, py + 3, 2, 1, "#c8402a");
}

function zoro(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw, th, sk } = d;
  d.wipeScar().eyes("closedLeft", "#30ff8a", "#1a6a3a");
  d.recolor("#3ad870", hx - 2, hy - 5, hw + 4, 9, (x, y) => (x * 2 + y) % 9 === 0 ? "#1a9a4a" : (x + y * 3) % 13 === 0 ? "#8affb0" : null);
  d.r(hx - 2, hy + 9, 1, 2, gold).r(hx - 2, hy + 12, 1, 2, gold).r(hx - 2, hy + 15, 1, 2, gold); // three earrings
  // Wado Ichimonji clenched in his teeth: blade to one side, white hilt to the other.
  d.asBody(() => {
    d.r(hx - 9, hy + 12, cx - hx + 7, 2, "#e8eef8").r(hx - 9, hy + 12, cx - hx + 7, 1, "#ffffff").d(hx - 10, hy + 13, "#c8d0dc");
    d.r(cx - 2, hy + 11, 2, 4, gold).r(cx, hy + 12, hw / 2 + 7, 2, "#f4f4f8");
    for (let x = cx + 1; x < cx + hw / 2 + 7; x += 2) d.d(x, hy + 12, "#8a8a9a");
  });
  // Bare chest with the long diagonal scar, green haramaki, black bandana on his arm.
  const ab = shade(sk, -0.22);
  d.r(tc - 5, ty + 5, 4, 1, ab).r(tc + 1, ty + 5, 4, 1, ab).r(tc, ty + 4, 1, th - 11, ab);
  for (let y = ty + 8; y < ty + th - 9; y += 3) d.r(tc - 3, y, 2, 1, ab).r(tc + 1, y, 2, 1, ab);
  for (let i = 0; i < 12; i++) { const x = tx + tw - 3 - i, y = ty + 2 + i; d.d(x, y, "#a85a4a"); if (i % 2 === 0) d.d(x - 1, y - 1, "#d08a7a").d(x + 1, y + 1, "#d08a7a"); }
  d.recolor("#3a8a4a", 0, ty + th - 8, d.W, 6, (x, y) => (x + y) % 4 === 0 ? "#2a6a3a" : null);
  d.asBody(() => d.r(d.lx, d.lhy - 10, d.aw, 3, "#1a1a20").d(d.lx - 1, d.lhy - 8, "#1a1a20").d(d.lx - 2, d.lhy - 7, "#1a1a20"));
  d.folds("#1e3a28", d.legY, 3);
  // Enma and Sandai Kitetsu drawn wide, blades sweeping up and out.
  for (const [hxp, hyp, s, grip] of [[d.lx, d.lhy, -1, "#7a3aa8"], [d.rx + d.aw - 1, d.rhy, 1, "#a82a3a"]] as [number, number, number, string][]) {
    const ex = hxp + s * 14, ey = hyp - 26;
    d.asBody(() => {
      for (let o = 0; o < 2; o++) d.line(hxp + s * 2, hyp - 1 + o, ex, ey + o, o ? "#a8b4c8" : "#f0f6ff");
      d.r(hxp - 2, hyp - 1, 5, 2, gold).r(hxp - 1, hyp + 3, 2, 5, grip).d(hxp - 1, hyp + 8, gold);
    });
    d.flame(ex, ey + 4, 8, ["#c8ffd8", "#30ff8a", "#108a4a"]);
  }
  // Nine Sword Style: green haki flames and red lightning flickering behind him.
  d.flame(tx - 6, ty + 6, 10, ["#c8ffd8", "#30ff8a", "#108a4a"]).flame(tx + tw + 5, ty + 6, 10, ["#c8ffd8", "#30ff8a", "#108a4a"]);
  d.bolt(tx - 9, ty - 6, -1, 8, "#ff3050", "#6a0a1a").bolt(tx + tw + 8, ty - 6, 1, 8, "#ff3050", "#6a0a1a");
}

function whitebeard(d: Detail) {
  const { cx, hy, hx, hw, tc, ty, tx, tw, th, sk } = d;
  d.wipeScar(["crescent"]).eyes("glare", "#ffcf4a", shade(d.sk, -0.4)).mouth("none");
  // The great crescent moustache.
  d.clear(hx - 3, hy + 4, 3, 8).clear(hx + hw, hy + 4, 3, 8);
  const stache = new Map<string, string>();
  for (const s of [-1, 1]) stroke(stache, 36, (t) => [cx - (s < 0 ? 1 : 0) + s * (1 + 13 * t), hy + 13 - 9 * t ** 3], (t) => 2.2 * (1 - t) + 0.9, (t, j) => j === 0 ? "#d8e0ea" : "#ffffff");
  blob(d, stache);
  // Black bandana with trailing knot tails.
  d.r(hx + 1, hy - 3, hw - 2, 4, "#1a1a24").r(hx + 1, hy - 3, hw - 2, 1, "#3a3a4a");
  d.asBody(() => d.r(hx + hw - 1, hy - 1, 3, 3, "#1a1a24").line(hx + hw + 1, hy + 1, hx + hw + 4, hy + 7, "#1a1a24").line(hx + hw + 2, hy + 1, hx + hw + 5, hy + 6, "#1a1a24"));
  // Scarred bare chest, blue sash, white captain's coat with a standing collar.
  const ab = shade(sk, -0.22);
  d.r(tc - 6, ty + 5, 5, 1, ab).r(tc + 1, ty + 5, 5, 1, ab).r(tc, ty + 4, 1, th - 11, ab);
  for (let y = ty + 8; y < ty + th - 9; y += 3) d.r(tc - 4, y, 3, 1, ab).r(tc + 2, y, 3, 1, ab);
  for (const [x0, y0, x1, y1] of [[tc - 7, ty + 3, tc - 2, ty + 9], [tc + 5, ty + 4, tc + 1, ty + 11], [tc - 5, ty + 12, tc + 3, ty + 15]]) d.line(x0, y0, x1, y1, "#b06a5a");
  d.trim("#f4f4f8", "#9aa8c8", ty).folds("#f4f4f8", d.legY);
  d.asBody(() => d.r(tx - 3, ty - 4, 4, 5, "#f4f4f8").r(tx + tw - 1, ty - 4, 4, 5, "#f4f4f8").r(tx - 3, ty - 4, 1, 5, "#c8d0e0").r(tx + tw + 2, ty - 4, 1, 5, "#c8d0e0"));
  d.recolor("#3a5aa8", 0, ty + th - 8, d.W, 6, (x) => x % 4 === 0 ? "#2a4088" : null);
  // Murakumogiri: a towering bisento with a broad curved blade and a red tassel.
  const x = Math.min(d.rx + d.aw, d.W - 8), top = hy - 18;
  d.asBody(() => {
    d.r(x, top + 10, 3, d.bottom - top - 10, ink).r(x + 1, top + 11, 1, d.bottom - top - 12, "#8a6a4a");
    const blade = new Map<string, string>();
    stroke(blade, 30, (t) => [x + 1 - 7 * Math.sin(t * 1.7), top + 12 - 14 * t], (t) => 6 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 1, (t, j, w) => j === w - 1 ? "#ffffff" : j === 0 ? "#8a98b0" : "#d8e2f0");
    blob(d, blade);
    d.r(x - 1, top + 10, 5, 3, gold).r(x - 1, top + 13, 5, 1, GOLD_D).r(x + 3, top + 13, 2, 6, "#c82a3a").d(x + 4, top + 19, "#ff6a6a");
  });
  // Tremors: cracks in the air around his fist and across the ground.
  shatter(d, d.lx - 7, d.lhy - 2, 5, "#c8f0ff", "#ffffff");
  shatter(d, d.lx - 4, d.lhy - 12, 3, "#c8f0ff", "#ffffff");
  for (let i = 0; i < 6; i++) d.u(d.legX - 8 + i * 6, d.bottom - (i % 2), 4, 1, "#c8f0ff");
}

function dragon(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw } = d;
  d.wipeScar().eyes("glare", "#5cff9d", "#0e1018").mouth("line");
  // Red tribal tattoo down the left side of his face: stacked diamond outlines beside the eye.
  for (const [ox, oy] of [[hx + hw - 4, hy + 2], [hx + hw - 3, hy + 7], [hx + hw - 4, hy + 11]] as Px[])
    for (const [dx, dy] of [[1, 0], [0, 1], [2, 1], [1, 2], [0, 2], [2, 2], [1, 3]]) d.f(ox + dx, oy + dy, 1, 1, dy === 2 && dx !== 1 ? "#a02020" : "#e03a3a");
  for (let i = 0; i < 10; i += 2) d.f(hx + 3 + i, hy + 14, 1, 1, shade(d.sk, -0.32)); // stubble
  // Long wild hair flaring back in spikes.
  const hair = new Map<string, string>();
  for (const [ang, len] of [[-170, 9], [-150, 11], [-125, 9], [-100, 7], [-75, 8], [-50, 11], [-25, 10], [-5, 9], [160, 10], [20, 9], [140, 8], [45, 8]] as [number, number][]) {
    const a = (ang * Math.PI) / 180, bx = cx + Math.cos(a) * (hw / 2 - 1), by = hy + 6 + Math.sin(a) * 6;
    stroke(hair, 20, (t) => [bx + Math.cos(a) * len * t, by + Math.sin(a) * len * t + 2 * t], (t) => 4 - 3 * t, (t, j) => j === 0 && t < 0.6 ? "#3a3a4a" : "#1a1a24");
  }
  blob(d, hair, (x, y) => y < hy + 1 && x >= hx - 1 && x <= hx + hw);
  // Hooded green cloak hanging open from the shoulders, orange lining at the collar.
  d.asBody(() => {
    for (let y = ty; y < d.bottom - 2; y++) {
      const k = y - ty, spread = 3 + Math.floor(k / 6), open = Math.min(6, 1 + Math.floor(k / 3));
      const x0 = tx - spread, x1 = tx + tw + spread;
      for (let x = x0; x < x1; x++) {
        if (Math.abs(x - tc + 0.5) < open && k > 2) continue; // the cloak falls open down the front
        const edge = x === x0 || x === x1 - 1, inner = Math.abs(x - tc + 0.5) < open + 1 && k > 2;
        d.r(x, y, 1, 1, edge ? "#143018" : inner ? "#e0802a" : (x - x0) % 5 === 2 ? "#1e4a22" : (x - x0) % 5 === 0 ? "#3a7a36" : "#2a5a2a");
      }
    }
    d.r(tc - 7, ty - 2, 14, 3, "#2a5a2a").r(tc - 5, ty - 1, 10, 2, "#e0802a").r(tc - 3, ty, 6, 1, "#b85a1a");
  });
  // Winds of the revolution.
  for (let i = 0; i < 4; i++) d.line(tx - 14 + i, ty + 4 + i * 6, tx - 7 + i, ty + 2 + i * 6, "#a8ffd0", true).line(tx + tw + 7 - i, ty + 8 + i * 6, tx + tw + 13 - i, ty + 6 + i * 6, "#a8ffd0", true);
}

function mihawk(d: Detail) {
  const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
  d.eyes("hawk", "#ffd24a", "#101018").mouth("none");
  d.f(cx - 3, hy + 11, 2, 1, "#1e1e28").f(cx + 1, hy + 11, 2, 1, "#1e1e28").f(cx - 2, hy + 13, 4, 1, shade(d.sk, -0.45)); // thin moustache, stern mouth
  // Yoru slung diagonally across his back: blade behind, cross-guard and grip over his left shoulder.
  const gx = tx + tw + 3, gy = ty - 6;
  d.asBody(() => {
    for (let o = 0; o < 3; o++) for (let k = 0; k < 30; k++) d.u(gx - k - (o === 2 ? 1 : 0), gy + k + (o === 1 ? 1 : 0), 1, 1, o === 0 ? "#2a2a34" : o === 1 ? "#0e0e18" : "#4a4a5a");
    for (let k = -5; k <= 5; k++) d.u(gx + k, gy + k, 2, 2, Math.abs(k) === 5 ? GOLD_L : gold); // the cross-guard
    d.u(gx - 6, gy - 7, 3, 3, gold).u(gx + 5, gy + 4, 3, 3, gold).u(gx - 5, gy - 6, 1, 1, "#4a8aff").u(gx + 6, gy + 5, 1, 1, "#43c66b");
    for (let k = 1; k < 7; k++) d.u(gx + k, gy - k, 2, 2, k % 2 ? "#3a4a8a" : "#d8e0f0"); // wrapped grip
    d.u(gx + 7, gy - 8, 3, 3, gold);
  });
  // Wide black hat with a crimson underside and a white-and-green plume.
  d.recolor("#f4f4f4", hx - 4, hy - 14, hw + 10, 12, () => "#1a1a24");
  d.r(hx - 6, hy - 1, hw + 12, 2, "#1a1a24").r(hx - 6, hy + 1, hw + 12, 1, "#7a1a2a");
  const plume = new Map<string, string>();
  for (const [ox, oy, r] of [[hw / 2 - 1, -7, 3], [hw / 2 + 2, -9, 3], [hw / 2 + 4, -6, 2]] as [number, number, number][])
    for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) if (k * k + j * j <= r * r) plume.set(`${cx + ox + k},${hy + oy + j}`, ox + k > hw / 2 + 1 ? (j < 0 ? "#7ae8a0" : "#43c66b") : j < 0 ? "#ffffff" : "#e0e4ec");
  blob(d, plume);
  // High pointed crimson collar, black vest open on the chest, floral crimson sleeves.
  d.asBody(() => { for (const s of [-1, 1]) for (let j = 0; j < 7; j++) { const x = s < 0 ? hx - 1 - Math.floor(j / 2) : hx + hw - 2 + Math.floor(j / 2); d.u(x, ty - j, 3, 1, j > 4 ? "#a02a3a" : "#7a1a2a"); } });
  for (let i = 0; i < 10; i++) { const half = Math.max(1, 4 - Math.floor(i / 3)); d.r(tc - half, ty + 1 + i, half * 2, 1, d.sk); }
  d.r(tc - 3, ty + 4, 2, 1, shade(d.sk, -0.22)).r(tc + 1, ty + 4, 2, 1, shade(d.sk, -0.22));
  d.recolor("#7a1a2a", 0, ty, d.W, th, (x, y) => (x + y * 2) % 5 === 0 ? "#a83a4a" : null);
  d.belt("#3a2a1a", gold);
  d.trim("#6a1424", "#a02a3a", ty).folds("#6a1424", d.legY);
  // Lavender trousers and boots strapped in brown.
  d.folds("#c8b8e0", d.legY + 2, 3);
  for (const x of [d.legX, d.legX + d.gap]) d.r(x + 1, d.bottom - 7, 6, 1, "#8a6a3a").r(x + 1, d.bottom - 4, 6, 1, "#8a6a3a");
}

function rocks(d: Detail) {
  const { cx, hy, hx, hw, hh, sk, tx, tw, ty, tc } = d;
  // --- Hair: tall flame-like tongues sweeping up and out, each with a highlight edge and a black streak.
  d.clear(hx - 4, hy - 6, hw + 8, 6);
  const tongues: [number, number, number, number, number][] = [ // base x, base y, width, height, lean
    [hx - 2, hy + 10, 7, 9, -8], [hx + 1, hy + 4, 8, 12, -7], [cx - 6, hy + 2, 8, 16, -4], [cx - 1, hy + 1, 8, 19, 0],
    [cx + 5, hy + 2, 8, 16, 4], [hx + hw - 2, hy + 4, 8, 12, 7], [hx + hw + 1, hy + 10, 7, 9, 8],
  ];
  const hair = new Map<string, string>();
  tongues.forEach(([bx, by, w0, ht, lean], n) => {
    for (let k = 0; k <= ht; k++) {
      const t = k / ht, w = Math.max(1, Math.round(w0 * (1 - t))), x0 = bx + Math.round(lean * t * t) - (w >> 1);
      for (let i = 0; i < w; i++) {
        const streak = n % 2 === 1 && (i === (w >> 1) || (w > 5 && i === (w >> 1) + 1)) && k > 2 && t < 0.8;
        hair.set(`${x0 + i},${by - k}`, streak ? ROCKS_STREAK : i === 0 ? ROCKS_BLUE_L : i === w - 1 && w > 2 ? ROCKS_BLUE_D : ROCKS_BLUE);
      }
    }
  });
  // A solid mass over the scalp, so the tongues grow out of one head of hair.
  for (let y = hy - 2; y < hy + 3; y++) for (let x = hx - 1; x < hx + hw + 1; x++) if (!hair.has(`${x},${y}`)) hair.set(`${x},${y}`, y === hy - 2 ? ROCKS_BLUE_L : ROCKS_BLUE);
  const fringe = (x: number) => hy + 3 + ((x - hx) % 4 === 1 ? 1 : 0);
  const inHead = (x: number) => x >= hx && x < hx + hw;
  d.asBody(() => {
    for (const [key, c] of hair) {
      const [x, y] = key.split(",").map(Number);
      if (inHead(x) && y >= fringe(x) && y < d.ty) continue; // keep the face clear
      if (inHead(x) || y < hy) d.r(x, y, 1, 1, c); else d.u(x, y, 1, 1, c);
    }
    for (const key of hair.keys()) {
      const [x, y] = key.split(",").map(Number);
      if (inHead(x) && y >= fringe(x)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!hair.has(`${x + dx},${y + dy}`)) d.u(x + dx, y + dy, 1, 1, ink);
    }
  });
  // --- Face in the shared style: a furious glare, a toothy grin and the cracked red scar over his left eye.
  d.wipeScar(["scar"]).eyes("glare", "#ff4d6d", ROCKS_STREAK).mouth("fangs");
  const scar = "#c0282c";
  d.line(d.R + 4, hy + 2, d.R + 2, d.ey - 3, scar).line(d.R + 2, d.ey - 3, d.R + 3, d.ey, scar).line(d.R + 3, d.ey, d.R + 1, d.ey + 4, scar);
  // --- Bare, scarred chest under a black fur coat with a shaggy collar over the shoulders.
  d.r(tc - 5, ty + 5, 4, 1, shade(sk, -0.25)).r(tc + 1, ty + 5, 4, 1, shade(sk, -0.25)).r(tc, ty + 3, 1, 6, shade(sk, -0.18));
  d.line(tc - 6, ty + 9, tc - 2, ty + 13, "#9a5a40").line(tc + 5, ty + 8, tc + 2, ty + 12, "#9a5a40");
  d.belt("#2a1418", gold);
  d.asBody(() => {
    // Shaggy fur mounds piled on each shoulder, rising behind the jaw.
    for (const side of [-1, 1]) {
      const ox = side < 0 ? tx : tx + tw, rx = 9, ry = 7;
      for (let j = -ry; j <= 5; j++) for (let i = -rx; i <= rx; i++) {
        const x = ox + i, y = ty + 1 + j;
        if ((side < 0 ? x > tc - 5 : x < tc + 5)) continue;
        const inside = j <= 0 ? (i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1 : j < 3 + ((x >> 1) % 2) * 2;
        if (!inside) continue;
        const c = (x * 2 + y * 3) % 7 === 0 ? FUR_L : (x + y * 2) % 9 === 0 ? "#4e4458" : FUR;
        if (y < ty) d.u(x, y, 1, 1, c); else d.r(x, y, 1, 1, c);
      }
    }
    for (let y = ty + 6; y < d.legY + 4; y += 3) d.d(tx - 1, y, FUR_L).d(tx + tw, y + 1, FUR_L); // fur trim down the coat
  });
  // --- Black chin beard in jagged points, and long braided whiskers trailing down past it.
  d.asBody(() => {
    d.r(cx - 6, hy + hh + 1, 12, 2, ROCKS_STREAK);
    for (const x of [cx - 6, cx - 2, cx + 2]) d.r(x, hy + hh + 3, 3, 1, ROCKS_STREAK).d(x + 1, hy + hh + 4, ROCKS_STREAK);
    d.line(cx - 5, hy + 11, cx - 8, hy + 13, ROCKS_STREAK).line(cx - 8, hy + 13, cx - 10, hy + 22, ROCKS_STREAK).line(cx - 10, hy + 22, cx - 7, hy + 27, ROCKS_STREAK).d(cx - 6, hy + 26, ROCKS_STREAK);
    d.line(cx + 4, hy + 11, cx + 7, hy + 13, ROCKS_STREAK).line(cx + 7, hy + 13, cx + 8, hy + 18, ROCKS_STREAK);
    d.r(hx - 2, hy + 11, 2, 3, gold).d(hx - 2, hy + 12, GOLD_D).r(hx + hw, hy + 11, 2, 3, gold).d(hx + hw + 1, hy + 12, GOLD_D); // gold earrings
  });
}

function joyBoy(d: Detail) {
  const { cx, hy, hx, hw, rx, ty, lx, bottom, tc, legY } = d;
  d.eyes("none").f(cx - 1, hy + 10, 2, 2, SIL);
  for (const x of [d.L, d.R]) d.f(x, d.ey + 1, 1, 1, white).f(x + 1, d.ey, 1, 1, white).f(x + 2, d.ey + 1, 1, 1, white); // laughing ^ ^
  d.mouth("laugh");
  // Swap the hanging right arm for one raised high with a sword, like the old drawing.
  d.clear(rx + 2, ty + 2, 4, d.rhy - ty + 2);
  d.asBody(() => {
    // Mid-stride: a short ragged loincloth, back leg pushing off, front leg driving forward.
    d.clear(0, legY, d.W, d.bottom - legY + 1);
    for (let j = 0; j < 6; j++) d.r(tc - 6 - (j >> 1), legY + j, 12 + (j >> 1) * 2, 1, SIL);
    for (let i = 0; i < 3; i++) d.r(tc - 8 + i * 6, legY + 6, 3, 2, SIL);
    for (let o = 0; o < 3; o++) {
      d.line(tc + 1 + o, legY + 6, tc + 7 + o, legY + 13, SIL).line(tc + 6 + o, legY + 13, tc + 5 + o, d.bottom - 1, SIL); // front leg
      d.line(tc - 4 + o, legY + 6, tc - 10 + o, d.bottom - 3, SIL); // back leg
    }
    d.r(tc + 5, d.bottom - 1, 7, 2, SIL).r(tc - 13, d.bottom - 3, 5, 2, SIL);
    for (let o = 0; o < 3; o++) d.line(rx + o, ty + 3, rx + 5 + o, hy - 3, SIL);
    d.r(rx + 4, hy - 7, 5, 5, SIL);
    d.r(rx + 2, hy - 9, 9, 2, SIL); // crossguard
    for (let o = 0; o < 2; o++) d.line(rx + 6 + o, hy - 10, rx + 9 + o, hy - 26, SIL); // blade raised to the sky
    d.d(rx + 10, hy - 27, SIL);
    // A spear held across the body, spearhead low.
    for (let o = 0; o < 2; o++) d.line(lx - 9, bottom - 4 + o, rx + 12, ty - 2 + o, SIL, true);
    d.u(rx + 11, ty - 4, 3, 3, SIL).u(lx - 12, bottom - 5, 3, 3, SIL).u(lx - 13, bottom - 4, 1, 1, SIL).u(lx - 11, bottom - 7, 1, 1, SIL);
    // Wild curls streaming back from the hair.
    for (const [x0, y0, x1, y1] of [[hx + hw, hy - 2, hx + hw + 6, hy - 6], [hx + hw + 1, hy + 2, hx + hw + 7, hy], [hx + hw, hy + 6, hx + hw + 5, hy + 5], [hx - 1, hy - 4, hx - 5, hy - 8]])
      for (let o = 0; o < 2; o++) d.line(x0, y0 + o, x1, y1 + o, SIL);
    d.r(hx + hw + 6, hy - 8, 2, 2, SIL).r(hx + hw + 7, hy - 2, 2, 2, SIL);
    // Flame-like hair: tongues licking up and back from the crown.
    for (const [x, h, lean] of [[hx - 3, 7, -4], [hx + 1, 10, -3], [hx + 5, 12, -2], [hx + 9, 10, 0], [hx + 13, 8, 2], [hx + hw - 1, 6, 4]] as [number, number, number][])
      for (let k = 0; k <= h; k++) { const w = Math.max(1, Math.round(4 * (1 - k / h))); d.r(x + Math.round(lean * k / h), hy - 1 - k, w, 1, SIL); }
  });
  // Fill pinholes left inside the silhouette (anything not reachable from the border).
  const W = d.p.width, H = d.p.height, outside = new Set<number>(), stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const n = stack.pop()!, x = n % W, y = (n / W) | 0;
    if (outside.has(n) || d.at(x, y)) continue;
    outside.add(n);
    if (x > 0) stack.push(n - 1); if (x < W - 1) stack.push(n + 1); if (y > 0) stack.push(n - W); if (y < H - 1) stack.push(n + W);
  }
  d.asBody(() => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!d.at(x, y) && !outside.has(y * W + x)) d.r(x, y, 1, 1, SIL); });
  // Pure silhouette: everything except the laughing face goes black.
  const keep = new Set([white, "#4a0c18", "#c8344a"]);
  for (let y = 0; y < d.p.height; y++) for (let x = 0; x < d.p.width; x++) { const c = d.at(x, y); if (c && !keep.has(c) && !c.endsWith("99")) d.r(x, y, 1, 1, SIL); }
}



const PAINTERS: Partial<Record<ChestCharacterId, Painter>> = {
  "prime-garp": garp,
  "prime-rayleigh": rayleigh,
  "rocks-d-xebec": rocks,
  imu: (d) => {
    d.eyes("ring").mouth("none");
    d.folds("#0f0818", d.ty + 6, 3).trim("#0f0818", "#6a3aa8", d.ty);
    // Rings of the void spiral over the robe.
    for (let i = 0; i < 5; i++) d.d(d.tc - 3 + i, d.ty + 6 + (i % 2), "#c06bff").d(d.tc - 2 + i, d.ty + 12 - (i % 2), "#8a4ad0");
    for (let i = 0; i < 6; i++) d.u(d.legX - 6 + i * 6, d.bottom - (i % 2) * 3, 2, 3, i % 2 ? "#3a1a5a" : "#5a2a8a"); // shadow tendrils
    d.r(d.cx - 1, d.hy - 4, 2, 2, HAKI_RED); // crown jewel
  },
  "joy-boy": joyBoy,
  "saint-saturn": saturn,
  "saint-mars": mars,
  "saint-warcury": warcury,
  "saint-nusjuro": nusjuro,
  "saint-ju-peter": juPeter,
  "saint-garling": garling,
  "shanks-divine": shanks,
  "blackbeard-full": blackbeard,
  "kaido-hybrid": kaido,
  "big-mom-full": bigMom,
  "luffy-gear-5-bajrang": gear5,
  "zoro-conqueror": zoro,
  "roger-prime": (d) => {
    d.eyes("stern", "#ffcc33").mouth("grin");
    // Big hooked moustache.
    d.r(d.cx - 7, d.hy + 10, 14, 2, "#1a1d2a").d(d.cx - 8, d.hy + 9, "#1a1d2a").d(d.cx + 7, d.hy + 9, "#1a1d2a").d(d.cx - 9, d.hy + 8, "#1a1d2a").d(d.cx + 8, d.hy + 8, "#1a1d2a");
    d.trim("#c8282c", gold, d.ty).folds("#c8282c", d.legY);
    d.asBody(() => d.epaulettes(gold).r(d.hx - 2, d.hy - 3, d.hw + 4, 1, gold)); // epaulettes + hat braid
    d.suit(SHIRT, undefined, "#d8dce6").buttons(gold, 2, d.ty + 11).belt("#3a2a1a", gold);
    d.bolt(d.rx + d.aw + 3, d.rhy - 16, 1, 9);
  },
  "whitebeard-quake": whitebeard,
  "dragon-full": dragon,
  "mihawk-strongest": mihawk,
};

/**
 * A layered glow that hugs the character's own silhouette (floating effects
 * don't distort it, and enclosed gaps stay clear):
 * a bright core ring, a saturated ring, a soft haze, flickering flame licks rising off
 * the shoulders and head. `frame` animates the flames.
 */
function shapeAura(p: Pixels, body: boolean[][], accent: string, frame: number, pad = 5) {
  const w = p.width + pad * 2, h = p.height + pad * 2;
  p.cells = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => p.cells[y - pad]?.[x - pad] ?? "."));
  p.width = w; p.height = h;
  const isBody = (x: number, y: number) => !!body[y - pad]?.[x - pad];
  // Empty cells reachable from the border are "outside"; enclosed holes stay clear.
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
  // Ring distance: ring 1 touches the body edge-on; each later ring surrounds the previous one.
  const N4: Px[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const N8: Px[] = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ring = Array.from({ length: h }, () => Array<number>(w).fill(0));
  let edge: Px[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (outside[y][x] && N4.some(([dx, dy]) => isBody(x + dx, y + dy))) { ring[y][x] = 1; edge.push([x, y]); }
  for (let r = 2; r <= 4; r++) {
    const next: Px[] = [];
    for (const [x, y] of edge) for (const [dx, dy] of N8) {
      const nx = x + dx, ny = y + dy;
      if (outside[ny]?.[nx] && !ring[ny][nx] && !isBody(nx, ny)) { ring[ny][nx] = r; next.push([nx, ny]); }
    }
    edge = next;
  }
  const hash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663) ^ ((frame + 1) * 83492791)) >>> 0);
  const core = p.key(shade(accent, 0.5)), mid = p.key(`${shade(accent, 0.1)}c8`), haze = p.key(`${accent}66`), mist = p.key(`${accent}30`);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = ring[y][x];
    if (r === 1) p.cells[y][x] = core;
    else if (r === 2) p.cells[y][x] = mid;
    else if (r === 3 && (x + y + frame) % 2 === 0) p.cells[y][x] = haze;
    else if (r === 3 || (r === 4 && (x * 3 + y + frame) % 4 === 0)) p.cells[y][x] = mist;
  }
  // Flame licks: on upward-facing edges, thin tongues climb out of the glow and flicker per frame.
  const tip = p.key(shade(accent, 0.7)), lick = p.key(shade(accent, 0.45)), lickSoft = p.key(`${shade(accent, 0.3)}b0`);
  for (let x = 1; x < w - 1; x++) for (let y = 1; y < h; y++) {
    if (ring[y][x] !== 1 || !isBody(x, y + 1) || isBody(x, y - 1)) continue;
    const k = hash(x, 7) % 11;
    if (k > 2 || ring[y][x - 1] === 9 || ring[y][x - 2] === 9) continue;
    ring[y][x] = 9; // keep licks apart
    const len = 3 + k * 2 + ((x + frame) % 2);
    for (let i = 1; i <= len; i++) {
      const yy = y - i, xx = x + (i > len / 2 ? ((hash(x, 3) & 1) ? 1 : -1) * ((frame + i) % 3 === 0 ? 1 : 0) : 0);
      if (yy < 0 || isBody(xx, yy) || !outside[yy]?.[xx]) break;
      p.cells[yy][xx] = i === len ? tip : i > len - 3 ? lickSoft : lick;
    }
  }
  return pad;
}

function buildHd(id: ChestCharacterId, pose: Pose, frame: number): RunnerSprite {
  const { f, look, accent } = buildFigure(id, pose, true);
  // The aura follows the body alone: same figure without floating effects, doubled.
  const body = upscale(buildFigure(id, pose, true, true).f.p).cells.map((row) => row.map((k) => k !== "."));
  // Remember which low-res cells are face, so features stay on skin.
  const faceColors = new Set([f.sk, shade(f.sk, -0.2), shade(f.sk, -0.25)]);
  const mask = f.p.cells.map((row, y) => row.map((k, x) => k !== "." && (faceColors.has(f.p.palette[k]) ||
    (f.p.palette[k] === ink && x > f.hx && x < f.hx + f.hw - 1 && y > f.hy && y < f.hy + f.hh))));
  const m = MARGIN[id] ?? 0;
  const p = upscale(f.p);
  if (m) {
    p.cells = p.cells.map((row) => [...Array<string>(m).fill("."), ...row, ...Array<string>(m).fill(".")]);
    p.width += m * 2;
    for (let y = 0; y < body.length; y++) body[y] = [...Array<boolean>(m).fill(false), ...body[y], ...Array<boolean>(m).fill(false)];
  }
  if (!FLAT.has(id)) autoShade(p);
  selOut(p);
  const d = new Detail(p, f, look, accent, pose, mask, body, m);
  const paint = PAINTERS[id];
  if (paint) paint(d); else d.eyes().mouth();
  const top = trimTop(p);
  body.splice(0, top);
  const pad = shapeAura(p, body, accent, frame);
  const sprite = p.finish(Math.max(0, d.hx - 6 + pad + 1), Math.max(0, d.hy - 6 - top + pad + 1));
  return { ...sprite, scale: S };
}

const cache = new Map<ChestCharacterId, RunnerSprite[]>();
/** High-detail mythic sprite (2 pixels per world pixel). frame 0 = idle, 1/2 = strides. */
export function mythicHdSprite(id: ChestCharacterId, frame: 0 | 1 | 2): RunnerSprite {
  let frames = cache.get(id);
  if (!frames) {
    frames = [buildHd(id, -1, 0), buildHd(id, 0, 1), buildHd(id, 1, 2)];
    cache.set(id, frames);
  }
  return frames[frame];
}
