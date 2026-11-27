import { chestCharacterById, type ChestCharacterId } from "@/data/chest-characters";
import { PLAYABLE_CHARACTERS, type CharacterId } from "@/data/playable-characters";
import { CHEST_LOOKS, type Look } from "./chest-looks";
import { figureFromLook } from "./generated";
import { ink, white, gold, shade, type Pose, type RunnerSprite } from "./kit";
import { Detail, renderHd, shapeAura, blob, stroke, fringe, shatter, GOLD_D, SHIRT, type Painter } from "./mythic-hd";

// High-detail Legendary art. Same 2× pipeline as the mythics (shading, coloured outlines,
// real faces and a hand-drawn detail pass per character), but a step down in spectacle:
// a calm two-ring glow instead of layered flames, and smaller power effects.

type LegacyId = "law" | "rayleigh" | "whitebeard" | "shanks";
export type LegendaryArtId = ChestCharacterId | LegacyId;

const HAKI = "#2b2140", MARINE = "#f2f4f7";

// ---------- Base looks ----------
/** The four former achievement recruits, described in the chest-look format so they share the pipeline. */
const LEGACY_LOOKS: Record<LegacyId, Look> = {
  law: { h: "#1e2230", hs: "short", t: "#1e1e28", l: "#4a6a9a", hat: "beanie", hc: "#f2f2f2", x: ["goatee:#1e2230"], ow: true },
  rayleigh: { h: "#e8eef2", hs: "long", t: "#f2f2f2", l: "#4a4f66", coat: "#2f6a52", x: ["glasses:#c8e0e8", "beard:#e8eef2", "scar:#c08a7a"], ow: true },
  whitebeard: { b: "giant", h: "#f0e2b0", hs: "slick", t: "#f2f2f2", l: "#2a2d3a", coat: "#f4f4f8", x: ["crescent:#ffffff"], ow: true },
  shanks: { h: "#d83a3a", hs: "short", t: "#f2f2f2", l: "#4a4a5a", sh: "#3a2a1a", coat: "#1a1a22", x: ["scar:#a03a3a"], ow: true },
};

/** Tweaks to the chest looks for the HD version (mostly: the HD painter draws its own weapon or effect). */
const HD_LOOK: Partial<Record<ChestCharacterId, Partial<Look>>> = {
  "kozuki-oden": { ow: true, hs: "long", hat: "wide", hc: "#1e2228", x: ["beard:#2a2d3a", "open:#f4c69c"] },
  yamato: { ow: true },
  marco: { t: "#9a6ab8", l: "#1e3a3a", x: ["open:#f4c69c"] },
  vista: { ow: true, x: ["stache:#2a2d3a"] },
  king: { ow: true, t: "#2e2840", l: "#2e2840", sh: "#1a1622", x: ["mask:#2a2d3a"] },
  jack: { ow: true },
  queen: { h: "#f0c840", hs: "slick", t: "#f2f2f2", sl: "#f4c69c", l: "#f2f2f2", x: ["grin"] },
  ryokugyu: { h: "#3aa89a", hs: "short", t: "#f4c69c", l: "#1a1a22", x: [] },
  katakuri: { ow: true },
  aokiji: { t: "#e4e6ee", l: "#e4e6ee", x: [] },
  kizaru: { x: ["shades:#e8782a"] },
  akainu: { t: "#8a2434", l: "#8a2434", hc: "#f2f4f7", sh: "#f2f2f2", x: [] },
  fujitora: { ow: true },
  "edward-weevil": { ow: true, x: [] },
  "benn-beckman": { ow: true, hs: "slick", t: "#1e1e28", l: "#6a6a40", sh: "#4a3a2a", coat: "#2e3260", x: [] },
  "lucky-roux": { ow: true, b: "giant", t: "#3a8a3a", l: "#e0d8c4", sh: "#a82a2a", hat: "bandana", hc: "#3a8a3a", coat: "#e8b04a", x: [] },
  yasopp: { ow: true },
  "rob-lucci-awakened": { ow: true, b: "big", sk: "#d9a274", h: "#1e1a22", hs: "long", t: "#f2f2f2", l: "#f2f2f2", sh: "#f2f2f2", hand: "#d9a274", hat: "top", hc: "#f4f4f4", coat: "#f8f8fa", x: [] },
  "law-awakened": { ow: true, x: ["goatee:#2a2d3a"] },
  "kid-awakened": { t: "#1e1e28", l: "#d8c070", sh: "#3a2420", coat: "#c8281a", x: [] },
  "sanji-ifrit-jambe": { t: "#f4f6fa", l: "#1e1e28", sh: "#1e1e28", x: [] },
  "killer-onigashima": { ow: true, hs: "long", t: "#2a5ab8", l: "#5a8ac8", sh: "#6a4a2a", x: [] },
  vergo: { ow: true, x: ["goatee:#16121c"] },
};

/** Extra transparent canvas (HD pixels per side) for wide weapons and effects. */
const MARGIN: Partial<Record<LegendaryArtId, number>> = {
  "kozuki-oden": 10, yamato: 8, marco: 6, jozu: 2, vista: 6, king: 8, queen: 6, jack: 8, katakuri: 6,
  aokiji: 4, kizaru: 6, akainu: 4, fujitora: 4, ryokugyu: 10, tsuru: 4, "edward-weevil": 6, "benn-beckman": 6,
  "lucky-roux": 6, yasopp: 8, "rob-lucci-awakened": 4, "law-awakened": 6, "kid-awakened": 6, "sanji-ifrit-jambe": 2,
  vergo: 4, "killer-onigashima": 8,
  law: 6, rayleigh: 4, whitebeard: 6, shanks: 4,
};

// ---------- Helpers ----------
/** Hair strands: a darker and a lighter thread pattern through one hair colour near the head. */
function strands(d: Detail, c: string, y0 = d.hy - 16, h = d.hh + 22) {
  return d.recolor(c, d.hx - 10, y0, d.hw + 20, h, (x, y) => (x * 2 + y) % 7 === 0 ? shade(c, -0.32) : (x + y * 3) % 11 === 0 ? shade(c, 0.35) : null);
}
/** Recolours a colour family (keeping its light/shadow/outline shades) inside a box. */
function repaint(d: Detail, from: string, to: string, x = 0, y = 0, w = d.W, h = d.p.height) {
  const dk = shade(from, -0.24), lt = shade(from, 0.24), ol = shade(from, -0.55);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const c = d.at(i, j);
    if (c === from) d.d(i, j, to); else if (c === dk) d.d(i, j, shade(to, -0.24)); else if (c === lt) d.d(i, j, shade(to, 0.24)); else if (c === ol) d.d(i, j, shade(to, -0.55));
  }
  return d;
}
function stubble(d: Detail, rows = 1) {
  for (let r = 0; r < rows; r++) for (let i = 0; i < d.hw - 6; i += 2) d.f(d.hx + 3 + i + (r % 2), d.hy + 14 + r, 1, 1, shade(d.sk, -0.3));
  return d;
}
/** A V-shaped open front showing the chest. */
function openFront(d: Detail, depth = 10, maxHalf = 4, edge?: string) {
  const { tc, ty, sk } = d;
  for (let i = 0; i < depth; i++) {
    const half = Math.max(1, maxHalf - Math.floor(i / 3));
    d.r(tc - half, ty + 1 + i, half * 2, 1, sk);
    if (edge) d.d(tc - half - 1, ty + 1 + i, edge).d(tc + half, ty + 1 + i, edge);
  }
  const m = shade(sk, -0.22);
  return d.r(tc - 3, ty + 4, 2, 1, m).r(tc + 1, ty + 4, 2, 1, m).r(tc, ty + 5, 1, Math.max(0, depth - 6), shade(sk, -0.16));
}
/** Muscle definition on a bare torso: pec lines, a centre line and two rows of abs. */
function muscles(d: Detail, rows = 3, y0 = d.ty + 3) {
  const { tc } = d, m = shade(d.sk, -0.24), hl = shade(d.sk, 0.2), half = Math.min(7, d.tw / 2 - 2);
  d.r(tc - half, y0 + 3, half - 1, 1, m).r(tc + 1, y0 + 3, half - 1, 1, m).r(tc - half + 1, y0 + 1, 3, 1, hl).r(tc + half - 4, y0 + 1, 3, 1, hl);
  d.r(tc, y0 + 1, 1, 6 + rows * 3, m);
  for (let i = 0; i < rows; i++) { const y = y0 + 7 + i * 3; d.r(tc - 3, y, 2, 1, m).r(tc + 1, y, 2, 1, m).d(tc - 3, y - 1, hl).d(tc + 2, y - 1, hl); }
  return d;
}
/** Turns the shirt into a bare, muscled torso. */
function bareTorso(d: Detail, shirt: string, rows = 3) {
  repaint(d, shirt, d.sk, d.tx - 1, d.ty - 1, d.tw + 2, d.th + 1);
  return muscles(d, rows);
}
/** A straight blade from the hand to the tip: bright edge, steel body, dark spine, guard and wrapped grip. */
function sword(d: Detail, hx: number, hy: number, tipX: number, tipY: number, o: { steel?: string; edge?: string; spine?: string; guard?: string; grip?: string; gripLen?: number; thick?: boolean; guardW?: number } = {}) {
  const steel = o.steel ?? "#c8d2e0", edge = o.edge ?? "#ffffff", spine = o.spine ?? shade(steel, -0.42), guard = o.guard ?? gold, grip = o.grip ?? "#2a2238";
  const vertical = Math.abs(tipY - hy) >= Math.abs(tipX - hx);
  const off = (k: number): [number, number] => vertical ? [k, 0] : [0, k];
  const len = Math.max(Math.abs(tipX - hx), Math.abs(tipY - hy)) || 1;
  const ux = (tipX - hx) / len, uy = (tipY - hy) / len;
  d.asBody(() => {
    const [ax, ay] = off(1), [bx, by] = off(2);
    d.line(hx, hy, tipX, tipY, edge).line(hx + ax, hy + ay, tipX + ax, tipY + ay, steel);
    if (o.thick) d.line(hx + bx, hy + by, tipX + bx, tipY + by, spine); else d.line(hx + bx, hy + by, tipX + ax + (vertical ? 0 : 0), tipY + ay, spine);
    // Grip: runs back through the fist and out the other side.
    const gl = o.gripLen ?? 6;
    for (let k = 1; k <= gl; k++) {
      const gx = Math.round(hx - ux * k), gy = Math.round(hy - uy * k);
      d.r(gx, gy, 2, 2, k % 2 ? grip : shade(grip, 0.45));
    }
    d.r(Math.round(hx - ux * (gl + 1)), Math.round(hy - uy * (gl + 1)), 2, 2, guard);
    const gw = o.guardW ?? 5;
    if (vertical) d.r(hx - Math.floor(gw / 2) + 1, hy - 1, gw, 2, guard).r(hx - Math.floor(gw / 2) + 1, hy - 1, gw, 1, shade(guard, 0.4));
    else d.r(hx - 1, hy - Math.floor(gw / 2) + 1, 2, gw, guard).r(hx - 1, hy - Math.floor(gw / 2) + 1, 1, gw, shade(guard, 0.4));
  });
  return d;
}
/** A long pole weapon from the ground up to a head drawn by `head`. */
function pole(d: Detail, x: number, top: number, bottom: number, c: string) {
  d.asBody(() => d.r(x - 1, top, 4, bottom - top, ink).r(x, top, 2, bottom - top, c).r(x, top, 1, bottom - top, shade(c, 0.3)));
  return d;
}
/** A translucent soap/air bubble. */
function bubble(d: Detail, x: number, y: number, r: number, c = "#bfefff") {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const q = i * i + j * j;
    if (q <= r * r + r && q >= (r - 1) * (r - 1)) d.u(x + i, y + j, 1, 1, c);
    else if (q < (r - 1) * (r - 1)) d.u(x + i, y + j, 1, 1, `${c}38`);
  }
  return d.u(x - Math.ceil(r / 2), y - Math.ceil(r / 2), 1, 1, white);
}
/** A rising tongue of fire with a hot core. */
function fire(d: Detail, x: number, y: number, h: number, outer: string, mid: string, core: string) {
  return d.flame(x, y, h, [core, mid, outer]);
}
/** Faceted diamond shine over a colour family. */
function facets(d: Detail, family: string, light = "#ffffff", dark = "#7ab0d8") {
  return d.recolor(family, 0, 0, d.W, d.p.height, (x, y) => (x + y) % 6 === 0 ? light : (x - y + 60) % 7 === 0 ? dark : null);
}
/** Marine coat: shoulder line, trims and folds, optional epaulettes. */
function marineCoat(d: Detail, coat = MARINE, trim = "#c8cedc", epaulettes = false) {
  d.trim(coat, trim, d.ty).folds(coat, d.legY - 4, 4);
  if (epaulettes) d.asBody(() => { d.epaulettes(gold); fringe(d, d.tx - 3, d.ty + 2, 6); fringe(d, d.tx + d.tw - 3, d.ty + 2, 6); });
  return d;
}
/** Drifting wisps (steam, smoke, cold mist) drawn behind the figure. */
function wisps(d: Detail, list: [number, number, number][], c: string) {
  for (const [x, y, r] of list) for (let j = -r; j <= r; j++) for (let i = -r - 1; i <= r + 1; i++) if (i * i * 0.7 + j * j <= r * r) d.u(x + i, y + j, 1, 1, j < 0 && i < 0 ? shade(c, 0.3) : c);
  return d;
}

/** The thick purple-and-white shimenawa rope of Wano, looped behind the shoulders. */
function shimenawa(d: Detail, rise = 8) {
  const cells = new Map<string, string>(), rx = d.tw / 2 + 12, ry = rise + 12, cy = d.ty + 10;
  stroke(cells, 90, (t) => { const a = Math.PI * (0.92 + 1.16 * t); return [d.tc + Math.cos(a) * rx, cy + Math.sin(a) * ry + 2]; }, () => 5,
    (t, j, w) => { const seg = Math.floor(t * 18) % 2, edge = j === 0 || j === w - 1; return seg ? (edge ? "#3a2a98" : j === 1 ? "#8a7af0" : "#5a4ac8") : (edge ? "#b8b8cc" : j === 1 ? "#ffffff" : "#e8e8f2"); });
  for (const s of [-1, 1]) { const x = Math.round(d.tc + s * rx), y = cy + 6; for (let k = 0; k < 3; k++) for (let i = -2; i <= 2; i++) cells.set(`${x + i},${y + k * 3}`, k % 2 ? "#e8e8f2" : "#5a4ac8"); }
  blob(d, cells, () => false);
  return d;
}

/** Shanks's three claw scars, raked down across his left eye (drawn before the eyes, which sit on top). */
function clawScars(d: Detail) {
  for (let i = 0; i < 3; i++) for (let k = 0; k < 10; k++) d.f(d.R - 2 + i * 2 + (k > 4 ? 1 : 0), d.ey - 5 + k, 1, 1, k % 4 === 3 ? "#d07078" : "#a83a48");
  return d;
}
/** Feathered wings fanning out from both shoulders. `tint(t)` colours a feather from root (0) to tip (1). */
function wings(d: Detail, tint: (t: number, feather: number) => string, span = 14) {
  d.asBody(() => {
    for (const s of [-1, 1]) {
      const ax = s < 0 ? d.tx : d.tx + d.tw - 1, ay = d.ty + 3;
      for (let f = 0; f < 6; f++) {
        const ang = ((-62 + f * 22) * Math.PI) / 180, len = span - Math.abs(f - 1.5) * 1.5;
        for (let k = 0; k <= len; k++) {
          const x = Math.round(ax + s * Math.cos(ang) * k), y = Math.round(ay + Math.sin(ang) * k);
          const w = k < len * 0.3 ? 3 : k < len * 0.8 ? 2 : 1;
          for (let j = 0; j < w; j++) d.u(x, y + j, 1, 1, tint(k / len, f));
        }
      }
    }
  });
  return d;
}

// ---------- Painters ----------
const PAINTERS: Partial<Record<LegendaryArtId, Painter>> = {
  // ----- Red Hair Pirates -----
  shanks: (d) => {
    const { tx, tw, ty, th } = d;
    clawScars(d.wipeScar()).eyes("stern", "#3a2a2a", "#7a1818").mouth("smile");
    strands(d, "#d83a3a"); stubble(d);
    openFront(d, 8, 4, "#c8ccd8");
    d.belt("#5a3a20", gold);
    d.trim("#1a1a22", "#a01818", ty).folds("#1a1a22", d.legY - 2, 4);
    // Gryphon sheathed at his hip, and a sake jug hanging from his hand.
    d.asBody(() => {
      d.line(tx + tw - 4, ty + th - 6, tx + tw + 6, d.bottom - 6, "#1e1e28").line(tx + tw - 3, ty + th - 6, tx + tw + 7, d.bottom - 6, "#3a3a4a");
      d.r(tx + tw - 7, ty + th - 9, 4, 4, gold).r(tx + tw - 10, ty + th - 11, 4, 3, "#5a2a2a");
      const jx = d.rx - 1, jy = d.rhy + 3;
      d.r(jx, jy, 7, 8, ink).r(jx + 1, jy + 1, 5, 6, "#b8462a").r(jx + 1, jy + 1, 2, 5, "#d86a4a").r(jx + 2, jy - 2, 3, 3, "#e8d8b0").r(jx + 1, jy + 3, 5, 1, "#f4e8c8");
    });
  },
  "benn-beckman": (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#3a4a5a", "#6a7484").mouth("line");
    d.f(d.R + 1, d.ey + 2, 1, 4, "#a86a5a").f(d.R + 2, d.ey + 3, 1, 2, "#a86a5a"); // scar under his eye
    stubble(d);
    strands(d, "#b9c4d4");
    d.r(hx + hw - 1, hy + 4, 2, 12, "#9aa6b8").d(hx + hw, hy + 15, "#6a7688"); // slicked-back ponytail
    // Cigarette with a curl of smoke.
    d.r(d.cx + 2, hy + 13, 5, 1, "#f4f4f4").d(d.cx + 7, hy + 13, "#ff7a3a");
    for (let i = 0; i < 7; i++) d.u(d.cx + 8 + ((i >> 1) % 2), hy + 12 - i * 2, 1, 2, i % 2 ? "#b8c0cc" : "#e0e6ee");
    // Black V-neck, navy cloak with pale-blue swirls, a yellow sash, olive trousers.
    openFront(d, 6, 3, "#3a3a44");
    d.recolor("#2e3260", 0, ty, d.W, d.p.height - ty, (x, y) => { const k = (x * 2 + y * 3) % 14; return k === 0 || k === 1 ? "#8ab8e8" : k === 7 ? "#4a5090" : null; });
    d.trim("#2e3260", "#8ab8e8", ty);
    d.r(tx, ty + th - 6, tw, 3, "#e8c040").r(tx, ty + th - 6, tw, 1, "#fff08a").r(tc + 4, ty + th - 3, 2, 5, "#e8c040");
    d.folds("#6a6a40", d.legY, 4);
    // His flintlock rifle held across his body.
    d.asBody(() => {
      d.line(d.lx - 2, d.lhy + 4, d.rx + 13, d.rhy - 19, "#1e1e28").line(d.lx - 2, d.lhy + 3, d.rx + 13, d.rhy - 20, "#5a606a").line(d.lx - 1, d.lhy + 3, d.rx + 14, d.rhy - 20, "#9aa0aa");
      d.line(d.lx - 7, d.lhy + 7, d.lx + 4, d.lhy + 1, "#8a5a2a").line(d.lx - 7, d.lhy + 8, d.lx + 4, d.lhy + 2, "#6a3a1a").line(d.lx - 8, d.lhy + 9, d.lx + 3, d.lhy + 3, "#5a2a10");
      d.r(tc - 1, ty + 9, 3, 2, gold).d(d.rx + 14, d.rhy - 21, "#ffffff");
    });
    shatter(d, d.rx + 17, d.rhy - 23, 3, "#c8d8f0", "#ffffff");
  },
  "lucky-roux": (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("none").mouth("grin");
    // Green striped bandana and round red shades.
    d.recolor("#3a8a3a", hx - 2, hy - 6, hw + 6, 10, (x) => x % 3 === 0 ? "#f2f2f2" : null);
    for (const x of [d.L, d.R]) d.r(x - 1, d.ey - 1, 4, 3, "#c8a050").r(x, d.ey, 2, 1, "#c8202a").d(x, d.ey - 0, "#ff6a6a");
    d.r(d.L + 3, d.ey, d.R - d.L - 3, 1, "#c8a050");
    for (let i = 0; i < 3; i++) d.f(hx + hw - 5 + i, hy + 11 + (i % 2), 1, 1, shade(d.sk, -0.35)); // stubble dots
    // Green-and-white striped shirt with a laced collar.
    d.recolor("#3a8a3a", 0, ty, d.W, d.p.height - ty, (x) => Math.floor((x - tc + 40) / 3) % 3 === 0 ? "#f2f2f2" : null);
    // A huge round belly pushing the striped shirt out past his sides; the stripes bend around it.
    const belly = new Map<string, string>(), bcx = tc - 0.5, bcy = ty + th * 0.5, brx = tw / 2 + 6, bry = th / 2 + 1;
    for (let y = Math.floor(bcy - bry); y <= bcy + bry; y++) for (let x = Math.floor(bcx - brx); x <= bcx + brx; x++) {
      const u = (x - bcx) / brx, v = (y - bcy) / bry, q = u * u + v * v;
      if (q > 1 || y < ty + 3) continue;
      const bend = (x - bcx) / Math.sqrt(Math.max(0.15, 1 - v * v)), white = Math.floor((bend + 40.5) / 3.2) % 3 === 0;
      const lit = u < -0.35 && v < 0.1, dark = q > 0.72 || v > 0.6;
      belly.set(`${x},${y}`, white ? (dark ? "#c8ccc8" : lit ? "#ffffff" : "#eef2ee") : (dark ? "#24642a" : lit ? "#4aa84a" : "#3a8a3a"));
    }
    blob(d, belly, (x) => x >= tx && x < tx + tw);
    d.r(Math.round(bcx) - 1, Math.round(bcy) + 2, 2, 1, "#1e4a22"); // belly button crease in the shirt
    d.r(tc - 1, ty + 1, 2, 7, "#2a6a2a");
    for (let i = 0; i < 3; i++) d.d(tc - 1 + (i % 2), ty + 2 + i * 2, "#ffffff");
    // Teal sash tied under the belly, beige trousers.
    const sy = Math.round(bcy + bry) - 4;
    d.asBody(() => d.r(tx - 3, sy, tw + 6, 3, "#1a6a6a").r(tx - 3, sy, tw + 6, 1, "#3a9a9a").r(tc + 6, sy + 2, 3, 7, "#1a6a6a").d(tc + 6, sy + 8, "#3a9a9a"));
    d.folds("#e0d8c4", d.legY, 4);
    // A yellow cape flowing behind.
    d.recolor("#e8b04a", 0, ty, d.W, d.p.height - ty, (x, y) => (x + y) % 5 === 0 ? "#c88a2a" : null);
    // A huge roast on the bone, a bite taken out of it.
    d.asBody(() => {
      const mx = d.rx + 2, my = d.rhy - 9;
      for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) if (i * i + j * j * 1.3 <= 36) d.r(mx + i, my + j, 1, 1, i + j < -5 ? "#e8964a" : i + j > 5 ? "#7a3a1a" : (i * 3 + j) % 7 === 0 ? "#c86a3a" : "#a8542a");
      d.r(mx + 2, my - 5, 3, 3, "#f08a8a").d(mx + 3, my - 4, "#ffc0c0");
      d.r(mx - 1, my + 6, 3, 7, "#f4ecd8").r(mx - 2, my + 12, 2, 2, "#f4ecd8").r(mx + 1, my + 12, 2, 2, "#f4ecd8");
      d.r(tc - 9, sy - 1, 6, 2, "#3a3a44").r(tc - 9, sy + 1, 2, 3, "#6a4a2a"); // pistol in the sash
    });
    for (let i = 0; i < 3; i++) d.u(d.rx + 4 + i * 3, d.rhy - 20 - (i % 2) * 2, 1, 2, "#e8e0d0"); // steam
  },
  yasopp: (d) => {
    const { hx, hy, hw, ty, th, tx, tw } = d;
    d.eyes("stern", "#5a4a2a").mouth("smirk");
    // Blond dreadlocks hanging under a spotted bandana.
    for (let i = 0; i < 6; i++) { const x = i < 3 ? hx - 3 + i * 2 : hx + hw - 5 + (i - 3) * 2; d.asBody(() => d.r(x, hy + 3, 2, 12 + (i % 2) * 3, i % 2 ? "#b8943c" : "#d8b45c").d(x, hy + 15 + (i % 2) * 3, "#8a6a2a").d(x + 1, hy + 8, "#f0d07a")); }
    strands(d, "#d8b45c");
    d.recolor("#3a5a8a", hx - 2, hy - 6, hw + 6, 10, (x, y) => (x + y) % 4 === 0 ? "#f2f2f2" : null);
    stubble(d);
    // Olive coat, bandolier of cartridges, gold belt.
    d.folds("#5a6a4a", ty + 6, 4).trim("#5a6a4a", "#8a9a6a", ty).belt("#5a3a20", gold, ty + th - 6);
    d.asBody(() => { d.line(tx + 2, ty + 1, tx + tw - 2, ty + th - 4, "#6a4a2a"); for (let k = 0; k < 5; k++) d.d(tx + 3 + Math.round(k * (tw - 4) / 5), ty + 2 + Math.round(k * (th - 5) / 5), gold); });
    // Long rifle up and aimed, a muzzle flash and a target reticle.
    d.asBody(() => {
      const x0 = d.rx, y0 = d.rhy + 2;
      d.line(x0 - 4, y0 + 3, x0 + 14, y0 - 22, "#1e1e28").line(x0 - 3, y0 + 3, x0 + 15, y0 - 22, "#5a5f6a").line(x0 - 2, y0 + 3, x0 + 16, y0 - 22, "#9aa0aa");
      d.r(x0 - 6, y0, 4, 6, "#8a5a2a").r(x0 - 6, y0, 1, 6, "#b07a3a").r(x0 + 3, y0 - 6, 3, 2, gold);
    });
    const fx = d.rx + 16, fy = d.rhy - 22;
    shatter(d, fx + 2, fy - 2, 3, "#ffb03a", "#fff0a0");
    for (let a = 0; a < 16; a++) { const ang = (a / 16) * Math.PI * 2; d.u(Math.round(fx + 8 + Math.cos(ang) * 4), Math.round(fy - 8 + Math.sin(ang) * 4), 1, 1, "#ff6a5a"); }
    d.u(fx + 8, fy - 8, 1, 1, "#ff6a5a");
  },

  // ----- Swordsmen -----
  "kozuki-oden": (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    shimenawa(d, 9);
    d.wipeScar(["beard"]).eyes("glare", "#8a2a1a", "#14141c").mouth("grin");
    // Long wild black hair under a wide, flat black hat.
    strands(d, "#2a2d3a");
    d.asBody(() => {
      for (let i = 0; i < 4; i++) d.u(hx - 3 + i, hy + 4, 1, 14 - i * 2, i % 2 ? "#1e2028" : "#2a2d3a").u(hx + hw - 1 + i, hy + 4, 1, 10 + i * 2, i % 2 ? "#2a2d3a" : "#1e2028");
      d.r(hx - 9, hy - 1, hw + 18, 2, "#1a1e22").r(hx - 8, hy - 1, hw + 16, 1, "#3a4a4a").r(hx - 2, hy - 4, hw + 4, 3, "#1e2228").r(hx - 1, hy - 4, hw + 2, 1, "#4a5a5a");
    });
    d.f(hx + 1, hy + 9, 2, 6, "#2a2d3a").f(hx + hw - 3, hy + 9, 2, 6, "#2a2d3a").f(hx + 2, hy + hh - 2, hw - 4, 2, "#2a2d3a");
    // Open orange kimono with red cross ties over a muscled chest, a navy sash.
    openFront(d, 12, 5);
    muscles(d, 2);
    d.recolor("#ef6d4a", 0, ty, d.W, d.p.height - ty, (x, y) => (x * 3 + y * 2) % 13 === 0 ? "#ff9a6a" : (x - y + 60) % 7 === 0 ? "#c84a2a" : null);
    // Red cross ties over the kimono (not over his chest).
    const tie = (x0: number, x1: number) => d.recolor("#ef6d4a", tx - 2, ty, tw + 4, th - 5, (x, y) => { const k = x - (x0 + ((x1 - x0) * (y - ty)) / (th - 6)); return Math.abs(k) < 1 ? "#e8404a" : Math.abs(k) < 2 ? "#a81a24" : null; });
    tie(tx + 1, tx + tw - 2); tie(tx + tw - 2, tx + 1);
    d.r(tx + 3, ty + 3, 2, 2, "#ffffff").r(tx + tw - 5, ty + 3, 2, 2, "#ffffff"); // Kozuki crests
    d.r(tx, ty + th - 6, tw, 3, "#3a3a8a").r(tx, ty + th - 6, tw, 1, "#5a5ab8");
    d.r(tc - 2, d.bottom - 1, 4, 1, "#e8d8a8");
    // Enma (purple hilt) and Ame no Habakiri (white hilt), held out wide.
    sword(d, d.lx + 1, d.lhy, d.lx - 13, d.lhy - 25, { grip: "#6a3aa8", guard: gold });
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 12, d.rhy - 25, { grip: "#f2f2f2", guard: "#c8a050" });
    d.sparkle(d.lx - 13, d.lhy - 25, "#ffe0a0").sparkle(d.rx + d.aw + 12, d.rhy - 25, "#ffe0a0");
    for (let i = 0; i < 3; i++) d.u(cx - 9 + i * 8, d.bottom - 1, 3, 1, "#c8a870"); // geta
  },
  vista: (d) => {
    const { hx, hy, hw, cx, ty, tx, tw, th } = d;
    d.eyes("stern", "#3a2a2a").mouth("smile");
    // A grand curled moustache.
    const st = new Map<string, string>();
    for (const s of [-1, 1]) stroke(st, 18, (t) => [cx - 0.5 + s * (1 + 8 * t), hy + 12 - 5 * Math.sin(t * Math.PI * 0.95)], (t) => 2.2 - t * 1.4, () => "#1e1e28");
    blob(d, st);
    d.r(hx - 1, hy - 2, hw + 2, 2, "#c8283a").r(hx - 1, hy - 2, hw + 2, 1, "#ff5a6a"); // red hat band
    d.r(hx + hw - 4, hy - 5, 3, 3, "#ff8cae").d(hx + hw - 3, hy - 4, "#ffd0e0"); // a rose in the band
    // Dark coat over a white shirt with a frilled cravat, gold buttons.
    d.suit(SHIRT, undefined, "#c8ccd8");
    for (let i = 0; i < 5; i++) d.r(d.tc - 2 - (i % 2), ty + 2 + i, 4 + (i % 2) * 2, 1, i % 2 ? "#f4c0d0" : "#ffffff");
    d.r(tx + 1, ty + th - 6, tw - 2, 2, "#5a2a3a").r(d.tc - 1, ty + th - 7, 3, 4, gold);
    d.folds("#3a3f52", d.legY, 3);
    // Two sabres in a storm of petals.
    sword(d, d.lx + 1, d.lhy, d.lx - 9, d.lhy - 23, { guard: gold, grip: "#5a2a3a", edge: "#ffe8f0" });
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 8, d.rhy - 23, { guard: gold, grip: "#5a2a3a", edge: "#ffe8f0" });
    const petals: [number, number][] = [[d.lx - 11, d.lhy - 14], [d.lx - 4, d.lhy - 27], [d.rx + 13, d.rhy - 12], [d.rx + 8, d.rhy - 28], [d.lx - 13, d.lhy - 4], [d.rx + 15, d.rhy - 2], [tx - 4, ty - 6], [tx + tw + 4, ty - 8], [d.lx - 8, d.lhy + 6], [d.rx + 10, d.rhy + 6]];
    petals.forEach(([x, y], i) => d.u(x, y, 2, 1, i % 3 ? "#ff8cae" : "#ff5a8a").u(x + 1, y + 1, 1, 1, "#ffd0e0").u(x - 1, y + 1, 1, 1, "#d84a7a"));
  },
  vergo: (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    const BODY = "#2a2236", GLOSS = "#7a4ab8", RIM = "#b88ae8", SPEC = "#f4dcff", DEEP = "#120e18";
    // Head: hardened like the rest of him, lit from the upper left, with a rim of violet light.
    d.recolor(BODY, hx, hy, hw, hh + 2, (x, y) => (x === hx + 1 || y === hy + 1) ? RIM : (x === hx + hw - 2 ? GLOSS : null));
    d.r(hx + 2, hy + 2, 3, 2, shade(BODY, 0.35)).d(hx + 2, hy + 2, SPEC);
    d.recolor("#16121c", hx - 4, hy - 10, hw + 8, 12, (x, y) => (x + y * 2) % 9 === 0 ? "#3a3048" : null); // close-cropped black hair
    // Sunglasses with a teal glint, a straight nose and a hard, flat mouth.
    d.eyes("none").mouth("none");
    for (const x of [d.L - 1, d.R]) d.r(x, d.ey - 1, 5, 3, "#060508").r(x + 1, d.ey - 1, 2, 1, "#5ae0d0").d(x + 3, d.ey + 1, "#2e8a80");
    d.r(d.L + 4, d.ey - 1, d.R - d.L - 4, 1, "#060508");
    d.r(cx, d.ey + 2, 1, 3, GLOSS).d(cx + 1, d.ey + 4, DEEP);
    d.r(cx - 3, d.ey + 7, 7, 1, DEEP).r(cx - 2, d.ey + 8, 5, 1, GLOSS);
    // Short beard around the jaw.
    d.f(hx + 1, hy + hh - 6, 2, 6, DEEP).f(hx + hw - 3, hy + hh - 6, 2, 6, DEEP).f(hx + 2, hy + hh - 1, hw - 4, 3, DEEP);
    for (let i = 0; i < hw - 4; i += 2) d.d(hx + 2 + i, hy + hh, "#3a2e4a");
    // Full-body Armament Haki: glossy black-violet muscle, outlined in purple like hardened steel.
    const half = Math.min(8, tw / 2 - 1);
    for (let i = 0; i <= half; i++) { const y = ty + 7 - Math.round(2 * Math.sin((i / half) * Math.PI)); d.d(tc - 1 - i, y, GLOSS).d(tc + i, y, GLOSS); } // pecs
    d.r(tc - half, ty + 2, 3, 1, RIM).r(tc + half - 3, ty + 2, 3, 1, RIM).d(tc - half + 1, ty + 3, SPEC).d(tc + half - 2, ty + 3, SPEC);
    d.r(tc, ty + 3, 1, th - 9, GLOSS); // centre line
    for (let r = 0; r < 3; r++) { const y = ty + 10 + r * 3; d.r(tc - 4, y, 3, 1, GLOSS).r(tc + 2, y, 3, 1, GLOSS).d(tc - 3, y + 1, SPEC).d(tc + 3, y + 1, shade(BODY, 0.4)); }
    d.line(tx + 1, ty + 9, tc - 5, ty + th - 6, GLOSS).line(tx + tw - 2, ty + 9, tc + 5, ty + th - 6, GLOSS); // obliques
    for (const s of [-1, 1]) {
      const ax = s < 0 ? d.lx : d.rx, ah = (s < 0 ? d.lhy : d.rhy) - ty;
      d.recolor(BODY, ax, ty + 1, 1, ah, () => RIM).recolor(BODY, ax + d.aw - 1, ty + 1, 1, ah, () => GLOSS);
      d.r(ax + 1, ty + 5, d.aw - 2, 1, GLOSS).d(ax + 1, ty + 3, SPEC).r(ax + 1, ty + Math.round(ah * 0.6), d.aw - 2, 1, GLOSS);
    }
    d.recolor(BODY, tx - 1, ty, 1, th - 5, () => RIM).recolor(BODY, tx + tw, ty, 1, th - 5, () => GLOSS);
    // White trousers and a brown belt with a brass buckle.
    d.folds("#e2e0da", d.legY, 4).belt("#6a4a2a", "#c8a050", ty + th - 4);
    // His bamboo stick resting behind his shoulder, coated in Haki at the top.
    d.asBody(() => {
      const x0 = d.lx - 4, y0 = d.bottom - 6, x1 = d.lx + 6, y1 = hy - 6;
      d.line(x0 - 1, y0, x1 - 1, y1, "#1e2a14").line(x0, y0, x1, y1, "#5a8a3a").line(x0 + 1, y0, x1 + 1, y1, "#8ab85a").line(x0 + 2, y0, x1 + 2, y1, "#1e2a14");
      for (let k = 1; k < 6; k++) { const t = k / 6, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t); d.r(x - 1, y, 4, 1, "#2e4a1e"); }
      for (let k = 0; k < 10; k++) { const t = k / 36, x = Math.round(x1 + (x0 - x1) * t), y = Math.round(y1 + (y0 - y1) * t); d.r(x - 1, y, 4, 1, k % 3 ? BODY : GLOSS); }
    });
  },
  "killer-onigashima": (d) => {
    const { hx, hy, hw, hh, cx, ty, tx, tw, th, tc } = d;
    // A huge wild blond mane flowing behind.
    d.asBody(() => {
      for (let i = 0; i < 6; i++) { d.u(hx - 6 + i, hy - 2 + i, 1, 22 - i, i % 2 ? "#d8b860" : "#f0d888"); d.u(hx + hw + 5 - i, hy - 2 + i, 1, 24 - i, i % 2 ? "#f0d888" : "#c8a850"); }
      for (let i = 0; i < hw + 8; i += 2) d.u(hx - 4 + i, hy - 5 + (i % 4 === 0 ? -1 : 0), 2, 6, i % 4 ? "#f0d888" : "#d8b860");
    });
    strands(d, "#f0d888");
    // The blue-and-white striped mask, dotted with breathing holes.
    d.eyes("none").mouth("none");
    d.asBody(() => {
      d.r(hx, hy - 2, hw, hh + 3, "#f4f8ff");
      for (let x = hx + 1; x < hx + hw - 1; x += 4) d.r(x, hy - 2, 2, hh + 3, "#3a7ad8");
      for (let y = hy; y < hy + hh; y += 3) for (let x = hx + 1 + ((y >> 1) % 2); x < hx + hw - 1; x += 3) d.d(x, y, "#1e2230");
      d.r(hx, hy - 2, 1, hh + 3, "#c8d4e8").r(hx + hw - 1, hy - 2, 1, hh + 3, "#8a9ab8").r(cx - 3, hy + hh - 2, 6, 1, "#c8d4e8");
      d.r(hx + hw - 2, hy + 6, 3, 3, "#8a94a4").d(hx + hw - 1, hy + 7, "#e8eef4"); // hinge bolt
    });
    // Blue t-shirt over a muscled frame, a pale-blue sash, jeans, brown shoes.
    d.recolor("#2a5ab8", 0, ty, d.W, th, (x, y) => (x + y * 2) % 9 === 0 ? "#4a7ad8" : null).trim("#2a5ab8", "#6a9ae8", ty);
    d.r(tc - 3, ty, 6, 2, d.sk);
    d.r(tx, ty + th - 6, tw, 3, "#8ac8f0").r(tx, ty + th - 6, tw, 1, "#c8e8ff").r(tc + 4, ty + th - 3, 4, 7, "#8ac8f0");
    d.folds("#5a8ac8", d.legY, 3).recolor("#5a8ac8", 0, d.legY, d.W, d.legH + 4, (x, y) => (x * 2 + y) % 7 === 0 ? "#8ab8e8" : null);
    // Punisher: long curved scythe blades out of both wrists.
    for (const [x, y, s] of [[d.lx - 1, d.lhy, -1], [d.rx + d.aw, d.rhy, 1]] as [number, number, number][]) {
      d.asBody(() => {
        d.r(x - (s < 0 ? 3 : 0), y - 2, 4, 4, "#4a4f5a").r(x - (s < 0 ? 2 : -1), y - 1, 2, 2, "#8a94a4");
        const blade = new Map<string, string>();
        stroke(blade, 26, (t) => [x + s * (2 + 16 * t), y + 4 - 14 * Math.sin(t * Math.PI * 0.7) + 6 * t], (t) => 3 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 1, (t, j, w) => j === w - 1 ? "#ffffff" : j === 0 ? "#5a6474" : "#c8d2e0");
        blob(d, blade);
      });
    }
  },

  // ----- Whitebeard Pirates -----
  whitebeard: (d) => {
    const { cx, hy, hx, hw, tc, ty, tx, tw, th } = d;
    d.wipeScar(["crescent"]).eyes("glare", "#ffcf4a", shade(d.sk, -0.4)).mouth("none");
    d.clear(hx - 3, hy + 4, 3, 8).clear(hx + hw, hy + 4, 3, 8);
    const stache = new Map<string, string>();
    for (const s of [-1, 1]) stroke(stache, 30, (t) => [cx - (s < 0 ? 1 : 0) + s * (1 + 11 * t), hy + 13 - 8 * t ** 3], (t) => 2 * (1 - t) + 0.8, (t, j) => j === 0 ? "#d8e0ea" : "#ffffff");
    blob(d, stache);
    strands(d, "#f0e2b0");
    // Scarred bare chest, captain's coat over the shoulders, blue sash.
    bareTorso(d, "#f2f2f2", 2);
    for (const [x0, y0, x1, y1] of [[tc - 7, ty + 3, tc - 2, ty + 9], [tc + 5, ty + 4, tc + 1, ty + 11]]) d.line(x0, y0, x1, y1, "#b06a5a");
    d.trim("#f4f4f8", "#9aa8c8", ty).folds("#f4f4f8", d.legY - 2, 4);
    d.asBody(() => d.r(tx - 3, ty - 3, 4, 4, "#f4f4f8").r(tx + tw - 1, ty - 3, 4, 4, "#f4f4f8"));
    d.r(tx + 1, ty + th - 7, tw - 2, 4, "#3a5aa8").r(tx + 1, ty + th - 7, tw - 2, 1, "#6a8ad8");
    // Murakumogiri.
    const x = Math.min(d.rx + d.aw, d.W - 8), top = hy - 14;
    d.asBody(() => {
      d.r(x, top + 10, 3, d.bottom - top - 10, ink).r(x + 1, top + 11, 1, d.bottom - top - 12, "#8a6a4a");
      const blade = new Map<string, string>();
      stroke(blade, 26, (t) => [x + 1 - 6 * Math.sin(t * 1.7), top + 12 - 12 * t], (t) => 5 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 1, (t, j, w) => j === w - 1 ? "#ffffff" : j === 0 ? "#8a98b0" : "#d8e2f0");
      blob(d, blade);
      d.r(x - 1, top + 10, 5, 3, gold).r(x - 1, top + 13, 5, 1, GOLD_D);
    });
  },
  marco: (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    // Phoenix wings first, so everything else sits on top: layered blue flame with gold licks.
    wings(d, (t, f) => t > 0.86 ? "#fff4a0" : t > 0.5 && (f + Math.round(t * 6)) % 5 === 0 ? "#ffd84a" : t > 0.62 ? "#7ae8ff" : f % 2 ? "#1a8ad8" : "#3ac8ff", 17);
    d.eyes("stern", "#2a4a6a", "#a8883a").mouth("smirk");
    for (const x of [d.L, d.R]) d.f(x, d.ey, 3, 1, shade(d.sk, -0.4)); // heavy-lidded
    stubble(d);
    // Pineapple hair: a spiky blond crest.
    strands(d, "#f0d070");
    d.asBody(() => { for (let i = 0; i < 4; i++) d.r(hx + 4 + i * 3, hy - 6 - (i % 2) * 2, 2, 4, i % 2 ? "#f8e08a" : "#d8b048"); });
    // Open purple shirt over the Whitebeard tattoo, a sash of gold beads.
    openFront(d, 14, 6, "#d8b8f0");
    muscles(d, 2);
    const tat = "#2a3a8a";
    d.r(tc - 1, ty + 4, 2, 9, tat).r(tc - 4, ty + 7, 8, 2, tat).d(tc - 4, ty + 6, tat).d(tc + 3, ty + 6, tat).r(tc - 3, ty + 4, 1, 2, tat).r(tc + 2, ty + 4, 1, 2, tat);
    d.r(tx, ty + th - 6, tw, 3, "#e8f8ff").r(tx, ty + th - 6, tw, 1, "#ffffff");
    for (let x = tx - 2; x < tx + tw + 2; x += 3) d.r(x, ty + th - 3, 2, 2, gold).d(x, ty + th - 3, "#fff0a0");
    d.folds("#1e3a3a", d.legY, 4);
    // Blue flame wreathing his hands and feet.
    fire(d, d.lx - 1, d.lhy + 1, 7, "#1a8ad8", "#4ad0ff", "#fff4a0");
    fire(d, d.rx + d.aw, d.rhy + 1, 7, "#1a8ad8", "#4ad0ff", "#fff4a0");
    for (const fx of [d.legX - 2, d.legX + d.gap + 8]) fire(d, fx, d.bottom, 6, "#1a8ad8", "#4ad0ff", "#fff4a0");
    for (const [x, y] of [[tx - 12, ty - 10], [tx + tw + 12, ty - 12], [tx - 8, ty + 14], [tx + tw + 9, ty + 16]]) d.u(x, y, 2, 2, "#ffd84a").u(x, y, 1, 1, "#fff4a0");
  },
  jozu: (d) => {
    const { hx, hy, hw, tc, ty, th } = d;
    d.eyes("glare", "#3a5a7a").mouth("line");
    d.f(hx + 1, hy + 4, 2, 8, "#2a2d3a").f(hx + hw - 3, hy + 4, 2, 8, "#2a2d3a"); // sideburns
    d.r(hx + 3, hy + 1, 4, 1, shade(d.sk, 0.4)).d(hx + 4, hy + 2, white);
    // Diamond body: hard facets with bright edges, prism glints and refracted colours.
    facets(d, "#c9e8ff");
    d.recolor("#c9e8ff", 0, ty, d.W, d.p.height - ty, (x, y) => (x * 2 - y + 80) % 11 === 0 ? "#ffd0f0" : (x + y * 2) % 13 === 0 ? "#b0fff0" : null);
    for (let i = 0; i < 4; i++) d.line(tc - 8 + i * 5, ty + 2, tc - 10 + i * 5, ty + th - 6, "#8ab8e0");
    d.belt("#2a2d3a", "#c9e8ff", ty + th - 6);
    // Diamond shoulder spikes catching the light.
    d.asBody(() => { for (const [x, s] of [[d.lx, -1], [d.rx + d.aw - 1, 1]] as [number, number][]) for (let k = 0; k < 5; k++) d.r(x + s * k, ty - 1 - k, 2, 1, k > 2 ? "#ffffff" : "#a8d8ff"); });
    for (const [x, y] of [[d.lx - 6, d.lhy - 10], [d.rx + d.aw + 5, d.rhy - 14], [tc, ty - 18], [d.lx - 2, d.lhy + 6]]) d.sparkle(x, y, "#e0f4ff");
  },
  "edward-weevil": (d) => {
    const { cx, hy, hx, hw, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a").mouth("none");
    d.clear(hx - 3, hy + 4, 3, 8).clear(hx + hw, hy + 4, 3, 8);
    const stache = new Map<string, string>();
    for (const s of [-1, 1]) stroke(stache, 30, (t) => [cx - (s < 0 ? 1 : 0) + s * (1 + 11 * t), hy + 13 - 8 * t ** 3], (t) => 2 * (1 - t) + 0.8, (t, j) => j === 0 ? "#c8bc98" : "#f8f0d8");
    blob(d, stache);
    strands(d, "#e8dcc0");
    // A big round belly in an open white shirt, a bandana-sash, chains.
    openFront(d, 16, 6, "#c8ccd8");
    d.r(tc - 1, ty + 12, 2, 2, shade(d.sk, -0.4));
    for (let i = 0; i < 6; i++) d.d(tc - 6 + i * 2, ty + 2 + (i % 2), gold);
    d.folds("#3a3f52", d.legY, 4).r(tx + 1, ty + th - 5, tw - 2, 3, "#8a3a2a").r(tx + 1, ty + th - 5, tw - 2, 1, "#c85a4a");
    // His father's bisento, cracking the air with a quake.
    const x = Math.min(d.rx + d.aw, d.W - 8), top = hy - 14;
    d.asBody(() => {
      d.r(x, top + 10, 3, d.bottom - top - 10, ink).r(x + 1, top + 11, 1, d.bottom - top - 12, "#6a4a2a");
      const blade = new Map<string, string>();
      stroke(blade, 24, (t) => [x + 1 - 6 * Math.sin(t * 1.7), top + 12 - 12 * t], (t) => 5 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 1, (t, j, w) => j === w - 1 ? "#ffffff" : j === 0 ? "#8a98b0" : "#d0dae8");
      blob(d, blade);
      d.r(x - 1, top + 10, 5, 2, gold).r(x + 3, top + 12, 2, 6, "#c82a3a");
    });
    shatter(d, d.lx - 6, d.lhy - 4, 4, "#c8e8ff", "#ffffff");
  },

  // ----- Beasts Pirates -----
  king: (d) => {
    const { hx, hy, hw, cx, ty, tx, tw, th } = d;
    // Lunarian fire blazing behind his head, then huge black wings.
    for (let i = 0; i < 5; i++) fire(d, hx - 2 + i * ((hw + 4) / 4), hy + 4, 12 + (i % 2 ? 4 : 0) - Math.abs(i - 2) * 2, "#c83a1a", "#ff8a2a", "#ffe08a");
    wings(d, (t, f) => t > 0.88 ? "#4a4a62" : (f + Math.round(t * 8)) % 3 === 0 ? "#2a2a3a" : f % 2 ? "#14141e" : "#1e1e2a", 18);
    // Spiked black mask with round blue eyes and a long spiked snout.
    d.eyes("none").mouth("none");
    d.recolor("#2a2d3a", hx - 2, hy - 2, hw + 4, d.hh + 4, (x, y) => (x + y) % 5 === 0 ? "#3a3a4a" : null);
    d.asBody(() => {
      d.r(cx - 1, hy - 8, 2, 6, "#1a1a22").d(cx - 1, hy - 8, "#5a5a6a");
      for (const s of [-1, 1]) d.r(s < 0 ? hx - 5 : hx + hw + 1, hy + 4, 4, 2, "#1a1a22").d(s < 0 ? hx - 5 : hx + hw + 4, hy + 4, "#5a5a6a");
      d.r(cx - 2, hy + 8, 4, 8, "#1a1a22").r(cx - 1, hy + 8, 1, 7, "#4a4a5a");
    });
    for (const x of [d.L, d.R]) d.r(x - 1, d.ey - 1, 4, 4, "#0e0e14").r(x, d.ey, 2, 2, "#5ac8ff").d(x, d.ey, white);
    for (let i = 0; i < 4; i++) d.d(hx + 2 + i * 4, hy + 2, "#8a8aa0"); // studs
    // White ruff, dark purple double-breasted coat: gold buttons, studs, skull patches.
    d.asBody(() => d.r(cx - 5, ty - 1, 10, 3, "#f2f2f2").r(cx - 4, ty - 1, 8, 1, "#ffffff"));
    d.recolor("#2e2840", tx - 6, ty, tw + 12, d.p.height - ty, (x, y) => (x + y * 3) % 9 === 0 ? "#4a4060" : null);
    for (let r = 0; r < 4; r++) for (const s of [-1, 1]) d.r(d.tc + s * 3 - (s < 0 ? 1 : 0), ty + 5 + r * 3, 2, 2, "#e8d8a8").d(d.tc + s * 3 - (s < 0 ? 1 : 0), ty + 5 + r * 3, "#fff8d8");
    for (const x of [tx + 2, tx + tw - 5]) d.r(x, ty + 2, 3, 3, "#c84a3a").r(x, ty + 2, 3, 2, "#f2f2f2").d(x + 1, ty + 3, ink);
    d.trim("#2e2840", "#8a80b0", ty);
    for (let y = ty + 2; y < d.bottom - 2; y += 3) d.d(tx, y, "#c8c8d8").d(tx + tw - 1, y, "#c8c8d8");
    // Orange-sheathed katana drawn.
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 10, d.rhy - 25, { grip: "#e87a2a", guard: gold });
    d.asBody(() => d.line(tx + 2, ty + th - 2, tx - 8, d.bottom - 2, "#d8662a").line(tx + 3, ty + th - 2, tx - 7, d.bottom - 2, "#ff9a4a"));
  },
  queen: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.wipeScar(["shades"]).eyes("glare", "#3a2a1a", "#a88a2a").mouth("grin");
    // Blond braids looped around the head, a long drooping moustache.
    strands(d, "#f0c840");
    d.asBody(() => { for (let i = 0; i < hw + 6; i += 2) d.r(hx - 3 + i, hy - 3 - (i % 4 === 0 ? 1 : 0), 2, 3, i % 4 ? "#f8d860" : "#c89a20"); });
    for (const s of [-1, 1]) d.line(cx + s, hy + 11, cx + s * 5, hy + 18, "#f0c840").line(cx + s * 2, hy + 11, cx + s * 6, hy + 18, "#c89a20");
    d.f(cx - 5, hy + 11, 10, 1, "#c89a20");
    // Bare shoulders and the black-and-white striped overalls with yellow buckles.
    d.recolor("#f2f2f2", 0, ty, d.W, d.p.height - ty, (x) => Math.floor((x - tc + 40) / 4) % 2 === 0 ? "#1e1e28" : null);
    d.r(tx + 1, ty, tw - 2, 5, d.sk).r(tc - 4, ty + 3, 8, 2, shade(d.sk, -0.2));
    for (const x of [tx + 3, tx + tw - 6]) d.r(x, ty, 3, 6, "#1e1e28").r(x, ty + 5, 3, 3, "#f0c040").d(x + 1, ty + 6, "#8a6a10");
    d.line(tc - 2, ty + 1, tc + 2, ty + 4, "#a85a4a"); // stitched scar
    // "QUEEN" tattoo on his bare arm, and the cyborg arm with a gun barrel.
    d.f(d.lx, ty + 3, d.aw, 2, "#2a2a4a");
    d.asBody(() => {
      d.recolor(d.sk, d.rx, ty, d.aw + 1, d.rhy - ty + 3, (x, y) => (y % 3 === 0) ? "#8a94a4" : (x + y) % 2 ? "#c0c8d4" : "#e8eef4");
      d.r(d.rx - 1, d.rhy - 2, d.aw + 3, 5, "#5a6474").r(d.rx, d.rhy - 1, d.aw + 1, 3, "#8a94a4").r(d.rx + d.aw + 2, d.rhy, 6, 2, "#3a3f4a").d(d.rx + d.aw + 7, d.rhy, "#ff4a4a");
      d.r(d.rx, d.rhy + 3, d.aw + 1, 3, "#e8783a");
    });
    d.u(d.rx + d.aw + 9, d.rhy - 1, 2, 2, "#ffb04a").u(d.rx + d.aw + 11, d.rhy - 2, 1, 1, "#fff0a0");
  },
  jack: (d) => {
    const { hx, hy, hw, ty, th } = d;
    d.eyes("glare", "#ff6a2a", "#3a2a1a").mouth("none");
    strands(d, "#e8e0d0");
    // Mammoth-tusk face mask with stitching, curved ivory tusks.
    d.recolor("#5a4a3a", hx, hy, hw, d.hh + 2, (x, y) => (x + y) % 4 === 0 ? "#3a2a1a" : (x * 2 + y) % 7 === 0 ? "#7a6a5a" : null);
    d.r(hx + 2, hy + 7, hw - 4, 1, "#c8b898");
    d.asBody(() => {
      for (const s of [-1, 1]) { const x0 = s < 0 ? hx + 2 : hx + hw - 4; for (let i = 0; i < 10; i++) d.r(x0 + s * Math.floor(i / 2) + (i > 6 ? -s * (i - 6) : 0), hy + 12 + i, 3 - (i > 7 ? 1 : 0), 1, i > 7 ? "#ffffff" : "#f4f0e0"); }
    });
    // Shaggy fur vest over a scarred, muscled chest.
    openFront(d, 13, 5);
    muscles(d, 3);
    d.line(d.tc - 5, ty + 4, d.tc + 4, ty + 12, "#a85a4a");
    d.recolor("#8f7a6a", 0, ty, d.W, th + 2, (x, y) => (x * 2 + y) % 5 === 0 ? "#6a5444" : (x + y * 3) % 7 === 0 ? "#c8b4a0" : null).trim("#8f7a6a", "#5a4434", ty);
    d.belt("#3a2a1a", gold);
    // Two hooked blades, with motion streaks.
    for (const [x, y, s] of [[d.lx, d.lhy, -1], [d.rx + d.aw - 1, d.rhy, 1]] as [number, number, number][]) {
      d.asBody(() => {
        d.line(x, y, x + s * 3, y - 16, "#e8eef8").line(x + s, y, x + s * 4, y - 16, "#8a94a4").line(x + s * 2, y, x + s * 5, y - 16, "#5a6474");
        d.line(x + s * 3, y - 16, x + s * 9, y - 18, "#ffffff").line(x + s * 9, y - 18, x + s * 10, y - 13, "#e8eef8").line(x + s * 4, y - 15, x + s * 9, y - 17, "#8a94a4");
        d.r(x - 1, y - 1, 3, 5, "#3a2a1a").d(x, y, gold);
      });
      for (let k = 0; k < 3; k++) d.u(x + s * (12 + k), y - 16 + k * 3, 1, 3, "#c8d8e8");
    }
  },

  yamato: (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    shimenawa(d, 7);
    d.eyes("glare", "#ff8a1a", "#a8b8d0").mouth("smile");
    // Long white hair fading to teal at the tips, red horns with a bright edge.
    strands(d, "#e8eef8");
    d.recolor("#e8eef8", 0, hy + 8, d.W, 24, (x, y) => y > hy + 16 ? ((x + y) % 3 === 0 ? "#3ab8a8" : "#7ad8c8") : null);
    d.recolor("#e85a4a", hx - 4, hy - 12, hw + 8, 12, (x, y) => y % 3 === 0 ? "#ff9a7a" : (x + y) % 4 === 0 ? "#a82a2a" : null);
    // Sleeveless white kimono, the rope belt with paper streamers, red hakama.
    d.folds("#f2f2f2", ty + 4, 5).trim("#f2f2f2", "#c8d0e0", ty);
    d.r(tc - 1, ty + 1, 2, 6, "#c8d0e0");
    d.asBody(() => {
      for (let x = tx - 1; x < tx + tw + 1; x++) d.r(x, ty + th - 7 + ((x >> 1) % 2), 1, 3, (x >> 1) % 2 ? "#f4f4f8" : "#6a4ac8");
      for (const x of [tc - 4, tc + 2]) d.r(x, ty + th - 4, 2, 5, "#ffffff").d(x + 1, ty + th, "#c8ccd8").r(x, ty + th + 1, 2, 2, "#ffffff");
    });
    d.folds("#d84040", d.legY - 2, 3).recolor("#d84040", 0, d.legY, d.W, d.legH + 4, (x, y) => (x + y) % 6 === 0 ? "#ff6a5a" : null);
    // Takeru, the black kanabo, held upright, crackling with ice-white haki.
    const x = d.rx + d.aw + 1;
    d.asBody(() => {
      d.r(x - 1, d.rhy - 2, 4, 10, ink).r(x, d.rhy - 1, 2, 8, "#3a2a2a");
      d.r(x - 3, hy - 12, 8, d.rhy - hy + 10, ink).r(x - 2, hy - 11, 6, d.rhy - hy + 8, "#2a2d3a").r(x - 2, hy - 11, 1, d.rhy - hy + 8, "#5a6074");
      for (let y = hy - 9; y < d.rhy - 2; y += 4) d.r(x - 4, y, 2, 2, "#c8ccd8").r(x + 4, y + 2, 2, 2, "#c8ccd8").d(x - 4, y, white);
      d.r(x - 2, d.rhy - 3, 6, 2, gold);
    });
    d.bolt(x + 7, hy - 6, 1, 8, "#bfe8ff", "#5ab8e8").bolt(x - 6, hy, -1, 6, "#bfe8ff", "#5ab8e8");
  },

  // ----- Big Mom Pirates -----
  katakuri: (d) => {
    const { hx, hy, hw, ty, tx, tw, th } = d;
    d.wipeScar(["xscar"]).eyes("glare", "#b4386b", "#5a1a34").mouth("none");
    strands(d, "#b4386b");
    d.asBody(() => { for (let i = 0; i < hw; i += 3) d.r(hx + i, hy - 3 - (i % 2), 2, 3, i % 2 ? "#d84a8a" : "#8a2a5a"); });
    // Spiked fur scarf over his mouth.
    d.recolor("#e0d0c0", hx - 2, hy + 6, hw + 8, 14, (x, y) => (x + y) % 3 === 0 ? "#b8a890" : (x * 2 + y) % 5 === 0 ? "#fff8ec" : null);
    d.asBody(() => { for (let i = -2; i < hw + 2; i += 3) d.r(hx + i, hy + 8, 2, 2, "#fff8ec").d(hx + i, hy + 7, "#ffffff"); });
    // Studded leather jacket with spiked shoulders.
    d.recolor("#3a2a3a", tx, ty, tw, th, (x, y) => (x % 4 === 0 && y % 4 === 0) ? "#c8ccd8" : (x + y) % 7 === 0 ? "#5a3a5a" : null).trim("#3a2a3a", "#8a5a8a", ty);
    d.asBody(() => { for (const x0 of [d.lx - 1, d.rx]) for (let k = 0; k < 3; k++) d.r(x0 + k * 2 - 1, ty - 2 - (k % 2), 1, 3, "#e8eef4"); });
    d.belt("#1a1a22", "#c8ccd8");
    // Mogura, the mochi trident, with mochi oozing off his fist.
    const x = d.rx + d.aw + 1;
    pole(d, x, hy - 8, d.bottom - 2, "#f4f0ec");
    d.asBody(() => {
      d.r(x - 5, hy - 9, 12, 3, "#f4f0ec").r(x - 5, hy - 9, 12, 1, "#ffffff");
      for (const ox of [-5, 0, 5]) d.r(x + ox, hy - 17, 2, 8, "#ffffff").d(x + ox, hy - 18, "#ffd8e8").d(x + ox + 1, hy - 17, "#d8d0cc");
    });
    for (const [mx, my, r] of [[d.lx - 2, d.lhy + 4, 2], [d.lx + 1, d.lhy + 8, 1], [d.lx - 5, d.lhy + 1, 1]] as [number, number, number][]) d.orb(mx, my, r, "#fff8f4");
    // Future sight: a faint after-image echo of his eyes.
    for (const ex of [d.L - 6, d.R + 6]) d.u(ex, d.ey, 3, 1, "#ff6aa8").u(ex + 1, d.ey + 1, 1, 1, "#ffb0d0");
  },

  // ----- Marines -----
  aokiji: (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#2a3a5a").mouth("line");
    for (const x of [d.L, d.R]) d.f(x, d.ey, 3, 1, shade(d.sk, -0.4));
    // Tight black curls with the green sleep mask pushed up.
    strands(d, "#2a2d3a");
    d.recolor("#2a2d3a", hx - 4, hy - 8, hw + 8, 10, (x, y) => (x + y) % 3 === 0 ? "#4a4e5e" : null);
    d.r(hx, hy - 1, hw, 3, "#4a8a3a").r(hx + 2, hy, 4, 1, "#ffffff").r(hx + hw - 6, hy, 4, 1, "#ffffff").d(hx + 3, hy, ink).d(hx + hw - 4, hy, ink);
    // White vest suit, purple shirt and a yellow tie.
    d.suit("#7a4aa8", "#f0d040", "#c8ccd8").folds("#e4e6ee", ty + 6, 4);
    d.r(tc - 6, ty + th - 6, 1, 3, "#c8ccd8").r(tc + 5, ty + th - 6, 1, 3, "#c8ccd8");
    marineCoat(d, MARINE, "#a8d8f0", true);
    // Ice Age: frost climbing his arm, ice crystals at his feet, cold mist.
    d.recolor(d.sk, d.lx - 1, d.lhy - 4, d.aw + 2, 8, (x, y) => (x + y) % 2 ? "#c8f0ff" : "#ffffff");
    d.recolor(MARINE, d.lx - 2, d.lhy - 8, d.aw + 4, 6, (x, y) => (x + y) % 3 === 0 ? "#a8e8ff" : null);
    for (let i = 0; i < 7; i++) { const x = d.legX - 12 + i * 5, h = 4 + (i % 3) * 3; for (let j = 0; j < h; j++) d.u(x + (j > h / 2 ? 1 : 0), d.bottom - j, j < h - 1 ? 2 : 1, 1, j % 3 === 0 ? "#ffffff" : j % 3 === 1 ? "#a8e8ff" : "#6ac0f0"); }
    wisps(d, [[d.lx - 4, d.lhy - 4, 2], [d.lx - 7, d.lhy - 10, 2], [d.lx - 3, d.lhy - 16, 1]], "#e0f8ff");
    for (const [x, y] of [[tx - 8, ty - 6], [tx + tw + 7, ty + 2], [d.lx - 9, d.lhy + 4]]) d.sparkle(x, y, "#c8f0ff");
  },
  kizaru: (d) => {
    const { hx, hy, hw, tc, ty, tx, tw } = d;
    d.wipeScar(["shades"]).eyes("none").mouth("smirk");
    // Orange-tinted shades with a glint, slick black hair.
    for (const x of [d.L - 1, d.R]) d.r(x, d.ey - 1, 5, 3, "#e8782a").r(x + 1, d.ey - 1, 2, 1, "#ffc890").d(x + 3, d.ey + 1, "#a84a10");
    d.r(d.L + 4, d.ey, d.R - d.L - 4, 1, "#3a2a1a");
    strands(d, "#2a2d3a");
    d.f(hx + 2, hy + 14, hw - 4, 1, shade(d.sk, -0.3));
    // Yellow pinstripe suit, green shirt, purple tie.
    d.recolor("#f3d04b", 0, ty, d.W, d.p.height - ty, (x) => x % 3 === 0 ? "#c8a428" : null);
    d.suit("#5aa84a", "#7a4ac0", "#e8c040");
    marineCoat(d, MARINE, "#f8e8a0", true);
    // Light: a glowing body edge, a charged hand and light-speed streaks.
    d.recolor("#f3d04b", tx - 2, ty, tw + 4, d.p.height - ty, (x, y) => (x === tx || x === tx + tw - 1) && y % 2 === 0 ? "#fff8c0" : null);
    for (let i = 0; i < 6; i++) d.u(d.rx + d.aw + 1 + i * 2, d.rhy - 7 - i, 7, 1, i % 2 ? "#fff4a0" : "#ffffff");
    d.orb(d.rx + d.aw + 1, d.rhy - 1, 3, "#fff8c0");
    for (let a = 0; a < 8; a++) { const ang = (a * Math.PI) / 4; d.u(Math.round(d.rx + d.aw + 1 + Math.cos(ang) * 6), Math.round(d.rhy - 1 + Math.sin(ang) * 6), 1, 1, "#ffffff"); }
    for (let i = 0; i < 5; i++) d.u(d.legX - 8 - i * 3, d.bottom - 7 + i, 6, 1, i % 2 ? "#fff4a0" : "#ffffff");
    d.sparkle(tc - 14, ty - 6, "#fff4a0").sparkle(tc + 15, ty + 10, "#fff4a0");
  },
  akainu: (d) => {
    const { hy, ty, tx, tc } = d;
    d.eyes("glare", "#3a1a1a", "#14141c").mouth("line");
    d.f(d.cx - 3, hy + 13, 1, 1, shade(d.sk, -0.5)).f(d.cx + 2, hy + 13, 1, 1, shade(d.sk, -0.5));
    d.f(d.hx + 1, hy + 15, d.hw - 2, 2, "#c86a4a"); // neck tattoo
    // White Marine cap with a teal band and the gull emblem.
    d.recolor("#f2f4f7", d.hx - 2, hy - 8, d.hw + 8, 10, (x, y) => y === hy ? "#3a8a8a" : null);
    d.r(d.cx - 2, hy - 4, 4, 2, "#3a5aa8").d(d.cx - 1, hy - 4, "#ffffff");
    // Maroon double-breasted suit, red floral shirt, a pink rose on the lapel.
    d.suit("#d83a3a", undefined, "#a83a4a").folds("#8a2434", ty + 8, 4);
    d.d(tc - 1, ty + 3, "#ffd04a").d(tc + 1, ty + 5, "#ffd04a").d(tc, ty + 7, "#ffffff");
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) d.r(tc + s * 5 - (s < 0 ? 1 : 0), ty + 9 + r * 3, 2, 1, gold);
    d.r(tx + 3, ty + 4, 3, 3, "#ff6a9a").d(tx + 4, ty + 5, "#ffd0e0").d(tx + 4, ty + 7, "#3a8a3a");
    marineCoat(d, MARINE, "#c8cedc", true);
    d.r(d.lx, d.lhy - 2, d.aw, 1, "#d83a3a").r(d.rx, d.rhy - 2, d.aw, 1, "#d83a3a");
    d.recolor("#ff6a2a", d.lx - 1, d.lhy - 1, d.aw + 2, 4, () => "#1e1e28"); // black glove
    // Magma fist: crusted, glowing, dripping, steaming.
    d.recolor("#ff6a2a", d.rx - 2, d.rhy - 4, d.aw + 4, 8, (x, y) => (x + y) % 3 === 0 ? "#ffd04a" : (x * 2 + y) % 5 === 0 ? "#6a1a0a" : null);
    d.asBody(() => d.r(d.rx - 1, d.rhy - 1, d.aw + 2, 5, "#c8281a").r(d.rx, d.rhy, d.aw, 3, "#ff7a2a").d(d.rx + 1, d.rhy + 1, "#ffe08a"));
    for (let i = 0; i < 4; i++) d.u(d.rx - 1 + i * 2, d.rhy + 4 + i, 1, 2 + i, i % 2 ? "#ff6a2a" : "#ffb03a");
    fire(d, d.rx + 2, d.rhy - 2, 9, "#c8281a", "#ff7a2a", "#ffe08a");
    wisps(d, [[d.rx + 7, d.rhy - 12, 2], [d.rx + 2, d.rhy - 16, 2], [d.rx + 9, d.rhy - 19, 1]], "#5a5058");
    for (let i = 0; i < 3; i++) d.u(d.legX + d.gap + 6 + i * 3, d.bottom - i, 3, 1, i % 2 ? "#ff7a2a" : "#ffd04a"); // magma pooling at his feet
  },
  fujitora: (d) => {
    const { ty, tx, tw, th, tc } = d;
    d.wipeScar(["xscar"]).eyes("none").mouth("smile");
    for (const x of [d.L, d.R]) d.f(x, d.ey + 1, 3, 1, shade(d.sk, -0.5));
    d.line(d.L - 1, d.ey - 3, d.L + 3, d.ey + 3, "#a05a5a").line(d.R + 3, d.ey - 3, d.R - 1, d.ey + 3, "#a05a5a"); // the X scars
    strands(d, "#2a2d3a");
    d.f(d.hx + 1, d.hy + 10, 2, 6, "#2a2d3a").f(d.hx + d.hw - 3, d.hy + 10, 2, 6, "#2a2d3a").f(d.hx + 2, d.hy + 14, d.hw - 4, 2, "#2a2d3a"); // beard
    // Purple kimono with a crossed scarf, dark sash, the white coat.
    d.recolor("#a479d9", 0, ty, d.W, d.p.height, (x, y) => (x + y) % 6 === 0 ? "#c8a8f0" : (x - y + 60) % 6 === 0 ? "#7a50b0" : null);
    d.line(tc - 5, ty + 1, tc + 3, ty + 9, "#5a3a8a").line(tc + 4, ty + 1, tc - 4, ty + 9, "#6a4aa0").line(tc + 5, ty + 1, tc - 3, ty + 9, "#5a3a8a");
    d.r(tx + 1, ty + th - 6, tw - 2, 3, "#3a2a4a").r(tx + 1, ty + th - 6, tw - 2, 1, "#5a4a6a");
    marineCoat(d, MARINE, "#c8cedc", true);
    // Shikomizue cane-sword, and gravity: rings at his feet, meteor stones overhead.
    const x = d.rx + d.aw;
    d.asBody(() => d.r(x - 1, d.rhy - 6, 3, d.bottom - d.rhy + 4, ink).r(x, d.rhy - 5, 1, d.bottom - d.rhy + 2, "#c0a060").r(x - 1, d.rhy - 8, 3, 3, "#d8c080").r(x - 1, d.rhy + 2, 3, 1, gold));
    for (let i = 0; i < 3; i++) d.u(d.legX - 6 - i * 4, d.bottom - i, 12 + i * 8 + d.gap, 1, i === 0 ? "#c8a8f0" : `${"#a479d9"}88`);
    for (const [rx, ry, r] of [[tx - 8, ty - 10, 3], [tx + tw + 6, ty - 14, 2], [tc + 2, ty - 26, 2]] as [number, number, number][]) {
      d.orb(rx, ry, r, "#6a5a5a", "#3a2a2a");
      for (let k = 1; k < 4; k++) d.u(rx - k, ry - r - k, 1, 1, k === 1 ? "#ffb06a" : "#c8a8f0");
    }
  },
  ryokugyu: (d) => {
    const { tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a8a3a").mouth("grin");
    stubble(d);
    // Teal hair.
    strands(d, "#3aa89a");
    // Shirtless and muscled, the kanji tattoo running down his chest.
    muscles(d, 3);
    for (let k = 0; k < 4; k++) { const y = ty + 2 + k * 4; d.r(tc + 3, y, 3, 1, "#3a6a3a").d(tc + 4, y + 1, "#3a6a3a").r(tc + 3, y + 2, 3, 1, "#3a6a3a"); }
    // The Marine coat with its green lining and gold epaulettes.
    marineCoat(d, MARINE, "#3a9a4a", true);
    d.recolor(MARINE, 0, ty + 4, d.W, d.p.height, (x) => x === tx - 1 || x === tx + tw ? "#2a8a3a" : null);
    // Black ripped jeans, one leg covered in green clovers.
    d.recolor("#1a1a22", d.legX + d.gap - 4, d.legY, 20, d.legH + 4, (x, y) => (x * 3 + y * 2) % 5 === 0 ? "#6ad86a" : (x + y) % 4 === 0 ? "#3aa84a" : null);
    d.d(d.legX + 2, d.legY + 4, d.sk).d(d.legX + 3, d.legY + 9, d.sk);
    d.r(tx + 1, ty + th - 4, tw - 2, 1, "#2a2a2a");
    // Katana at the hip.
    d.asBody(() => d.line(tc - 2, ty + th - 6, tx + tw + 8, d.bottom - 2, "#c8d2e0").line(tc - 2, ty + th - 7, tc + 3, ty + th - 4, "#8a2a2a"));
    // The left arm turned to wood: a gnarled root splitting into branch fingers.
    d.asBody(() => {
      d.recolor(d.sk, d.lx - 1, ty, d.aw + 2, d.lhy - ty + 3, (x, y) => (x + y) % 3 === 0 ? "#6a4a2a" : "#9a6a3a");
      const x0 = d.lx + 1, y0 = d.lhy + 2;
      for (const [dx, dy] of [[-14, 14], [-10, 18], [-5, 20], [-16, 6], [-1, 18]] as [number, number][]) {
        d.line(x0, y0, x0 + dx, y0 + dy, "#8a5a2a").line(x0 + 1, y0, x0 + dx + 1, y0 + dy, "#5a3a1a");
        d.u(x0 + dx - 1, y0 + dy + 1, 2, 2, "#4fbf62").u(x0 + dx, y0 + dy + 1, 1, 1, "#a8f08a");
      }
    });
    // Roots and leaves breaking through the ground.
    for (let i = 0; i < 6; i++) {
      const x = d.legX - 10 + i * 6;
      for (let j = 0; j < 5 + (i % 3) * 2; j++) d.u(x + ((j >> 1) % 2), d.bottom - j, 1, 1, "#6a4a2a");
      d.u(x - 1, d.bottom - 6 - (i % 3) * 2, 3, 2, "#4fbf62").u(x, d.bottom - 7 - (i % 3) * 2, 1, 1, "#a8f08a");
    }
  },
  tsuru: (d) => {
    const { hx, hy, hw, cx, ty, th } = d;
    d.eyes("happy").mouth("smile");
    strands(d, "#c4cde0");
    d.r(cx - 3, hy - 6, 6, 3, "#c4cde0").r(cx - 2, hy - 6, 4, 1, "#e8eef8").r(cx + 2, hy - 7, 3, 1, "#3a5aa8").d(cx + 4, hy - 7, gold); // bun with a hairpin
    for (let i = 0; i < 4; i++) d.f(hx + 3 + i * 3, hy + 14, 1, 1, shade(d.sk, -0.2));
    d.f(hx + 2, hy + 9, 1, 1, shade(d.sk, -0.2)).f(hx + hw - 3, hy + 9, 1, 1, shade(d.sk, -0.2));
    // Pearl necklace, blue suit with gold buttons, and the coat with epaulettes.
    for (let i = -5; i <= 5; i += 2) d.d(d.tc + i, ty + 1 + Math.round((i * i) / 12), "#ffffff").d(d.tc + i + 1, ty + 1 + Math.round((i * i) / 12), "#d8dce6");
    d.folds("#3a5aa8", ty + 8, 4).belt("#2a3a6a", gold, ty + th - 6).buttons(gold, 2, ty + 6);
    marineCoat(d, MARINE, "#c8cedc", true);
    // Wash-Wash: a swirl of soapy water and bubbles from her hand.
    for (let i = 0; i < 6; i++) bubble(d, d.rx + d.aw + 2 + i * 3, d.rhy - 2 - i * 4, 1 + (i % 3 === 1 ? 1 : 0), "#a8e0ff");
    for (let a = 0; a < 24; a++) { const ang = (a / 24) * Math.PI * 1.6, r = 4 + a / 3; d.u(Math.round(d.rx + d.aw + 4 + Math.cos(ang) * r), Math.round(d.rhy - 8 + Math.sin(ang) * r), 1, 1, a % 2 ? "#a8e0ff" : "#e8f8ff"); }
  },

  // ----- Revolutionaries / others -----
  rayleigh: (d) => {
    const { hx, hy, hw, ty, tx, tw, th } = d;
    d.wipeScar(["glasses"]).eyes("stern", "#5a7a8a", "#c8d0d8").glasses("#8a7a50", "#e8f4f8").mouth("smirk");
    d.line(d.L - 1, hy + 4, d.L + 1, hy + 12, "#b0806a");
    strands(d, "#e8eef2");
    d.recolor("#e8eef2", hx, hy + 9, hw, 12, (x, y) => (x + y) % 3 === 0 ? "#c8d0d8" : null);
    // Green cloak with a high collar over a white shirt.
    openFront(d, 6, 3, "#c8ccd8");
    d.trim("#2f6a52", "#7ac8a8", ty).folds("#2f6a52", ty + 6, 4);
    d.asBody(() => { for (const x0 of [hx - 2, hx + hw - 1]) d.r(x0, ty - 5, 3, 6, "#2f6a52").r(x0, ty - 5, 3, 1, "#7ac8a8"); });
    d.belt("#3a2a1a", gold, ty + th - 6);
    // Sabre at the hip, gold ring guard.
    const gx = tx + tw - 4, gy = ty + th - 8;
    d.asBody(() => {
      d.line(gx + 1, gy + 3, tx + tw + 8, d.bottom - 4, "#2a5a4a").line(gx + 2, gy + 3, tx + tw + 9, d.bottom - 4, "#4a8a6a");
      for (const [dx, dy] of [[-2, 0], [-2, 1], [-1, -1], [0, -2], [1, -2], [2, -1], [3, 0], [3, 1]]) d.d(gx + dx, gy + dy, gold);
    });
  },

  // ----- Supernovas & Straw Hats -----
  law: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#d8b840", "#14141c").mouth("smirk");
    for (const x of [d.L, d.R]) d.f(x, d.ey + 2, 3, 1, shade(d.sk, -0.3)); // tired eyes
    d.f(cx - 2, hy + 11, 4, 1, "#1e2230");
    // Spotted white beanie.
    d.recolor("#f2f2f2", hx - 2, hy - 8, hw + 4, 10, (x, y) => ((x >> 1) + (y >> 1)) % 4 === 0 && (y % 4) < 2 ? "#8a6a4a" : null);
    d.r(hx - 1, hy + 2, 3, 2, "#c8c0a0").r(hx + hw - 2, hy + 2, 3, 2, "#c8c0a0");
    // Black-and-yellow hoodie with the Heart Pirates mark.
    d.recolor("#1e1e28", tx, ty, tw, th, (x, y) => (x < tc - 4 || x >= tc + 4) && y > ty + 2 ? "#f0d040" : null);
    d.orb(tc, ty + 9, 3, "#f0d040").d(tc - 1, ty + 8, ink).d(tc + 1, ty + 8, ink).r(tc - 1, ty + 10, 3, 1, ink);
    d.r(tc - 1, ty, 2, 4, "#c8c0a0");
    d.recolor("#4a6a9a", 0, d.legY, d.W, d.legH + 2, (x, y) => (x + y * 2) % 7 === 0 ? "#2a3a5a" : null); // spotted jeans
    // Hand tattoos and Kikoku over his shoulder.
    d.f(d.lx, d.lhy + 1, d.aw, 1, "#1a1a2a");
    d.asBody(() => {
      const x0 = d.rx + 2, y0 = d.rhy + 2, x1 = hx + hw + 9, y1 = hy - 12;
      d.line(x0, y0, x1, y1, "#1a1a22", true).line(x0 + 1, y0, x1 + 1, y1, "#1a1a22", true).line(x0 + 1, y0 - 1, x1 + 1, y1 - 1, "#3a3a4a", true);
      for (let k = 4; k < 28; k += 4) { const t = k / 30; d.u(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1, "#f4f4f4"); }
      d.r(x0 - 2, y0 + 1, 5, 2, "#c8283a").r(x0 - 1, y0 + 3, 3, 4, "#1a1a22").r(x0 - 3, y0 + 3, 2, 3, "#f4f0e8");
    });
  },
  "law-awakened": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    // Room: a glowing blue dome behind him, a grid of light inside it.
    const cxr = Math.floor(d.W / 2), cyr = d.bottom - 2, R = Math.floor(d.W / 2) - 1;
    for (let a = 0; a <= 180; a += 2) { const ang = (a * Math.PI) / 180; d.u(Math.round(cxr + Math.cos(ang) * R), Math.round(cyr - Math.sin(ang) * R * 1.05), 1, 1, a % 8 === 0 ? "#c8ffff" : "#5ccfd8"); }
    for (let a = 10; a < 180; a += 8) { const ang = (a * Math.PI) / 180; d.u(Math.round(cxr + Math.cos(ang) * (R - 3)), Math.round(cyr - Math.sin(ang) * (R - 3) * 1.05), 1, 1, "#5ccfd860"); }
    d.u(1, cyr, d.W - 2, 1, "#5ccfd8");
    d.eyes("glare", "#d8b840", "#14141c").mouth("smirk");
    for (const x of [d.L, d.R]) d.f(x, d.ey + 2, 3, 1, shade(d.sk, -0.3)); // tired eyes
    d.f(cx - 2, hy + 11, 4, 1, "#2a2d3a").f(cx - 1, hy + 14, 2, 2, "#2a2d3a"); // goatee
    // Fluffy spotted white hat.
    d.recolor("#f2f2f2", hx - 2, hy - 8, hw + 4, 10, (x, y) => ((x >> 1) + (y >> 1)) % 4 === 0 && (y % 4) < 2 ? "#8a6a4a" : (x + y) % 3 === 0 ? "#ffffff" : "#e4e4ea");
    d.asBody(() => { for (let i = 0; i < hw + 4; i += 2) d.r(hx - 2 + i, hy + 1, 2, 2, i % 4 ? "#e4e4ea" : "#ffffff"); });
    d.r(hx - 1, hy + 4, 1, 2, gold).r(hx + hw, hy + 4, 1, 2, gold); // earrings
    // Long black coat with the orange Heart Pirates band, yellow shirt, spotted jeans.
    d.trim("#2a2d3a", "#5ccfd8", ty).folds("#2a2d3a", d.legY - 4, 4);
    d.recolor("#2a2d3a", 0, ty + th - 2, d.W, 3, () => "#f08a2a");
    d.r(tx + 3, ty + 5, 3, 2, "#f0d040").d(tx + 4, ty + 7, "#f0d040");
    d.r(tc - 2, ty + 1, 4, 4, "#f0d040");
    d.belt("#1a1a22", gold, ty + th - 6);
    d.recolor("#3a3f52", 0, d.legY, d.W, d.legH + 2, (x, y) => (x + y * 2) % 5 === 0 ? "#8a6a4a" : null);
    d.f(d.lx, d.lhy + 1, d.aw, 1, "#1a1a2a"); // finger tattoos
    // Kikoku drawn, a cube of Room hovering by his hand.
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 8, d.rhy - 28, { grip: "#1a1a22", guard: "#c8283a", edge: "#e0ffff", guardW: 6 });
    const qx = d.lx - 8, qy = d.lhy - 10;
    d.u(qx, qy, 6, 1, "#c8ffff").u(qx, qy + 5, 6, 1, "#5ccfd8").u(qx, qy, 1, 6, "#c8ffff").u(qx + 5, qy, 1, 6, "#5ccfd8").u(qx + 2, qy - 2, 6, 1, "#5ccfd880").u(qx + 7, qy - 2, 1, 6, "#5ccfd880");
  },
  "kid-awakened": (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#ff5a3c", "#a02a1a").mouth("fangs");
    d.f(d.cx - 3, hy + 12, 6, 1, "#5a1a2a"); // dark lipstick
    d.line(d.L - 1, hy + 3, d.L + 2, hy + 14, "#b05a5a"); // scar
    strands(d, "#ff5a3c");
    d.r(hx + 1, hy, hw - 2, 3, "#2a2a34").r(hx + 3, hy, 4, 2, "#c8a050").r(hx + hw - 7, hy, 4, 2, "#c8a050").d(hx + 4, hy, "#fff0a0"); // goggles
    // A huge, shaggy red fur coat; black open vest; two brown belts with gold buckles.
    openFront(d, 12, 5, "#3a3a44");
    muscles(d, 2);
    d.recolor("#c8281a", 0, 0, d.W, d.p.height, (x, y) => (x * 2 + y) % 5 === 0 ? "#8a1a10" : (x + y * 3) % 7 === 0 ? "#ff6a4a" : null);
    d.trim("#c8281a", "#ff7a5a", ty);
    d.asBody(() => {
      // Shaggy fur spilling over the shoulders and down both sides, ragged at the edges.
      for (let y = ty - 3; y < d.bottom - 3; y++) {
        const k = (y * 7) % 5, j = (y * 3) % 4;
        d.u(tx - 6 - k % 3, y, 4 + k % 3, 1, (y + k) % 3 ? "#c8281a" : "#e8402a").u(tx + tw + 2, y, 4 + j % 3, 1, (y + j) % 3 ? "#c8281a" : "#8a1a10");
      }
      for (let i = -6; i < 0; i += 2) d.u(tx + i, ty - 4 - (i % 4 === 0 ? 1 : 0), 2, 3, "#e8402a").u(tx + tw - i - 2, ty - 4 - (i % 4 === 0 ? 1 : 0), 2, 3, "#e8402a");
    });
    for (const y of [ty + th - 7, ty + th - 4]) d.r(tx, y, tw, 2, "#5a3a20").r(tx, y, tw, 1, "#7a5a3a").r(tc - 2, y - 1, 4, 3, gold).d(tc - 1, y, "#5a3a20");
    // Mustard trousers with a black cracked pattern and a maroon frill.
    d.recolor("#d8c070", 0, d.legY, d.W, d.legH + 4, (x, y) => (x * 3 + y * 2) % 7 === 0 || (x - y * 3 + 80) % 9 === 0 ? "#1e1a14" : null);
    d.r(d.legX - 1, d.bottom - 5, d.gap + 10, 1, "#8a2a3a");
    // The silver mechanical left arm, and a magnetic scrap fist crackling red.
    d.asBody(() => {
      d.recolor(d.sk, d.lx - 2, ty - 2, d.aw + 4, d.lhy - ty + 6, (x, y) => (y % 4 === 0) ? "#8a94a4" : (x + y) % 3 === 0 ? "#e8eef4" : "#c0c8d4");
      const ax = d.lx - 9, ay = d.lhy - 4;
      for (let j = 0; j < 14; j++) for (let i = 0; i < 11; i++) if ((i - 5) ** 2 / 30 + (j - 7) ** 2 / 49 <= 1) d.u(ax + i, ay + j, 1, 1, (i * 3 + j * 2) % 7 === 0 ? "#e8eef4" : (i + j) % 5 === 0 ? "#5a5f6a" : (i + j * 3) % 11 === 0 ? "#b05a2a" : "#8a909c");
      for (const [bx, by] of [[3, 3], [7, 6], [4, 10]]) d.u(ax + bx, ay + by, 2, 2, "#ffffff");
    });
    d.bolt(d.lx - 12, d.lhy - 8, -1, 7, "#ff5a3c", "#6a1a0a").bolt(d.lx + 1, d.lhy - 12, 1, 6, "#ff5a3c", "#6a1a0a");
    for (const [x, y] of [[d.lx - 14, d.lhy + 10], [d.lx - 4, d.lhy - 14], [d.lx - 16, d.lhy - 2]]) d.u(x, y, 2, 2, "#8a909c").u(x, y, 1, 1, "#e8eef4"); // drifting scrap
  },
  "sanji-ifrit-jambe": (d) => {
    const { hx, hy, ty, tc, tx, tw, th } = d;
    d.eyes("glare", "#3a6ad0", "#c8a838").mouth("smirk");
    d.f(d.R + 2, d.ey - 4, 2, 1, "#c8a838").f(d.R + 3, d.ey - 5, 1, 1, "#c8a838").f(d.R + 1, d.ey - 3, 1, 1, "#c8a838"); // curly brow
    strands(d, "#f0d070");
    for (let j = 0; j < 9; j++) d.r(hx + 1, hy + 2 + j, 9 - j, 1, j % 3 === 2 ? "#c8a838" : "#f0d070"); // fringe swept over one eye
    d.f(d.cx - 1, hy + 14, 2, 2, "#c8a838"); // goatee
    d.r(d.cx + 2, hy + 13, 5, 1, "#f4f4f4").d(d.cx + 7, hy + 13, "#5ab0ff");
    for (let i = 0; i < 6; i++) d.u(d.cx + 8 + (i % 2), hy + 12 - i * 2, 1, 2, i % 2 ? "#a8d8ff" : "#d0d6de");
    // White shirt open at the collar, sleeves rolled, black trousers.
    openFront(d, 5, 2, "#c8ccd8");
    d.folds("#f4f6fa", ty + 6, 4).r(tc - 1, ty + 7, 2, 1, "#c8ccd8").r(tc - 1, ty + 11, 2, 1, "#c8ccd8");
    d.r(tx + 1, ty + th - 4, tw - 2, 2, "#1e1e28").r(tc - 1, ty + th - 4, 2, 2, "#c8ccd8");
    // Ifrit Jambe: both legs engulfed in roaring blue flame, embers rising.
    d.recolor("#1e1e28", 0, d.legY + 2, d.W, d.legH + 4, (x, y) => { const k = (x * 7 + y * 3 + (y >> 2)) % 6; return k < 2 ? "#5ab0ff" : k === 2 ? "#e8f8ff" : k === 3 ? "#2a5ad8" : null; });
    for (const [x, h] of [[d.legX - 3, 16], [d.legX + d.gap + 9, 16], [d.legX + 3, 10], [d.legX + d.gap + 3, 10], [d.legX - 7, 9], [d.legX + d.gap + 13, 9], [d.legX + d.gap / 2 + 3, 7]] as [number, number][]) fire(d, x, d.bottom - 1, h, "#1a4ad8", "#5ab0ff", "#e8f8ff");
    for (const [x, y] of [[d.legX - 8, d.legY - 4], [d.legX + d.gap + 14, d.legY - 6], [d.legX - 4, d.legY - 10], [d.legX + d.gap + 10, d.legY - 12]]) d.u(x, y, 1, 1, "#a8e0ff").u(x + 1, y - 1, 1, 1, "#ffffff");
  },
  "rob-lucci-awakened": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("line");
    // Long curly black hair under a white top hat with a black band.
    strands(d, "#1e1a22");
    d.asBody(() => { for (let i = 0; i < 4; i++) { d.u(hx - 3 + (i % 2), hy + 3 + i * 4, 2, 4, i % 2 ? "#2e2a34" : "#1e1a22"); d.u(hx + hw + 1 - (i % 2), hy + 3 + i * 4, 2, 4, i % 2 ? "#1e1a22" : "#2e2a34"); } });
    d.recolor("#f4f4f4", hx - 4, hy - 14, hw + 8, 16, (x, y) => (y === hy - 2 || y === hy - 3) ? "#1e1e28" : x === hx ? "#d8dce6" : null);
    d.asBody(() => d.r(hx - 4, hy, hw + 8, 1, "#f4f4f4").r(hx - 4, hy + 1, hw + 8, 1, "#c8ccd8"));
    // A pointed goatee, a sharp jaw.
    d.f(cx - 2, hy + 12, 4, 1, "#1e1a22").asBody(() => d.r(cx - 1, hy + d.hh, 2, 4, "#1e1a22").d(cx, hy + d.hh + 4, "#1e1a22"));
    // White double-breasted suit open at the neck, a purple rose, a long white coat.
    openFront(d, 7, 3, "#d8dce6");
    for (let r = 0; r < 2; r++) for (const s of [-1, 1]) d.r(tc + s * 4 - (s < 0 ? 1 : 0), ty + 9 + r * 4, 2, 2, "#c8ccd8");
    d.r(tx + tw - 7, ty + 4, 4, 3, "#8a4ac8").d(tx + tw - 6, ty + 5, "#c8a0f0").d(tx + tw - 5, ty + 4, "#6a2aa8");
    d.folds("#f2f2f2", d.legY, 4).trim("#f8f8fa", "#c8ccd8", ty).folds("#f8f8fa", ty + 6, 5);
    // Hattori on his shoulder, in a tiny top hat.
    d.asBody(() => {
      const bx = tx - 4, by = ty - 8;
      d.r(bx, by + 2, 6, 6, "#ffffff").r(bx + 1, by + 3, 4, 4, "#f2f2f2").d(bx + 4, by + 3, ink).r(bx + 6, by + 4, 2, 1, "#f08a3a");
      d.r(bx + 1, by - 2, 4, 3, "#ffffff").r(bx, by + 1, 6, 1, "#ffffff").r(bx + 1, by, 4, 1, "#1e1e28").r(bx + 2, by + 6, 1, 3, "#c8ccd8");
    });
    // Leopard claw marks in the air.
    for (let i = 0; i < 3; i++) d.line(d.lx - 10 + i * 3, d.lhy - 16, d.lx - 14 + i * 3, d.lhy - 4, i === 1 ? "#ffffff" : "#e8c26a");
  },
};

// ---------- Build ----------
const LEGACY_IDS = new Set<string>(Object.keys(LEGACY_LOOKS));

export function isLegendaryArt(id: CharacterId): id is LegendaryArtId {
  return LEGACY_IDS.has(id) || chestCharacterById(id)?.rarity === "legendary";
}

function lookFor(id: LegendaryArtId): { look: Look; accent: string } {
  if (LEGACY_IDS.has(id)) return { look: LEGACY_LOOKS[id as LegacyId], accent: PLAYABLE_CHARACTERS.find((c) => c.id === id)!.color };
  const base = CHEST_LOOKS[id as ChestCharacterId];
  const look = { ...base, ...HD_LOOK[id as ChestCharacterId] };
  return { look, accent: look.fx ?? chestCharacterById(id)!.color };
}

function buildLegendary(id: LegendaryArtId, pose: Pose, frame: number): RunnerSprite {
  const { look, accent } = lookFor(id);
  return renderHd(figureFromLook(look, accent, pose, true), figureFromLook(look, accent, pose, true, true), PAINTERS[id], frame, pose,
    { margin: MARGIN[id], aura: (p, body, a, fr) => shapeAura(p, body, a, fr, 4, true) });
}

const cache = new Map<LegendaryArtId, RunnerSprite[]>();
/** High-detail legendary sprite (2 pixels per world pixel). frame 0 = idle, 1/2 = strides. */
export function legendaryHdSprite(id: LegendaryArtId, frame: 0 | 1 | 2): RunnerSprite {
  let frames = cache.get(id);
  if (!frames) {
    frames = [buildLegendary(id, -1, 0), buildLegendary(id, 0, 1), buildLegendary(id, 1, 2)];
    cache.set(id, frames);
  }
  return frames[frame];
}

