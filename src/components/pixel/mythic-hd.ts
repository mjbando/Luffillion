import type { ChestCharacterId } from "@/data/chest-characters";
import type { Look } from "./chest-looks";
import { buildFigure, trimTop, HEAD, MYTHIC_SHIMMER, type Frame } from "./generated";
import { Pixels, ink, white, gold, shade, type Pose, type RunnerSprite } from "./kit";

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
type MouthStyle = "line" | "smirk" | "grin" | "gapGrin" | "fangs" | "none";

class Detail {
  readonly hx: number; readonly hy: number; readonly hw: number; readonly hh: number; readonly cx: number;
  readonly tx: number; readonly ty: number; readonly tw: number; readonly th: number; readonly tc: number;
  readonly lx: number; readonly rx: number; readonly lhy: number; readonly rhy: number; readonly aw: number;
  readonly legX: number; readonly legY: number; readonly legH: number; readonly gap: number; readonly bottom: number; readonly W: number;
  readonly sk: string; readonly move: number; readonly L: number; readonly R: number; readonly ey: number;
  constructor(readonly p: Pixels, f: Frame, readonly look: Look, readonly accent: string, pose: Pose, private faceMask: boolean[][]) {
    this.hx = f.hx * S; this.hy = f.hy * S; this.hw = f.hw * S; this.hh = f.hh * S; this.cx = f.cx * S;
    this.tx = f.tx * S; this.ty = f.ty * S; this.tw = f.tw * S; this.th = f.th * S; this.tc = this.tx + this.tw / 2;
    this.lx = f.lx * S; this.rx = f.rx * S; this.lhy = f.lhy * S; this.rhy = f.rhy * S; this.aw = f.g.aw * S;
    this.legX = f.g.legX * S; this.legY = (f.g.legY + HEAD) * S; this.legH = f.g.legH * S; this.gap = f.g.gap * S;
    this.bottom = (f.bottom + 1) * S - 1; this.W = f.g.W * S; this.sk = f.sk;
    this.move = (pose === -1 ? 0 : pose === 0 ? -1 : 1) * S;
    this.L = this.hx + 3; this.R = this.hx + this.hw - 6; this.ey = this.hy + 8;
  }
  at(x: number, y: number) { return colorAt(this.p, x, y); }
  r(x: number, y: number, w: number, h: number, c: string) { this.p.r(x, y, w, h, c); return this; }
  u(x: number, y: number, w: number, h: number, c: string) { this.p.under(x, y, w, h, c); return this; }
  d(x: number, y: number, c: string) { return this.r(x, y, 1, 1, c); }
  clear(x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.p.cells[j]?.[i] !== undefined) this.p.cells[j][i] = ".";
    return this;
  }
  /** Repaints the low-res scar/tattoo cell column with skin before drawing a sharper one. */
  wipeScar() {
    const spec = this.look.x?.find((x) => x.startsWith("scar:") || x.startsWith("tattoo:"));
    if (spec) this.recolor(spec.split(":")[1], this.hx, this.hy, this.hw, this.hh, (x, y) => {
      const row = this.faceMask[Math.floor(y / S)];
      if (row) row[Math.floor(x / S)] = true;
      return this.sk;
    });
    return this;
  }
  pts(list: Px[], c: string, behind = false) { for (const [x, y] of list) behind ? this.u(x, y, 1, 1, c) : this.d(x, y, c); return this; }
  isFace(x: number, y: number) { return !!this.faceMask[Math.floor(y / S)]?.[Math.floor(x / S)]; }
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

const suitElder = (d: Detail, tie: string) => d.suit(SHIRT, tie).buttons("#d8d8e0", 2, d.ty + 12, 4).cuffs(SHIRT);

const PAINTERS: Partial<Record<ChestCharacterId, Painter>> = {
  "prime-garp": (d) => {
    d.wipeScar().eyes("stern", "#5a3a2a").mouth("grin");
    d.f(d.R + 3, d.hy + 4, 1, 7, "#b56a5a"); // scar over his left eye
    for (let i = 0; i < 8; i += 2) d.f(d.hx + 4 + i, d.hy + 13, 1, 1, shade(d.sk, -0.35)); // stubble
    d.suit(SHIRT, "#2a4a8a").buttons("#c8ccd6", 2, d.ty + 12).cuffs("#2a4a8a");
    d.trim("#f2f4f7", "#2a4a8a", d.ty);
    // Haki fist crackles with black lightning.
    d.bolt(d.rx + 10, d.rhy - 8, 1, 9).bolt(d.rx - 4, d.rhy + 4, -1, 7).sparkle(d.rx + 12, d.rhy + 2, "#ff8a8a");
  },
  "prime-rayleigh": (d) => {
    d.eyes("stern", "#5fc8a8", "#d8cc9a").mouth("smirk");
    // Round glasses with glints.
    for (const x of [d.L - 1, d.R - 1]) d.r(x, d.ey - 1, 5, 1, "#c8e0e8").r(x, d.ey + 2, 5, 1, "#c8e0e8").r(x, d.ey, 1, 2, "#c8e0e8").r(x + 4, d.ey, 1, 2, "#c8e0e8").d(x + 1, d.ey, white);
    d.r(d.L + 4, d.ey, d.R - d.L - 5, 1, "#c8e0e8");
    d.line(d.L - 1, d.hy + 3, d.L + 1, d.hy + 12, "#b0806a"); // scar over his right eye
    d.trim("#2f6a5a", gold, d.ty).folds("#2f6a5a", d.legY);
    d.suit("#f4f6fa", undefined, "#d8dce6").buttons("#9aa4b8", 2, d.ty + 11);
  },
  "rocks-d-xebec": (d) => {
    d.eyes("glare", "#ff4d6d").mouth("grin");
    // Skull and crossbones on the bicorne.
    const sx = d.cx - 2, sy = d.hy - 6;
    d.r(sx, sy, 4, 3, white).d(sx + 1, sy + 1, ink).d(sx + 2, sy + 1, ink).r(sx + 1, sy + 3, 2, 1, white).d(sx - 2, sy - 1, white).d(sx + 5, sy - 1, white).d(sx - 2, sy + 4, white).d(sx + 5, sy + 4, white);
    d.trim("#5a1a2a", gold, d.ty).folds("#5a1a2a", d.legY);
    d.r(d.hx - 2, d.hy + 12, 2, 2, gold).r(d.hx + d.hw, d.hy + 12, 2, 2, gold); // gold hoops
    d.belt("#2a1418", gold).buttons(gold, 2, d.ty + 4);
    d.flame(d.lx - 3, d.lhy + 2, 9, ["#ffe680", "#ff9a3a", "#ff4d6d", "#7a1a3a"]).flame(d.rx + d.aw + 3, d.rhy + 2, 9, ["#ffe680", "#ff9a3a", "#ff4d6d", "#7a1a3a"]);
  },
  imu: (d) => {
    d.eyes("ring").mouth("none");
    d.folds("#0f0818", d.ty + 6, 3).trim("#0f0818", "#6a3aa8", d.ty);
    // Rings of the void spiral over the robe.
    for (let i = 0; i < 5; i++) d.d(d.tc - 3 + i, d.ty + 6 + (i % 2), "#c06bff").d(d.tc - 2 + i, d.ty + 12 - (i % 2), "#8a4ad0");
    for (let i = 0; i < 6; i++) d.u(d.legX - 6 + i * 6, d.bottom - (i % 2) * 3, 2, 3, i % 2 ? "#3a1a5a" : "#5a2a8a"); // shadow tendrils
    d.r(d.cx - 1, d.hy - 4, 2, 2, HAKI_RED); // crown jewel
  },
  "joy-boy": (d) => {
    d.eyes("nika").mouth("grin");
    for (let i = 0; i < 9; i++) d.u(d.cx - 16 + i * 4, d.hy - 8 + Math.abs(4 - i) * 2, 2, 2, "#fff3a6"); // sun-god halo
    // Cloud ring around the shoulders.
    for (let i = 0; i < d.tw + 8; i += 3) d.r(d.tx - 4 + i, d.ty - 1 + (i % 2), 3, 3, i % 2 ? "#ffffff" : "#eef0ff").d(d.tx - 3 + i, d.ty + 1 + (i % 2), "#c8cce0");
    d.belt("#e8e0ff", null).sparkle(d.tx - 6, d.ty + 10, "#fff3a6").sparkle(d.tx + d.tw + 6, d.ty + 4, "#fff3a6");
  },
  "saint-saturn": (d) => {
    d.eyes("glare", "#c9b8ff", "#cfcfe0").mouth("none");
    d.f(d.R + 3, d.hy + 11, 1, 1, "#4a3a3a"); // mole
    suitElder(d, "#6a4aa8");
    // Jointed spider legs with pale tips.
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const bx = s < 0 ? d.tx - 2 : d.tx + d.tw + 1, by = d.ty + 4 + i * 4;
      const kx = bx + s * (7 + i), fx = bx + s * (11 + i);
      for (const o of [0, 1]) d.line(bx, by + o, kx, by - 4 + o, o ? "#3a2a5a" : "#7a6aa8", true).line(kx, by - 4 + o, fx, by + 7 + o, o ? "#3a2a5a" : "#7a6aa8", true);
      d.u(kx, by - 5, 1, 1, "#c9b8ff").u(fx, by + 8, 1, 2, "#e8dcf0");
    }
    d.trim("#4a3a6a", "#7a6aa8");
    d.r(d.rx + d.aw - 3, d.rhy - 2, 3, 3, gold).d(d.rx + d.aw - 2, d.rhy - 2, GOLD_L); // cane knob
  },
  "saint-mars": (d) => {
    d.eyes("glare", "#ff7a5c").mouth("none");
    suitElder(d, "#c8402a");
    // Feathered Itsumade wings.
    d.recolor("#ff6a3a", 0, 0, d.p.width, d.ty + 10, (x, y) => (x + y) % 4 === 0 ? "#ffb05a" : (x - y) % 5 === 0 ? "#b8341a" : null);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) d.u(s < 0 ? d.tx - 14 + i * 2 : d.tx + d.tw + 6 + i * 2, d.ty + 12 + i, 2, 3, i % 2 ? "#ff6a3a" : "#c8402a");
    d.flame(d.rx + d.aw + 2, d.rhy + 2, 7, ["#fff0a0", "#ffa05a", "#ff5a2a"]);
  },
  "saint-warcury": (d) => {
    d.eyes("none").mouth("none");
    d.r(d.L - 1, d.ey - 1, d.R - d.L + 5, 3, "#2a2f40").r(d.L, d.ey - 1, 3, 1, "#7a8aa8").r(d.R, d.ey - 1, 3, 1, "#7a8aa8"); // shades + glint
    // Boar tusks.
    for (const s of [-1, 1]) { const x = s < 0 ? d.cx - 6 : d.cx + 5; d.d(x, d.hy + 12, white).d(x, d.hy + 11, white).d(x + s, d.hy + 10, white).d(x + s, d.hy + 9, "#e8dcc0"); }
    suitElder(d, "#c8a040");
    d.r(d.rx + d.aw - 4, d.rhy - 6, 6, 2, gold).d(d.rx + d.aw - 2, d.rhy - 6, "#ff4d6d"); // sword guard gem
  },
  "saint-nusjuro": (d) => {
    d.eyes("stern", "#9fe7ff").mouth("line");
    for (const x of [d.L - 1, d.R - 1]) d.r(x, d.ey - 1, 5, 4, "#c8e8f8").r(x + 1, d.ey, 3, 2, "#e8f8ff").d(x + 1, d.ey, white).d(x + 2, d.ey + 1, ink);
    suitElder(d, "#4a90c0");
    // Frost-edged Shodai Kitetsu.
    const x = Math.min(d.rx + d.aw - 2, d.W - 4);
    for (let y = d.rhy - 20; y < d.rhy - 6; y += 2) d.d(x, y, "#e8fbff").u(x + 2, y + 1, 1, 1, "#9fe7ff").u(x - 2, y, 1, 1, "#bff4ff");
    for (let i = 0; i < 4; i++) d.sparkle(d.tx - 6 + i * 2, d.legY - 4 + i * 6, "#bff4ff");
  },
  "saint-ju-peter": (d) => {
    d.eyes("stern", "#8cffb0").mouth("none");
    suitElder(d, "#3a8a4a");
    // Segmented sandworm tail.
    d.recolor("#c8a870", 0, d.ty, d.p.width, d.p.height - d.ty, (x, y) => y % 3 === 0 ? "#8a6a3a" : (x + y) % 5 === 0 ? "#e8d0a0" : null);
    d.u(d.tx - 12, d.ty + 18, 6, 4, "#c8a870").u(d.tx - 14, d.ty + 20, 3, 3, "#8a6a3a").d(d.tx - 13, d.ty + 20, "#ff6a6a");
  },
  "saint-garling": (d) => {
    d.eyes("glare", "#ffe680", "#d0d0d8").mouth("none");
    // Gold cross on the tall hat and the God Knights' gold coat trim.
    d.r(d.cx - 1, d.hy - 10, 2, 7, gold).r(d.cx - 3, d.hy - 8, 6, 2, gold).d(d.cx - 1, d.hy - 9, GOLD_L);
    d.trim("#d8c070", GOLD_D, d.ty).folds("#d8c070", d.legY);
    d.r(d.tc - 3, d.ty + 4, 6, 6, gold).r(d.tc - 2, d.ty + 5, 4, 4, "#f2f2f2").r(d.tc - 1, d.ty + 5, 2, 4, gold).r(d.tc - 2, d.ty + 6, 4, 2, gold);
    d.belt("#a8862a", "#ff4d6d");
    d.r(d.rx + d.aw - 4, d.rhy - 6, 6, 2, GOLD_L);
  },
  "shanks-divine": (d) => {
    d.wipeScar().eyes("glare", "#ff3b3b", "#a01818").mouth("smirk");
    for (let i = 0; i < 3; i++) d.f(d.R - 1 + i * 2, d.ey - 3 + (i === 1 ? -1 : 0), 1, 7, "#9a2a34"); // three scars over his left eye
    // Cape over the missing left arm, with a red lining.
    d.r(d.lx - 2, d.ty, d.aw + 4, d.th - 2, "#1e1e28").r(d.lx - 1, d.ty + 1, d.aw + 2, 1, "#3a3a4a");
    d.trim("#1e1e28", "#a01818", d.ty);
    d.suit(SHIRT, undefined, "#d8dce6").belt("#4a3a2a", gold);
    // Divine Departure: red haki lightning along Gryphon.
    const x = Math.min(d.rx + d.aw - 2, d.W - 4);
    d.bolt(x + 3, d.hy - 4, 1, 12).bolt(x - 3, d.hy + 2, -1, 10).sparkle(x + 1, d.hy - 6, "#ff9a9a");
  },
  "blackbeard-full": (d) => {
    d.eyes("glare", "#7a5cff", "#120a20").mouth("gapGrin");
    d.recolor("#1e1e28", d.hx - 4, d.hy + 8, d.hw + 8, 14, (x, y) => (x * 3 + y) % 5 === 0 ? "#3a3a4a" : null); // curly beard
    d.r(d.hx + d.hw - 2, d.hy, 4, 3, "#a02a2a").d(d.hx + d.hw + 2, d.hy + 3, "#d84040"); // bandana knot
    for (let i = 0; i < 8; i++) d.u(d.tx - 8 + i * 5, d.bottom - (i % 3) * 2, 4, 3, i % 2 ? "#1a0a30" : "#2e1450"); // darkness pool
    d.orb(d.rx + d.aw + 4, d.rhy, 4, "#e8f4ff", "#7aa8d8"); // quake bubble
    d.orb(d.lx - 5, d.lhy, 4, "#1a0a30", "#7a5cff"); // black hole
    d.belt("#5a3a2a", gold);
  },
  "kaido-hybrid": (d) => {
    d.eyes("glare", "#ffe84a", "#101830").mouth("fangs");
    // Dragon scales over the skin and torso.
    const scale = (x: number, y: number) => (x + (Math.floor(y / 2) % 2) * 2) % 4 === 0 && y % 2 === 0 ? "#7aa0e8" : null;
    d.recolor("#9fc0ff", 0, d.ty, d.p.width, d.p.height - d.ty, scale).recolor("#4f8fff", 0, 0, d.p.width, d.p.height, (x, y) => (x + (Math.floor(y / 2) % 2) * 2) % 4 === 0 && y % 2 === 0 ? "#3a70d8" : null);
    d.recolor("#1e2a50", 0, 0, d.p.width, d.ty + 6, (x, y) => (x + y) % 4 === 0 ? "#3a4a80" : null); // mane streaks
    d.r(d.tx + 2, d.ty + d.th - 7, d.tw - 4, 3, "#8a5ad0").r(d.tc - 2, d.ty + d.th - 8, 4, 5, "#6a3aa8"); // shimenawa rope
    d.sparkle(d.lx - 6, d.lhy - 6, "#ffe84a").sparkle(d.rx + d.aw + 6, d.rhy - 14, "#ffe84a");
  },
  "big-mom-full": (d) => {
    d.eyes("glare", "#ff7ac8", "#c03a8a").mouth("grin");
    d.r(d.cx - 2, d.hy - 7, 4, 3, white).d(d.cx - 1, d.hy - 6, ink).d(d.cx, d.hy - 6, ink); // hat skull
    d.recolor("#ffd8ec", 0, d.ty, d.p.width, d.p.height - d.ty, (x, y) => (x % 5 === 0 && y % 5 === 0) ? "#e83a6a" : null); // polka dots
    d.r(d.lx - 9, d.lhy - 18, 7, 7, "#ff8a3a").r(d.lx - 8, d.lhy - 17, 5, 5, "#ffd040").d(d.lx - 7, d.lhy - 15, ink).d(d.lx - 5, d.lhy - 15, ink).r(d.lx - 7, d.lhy - 13, 3, 1, "#c8402a"); // Prometheus
    d.r(d.rx + d.aw + 1, d.rhy - 22, 9, 5, "#e8f0ff").r(d.rx + d.aw + 2, d.rhy - 23, 5, 1, "#e8f0ff").d(d.rx + d.aw + 3, d.rhy - 21, ink).d(d.rx + d.aw + 6, d.rhy - 21, ink).sparkle(d.rx + d.aw + 10, d.rhy - 16, "#ffe84a"); // Zeus
  },
  "luffy-gear-5-bajrang": (d) => {
    d.eyes("nika").mouth("grin");
    d.f(d.L, d.hy + 12, 1, 1, "#ffb0b0").f(d.R + 2, d.hy + 12, 1, 1, "#ffb0b0");
    // Giant Bajrang fist: knuckle lines, a gold armament gleam and red sparks.
    const fx = d.rx - 6, fy = d.rhy - 20;
    for (let i = 0; i < 4; i++) d.r(fx + 3 + i * 3, fy + 4, 1, 4, "#4a3a6a");
    d.r(fx + 3, fy + 2, 10, 1, "#ffd040").r(fx + 3, fy + 3, 4, 1, GOLD_L);
    d.bolt(fx - 2, fy - 2, -1, 7).bolt(fx + 18, fy + 2, 1, 7).sparkle(fx + 8, fy - 4, "#fff6c9");
    for (let i = 0; i < d.tw + 8; i += 3) d.r(d.tx - 4 + i, d.ty - 1 + (i % 2), 3, 3, i % 2 ? "#ffffff" : "#eef0ff");
    d.belt("#a8c8ff", null);
  },
  "zoro-conqueror": (d) => {
    d.wipeScar().eyes("closedLeft", "#30ff8a", "#1a8a4a").mouth("none");
    d.r(d.hx - 2, d.hy + 11, 1, 2, gold).r(d.hx - 2, d.hy + 14, 1, 2, gold).r(d.hx - 1, d.hy + 9, 1, 1, gold); // three earrings
    d.r(d.lx, d.lhy - 8, d.aw, 3, "#1a1a20").d(d.lx - 1, d.lhy - 6, "#1a1a20"); // black bandana tied on his arm
    d.trim("#123a22", "#30ff8a", d.ty).folds("#123a22", d.legY);
    // Kimono cross-collar over the haramaki.
    for (let i = 0; i < 8; i++) d.d(d.tc - 4 + i, d.ty + 2 + i, "#2a5a3a").d(d.tc + 3 - i, d.ty + 2 + i, "#2a5a3a");
    d.r(d.tx + 2, d.ty + d.th - 8, d.tw - 4, 4, "#3a7a3a").r(d.tx + 2, d.ty + d.th - 8, d.tw - 4, 1, "#5aa85a");
    d.bolt(d.lx - 4, d.lhy - 18, -1, 10).bolt(d.rx + d.aw + 4, d.rhy - 18, 1, 10).sparkle(d.cx + 12, d.hy + 4, "#ff6a8a");
  },
  "roger-prime": (d) => {
    d.eyes("stern", "#ffcc33").mouth("grin");
    // Big hooked moustache.
    d.r(d.cx - 7, d.hy + 10, 14, 2, "#1a1d2a").d(d.cx - 8, d.hy + 9, "#1a1d2a").d(d.cx + 7, d.hy + 9, "#1a1d2a").d(d.cx - 9, d.hy + 8, "#1a1d2a").d(d.cx + 8, d.hy + 8, "#1a1d2a");
    d.trim("#c8282c", gold, d.ty).folds("#c8282c", d.legY).epaulettes(gold);
    d.r(d.hx - 2, d.hy - 3, d.hw + 4, 1, gold); // hat braid
    d.suit(SHIRT, undefined, "#d8dce6").buttons(gold, 2, d.ty + 11).belt("#3a2a1a", gold);
    d.bolt(d.rx + d.aw + 3, d.rhy - 16, 1, 9).sparkle(d.rx + d.aw + 5, d.rhy - 20, "#ffe680");
  },
  "whitebeard-quake": (d) => {
    d.eyes("glare", "#e8f6ff", "#d8d8e0").mouth("none");
    // The crescent moustache, sharpened.
    const { cx, hy, hx, hw } = d;
    d.clear(hx - 2, hy + 4, 2, 8).clear(hx + hw, hy + 4, 2, 8); // drop the blocky low-res tips
    d.r(cx - 6, hy + 10, 12, 2, white).r(cx - 6, hy + 11, 12, 1, "#d8e0ea");
    for (const s of [-1, 1]) {
      const pts: Px[] = [[7, 9], [8, 8], [9, 7], [10, 6], [11, 5], [11, 4], [11, 3], [12, 2]];
      for (const [ox, oy] of pts) { const x = s < 0 ? cx - ox : cx + ox - 1; d.r(Math.min(x, x + s), hy + oy, 2, 1, white); }
      d.d(s < 0 ? cx - 12 : cx + 11, hy + 1, "#d8e0ea");
    }
    d.r(d.hx + 2, d.hy - 2, d.hw - 4, 3, "#1a1a24").r(d.hx + d.hw - 2, d.hy, 4, 3, "#1a1a24"); // black bandana
    d.trim("#e8f0f8", "#3a3f52", d.ty).folds("#e8f0f8", d.legY);
    for (let i = 0; i < 6; i++) d.d(d.tc - 5 + i * 2, d.ty + 5 + (i % 2), "#c8a090"); // battle scars
    d.orb(d.lx - 5, d.lhy, 4, "#e8f6ff", "#7aa8d8").orb(d.rx + d.aw + 8, d.rhy - 8, 3, "#e8f6ff", "#7aa8d8");
    for (let i = 0; i < 6; i++) d.u(d.legX - 6 + i * 5, d.bottom - 1, 3, 1, "#c8f0ff"); // ground cracks
  },
  "dragon-full": (d) => {
    d.wipeScar().eyes("glare", "#5cff9d", "#101420").mouth("line");
    // Red tribal tattoo down the left side of his face.
    const tx = d.hx + d.hw - 4;
    d.f(tx, d.hy + 5, 2, 9, "#d03030").f(tx - 2, d.hy + 7, 2, 1, "#d03030").f(tx - 2, d.hy + 11, 2, 1, "#d03030").f(tx + 1, d.hy + 9, 1, 1, "#ff6a5a");
    d.trim("#1f5a2f", "#8affb0", d.ty).folds("#1f5a2f", d.legY);
    d.r(d.tc - 4, d.ty + 2, 8, 2, "#2a7a3a").belt("#3a2a1a", gold);
    for (let i = 0; i < 4; i++) d.line(d.tx - 12 + i, d.ty + 4 + i * 6, d.tx - 6 + i, d.ty + 2 + i * 6, "#a8ffd0", true); // wind gusts
  },
  "mihawk-strongest": (d) => {
    d.eyes("hawk", "#ffd24a", "#101018").mouth("none");
    d.r(d.cx - 4, d.hy + 11, 3, 1, "#1e1e28").r(d.cx + 1, d.hy + 11, 3, 1, "#1e1e28"); // thin moustache
    // Yoru: a black cross-blade with a gold guard and a green gem.
    const x = Math.min(d.rx + d.aw - 2, d.W - 4);
    d.r(x - 5, d.rhy - 8, 12, 3, ink).r(x - 4, d.rhy - 7, 10, 1, gold).r(x - 1, d.rhy - 12, 4, 10, ink).r(x, d.rhy - 11, 2, 8, gold).r(x, d.rhy - 8, 2, 2, "#43c66b");
    // Cross pendant on an open shirt.
    d.suit("#f4c69c", undefined, "#3a3d4a").r(d.tc - 1, d.ty + 5, 2, 6, gold).r(d.tc - 3, d.ty + 7, 6, 2, gold);
    d.trim("#1a1a24", "#b8862e", d.ty).folds("#1a1a24", d.legY);
    d.recolor("#f4f4f4", 0, 0, d.p.width, d.hy, (x, y) => (x + y) % 3 === 0 ? "#c8c8d0" : null); // plume barbs
  },
};

/** A jewelled crown with outlined spikes. */
function crown(d: Detail, frame: number) {
  const c = d.cx, y = d.hy - 13 - (frame === 1 ? 1 : 0);
  const spikes: Px[] = [[c - 6, y + 1], [c - 6, y + 2], [c - 5, y + 2], [c - 1, y], [c, y], [c - 2, y + 1], [c + 1, y + 1], [c + 5, y + 1], [c + 5, y + 2], [c + 4, y + 2]];
  d.pts(spikes, gold, true).u(c - 6, y + 3, 12, 3, gold).u(c - 6, y + 3, 12, 1, GOLD_L).u(c - 6, y + 5, 12, 1, GOLD_D);
  d.u(c - 4, y + 4, 1, 1, "#ff3b6b").u(c - 1, y + 4, 2, 1, "#4ac8ff").u(c + 3, y + 4, 1, 1, "#43e07a").u(c - 1, y - 1, 2, 1, white);
}

function buildHd(id: ChestCharacterId, pose: Pose, frame: number): RunnerSprite {
  const { f, look, accent } = buildFigure(id, pose);
  // Remember which low-res cells are face, so features stay on skin.
  const faceColors = new Set([f.sk, shade(f.sk, -0.2), shade(f.sk, -0.25)]);
  const mask = f.p.cells.map((row, y) => row.map((k, x) => k !== "." && (faceColors.has(f.p.palette[k]) ||
    (f.p.palette[k] === ink && x > f.hx && x < f.hx + f.hw - 1 && y > f.hy && y < f.hy + f.hh))));
  const p = upscale(f.p);
  autoShade(p);
  selOut(p);
  const d = new Detail(p, f, look, accent, pose, mask);
  const paint = PAINTERS[id];
  if (paint) paint(d); else d.eyes().mouth();
  if (look.hat !== "crown") crown(d, frame); // Imu already wears one
  const top = trimTop(p);
  p.aura(shade(accent, 0.35), undefined, 1);
  p.aura(accent, MYTHIC_SHIMMER[frame], 2);
  const sprite = p.finish(Math.max(0, d.hx - 6 + 3), Math.max(0, d.hy - 6 - top + 3));
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
