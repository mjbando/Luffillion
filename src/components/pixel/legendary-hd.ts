import { chestCharacterById, type ChestCharacterId } from "@/data/chest-characters";
import { PLAYABLE_CHARACTERS, type CharacterId } from "@/data/playable-characters";
import { CHEST_LOOKS, type Look } from "./chest-looks";
import { figureFromLook } from "./generated";
import { ink, white, gold, shade, type Pose, type RunnerSprite } from "./kit";
import { Detail, renderHd, shapeAura, blob, stroke, fringe, GOLD_D, SHIRT, type Painter } from "./mythic-hd";

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
  "kozuki-oden": { ow: true, x: ["beard:#2a2d3a", "open:#f4c69c"] },
  yamato: { ow: true },
  marco: { x: ["open:#f4c69c"] },
  vista: { ow: true, x: ["stache:#2a2d3a"] },
  king: { ow: true, x: ["mask:#2a2d3a"] },
  jack: { ow: true },
  katakuri: { ow: true },
  aokiji: { x: [] },
  kizaru: { x: ["shades:#5a4a2a"] },
  akainu: { x: [] },
  fujitora: { ow: true },
  sengoku: { x: ["braid:#2a2d3a", "glasses:#c8d8e8"] },
  "edward-weevil": { ow: true, x: [] },
  "benn-beckman": { ow: true, x: [] },
  "lucky-roux": { ow: true, x: [] },
  yasopp: { ow: true },
  "rob-lucci-awakened": { ow: true, hs: "short", x: ["^ears:#e8c26a:round", "tail:#e8c26a"] },
  "law-awakened": { ow: true, x: ["goatee:#2a2d3a"] },
  "kid-awakened": { x: [] },
  "sanji-ifrit-jambe": { x: ["tie:#3a5aa8"] },
  "killer-onigashima": { ow: true, x: [] },
  vergo: { ow: true, x: ["goatee:#16121c"] },
};

/** Extra transparent canvas (HD pixels per side) for wide weapons and effects. */
const MARGIN: Partial<Record<LegendaryArtId, number>> = {
  "kozuki-oden": 8, yamato: 6, marco: 4, vista: 6, king: 6, jack: 6, katakuri: 6,
  fujitora: 4, "edward-weevil": 6, "benn-beckman": 6, yasopp: 6, "law-awakened": 6,
  "kid-awakened": 6, "killer-onigashima": 4, vergo: 4,
  law: 6, rayleigh: 4, whitebeard: 6, shanks: 4, akainu: 2, aokiji: 4, kizaru: 4, ryokugyu: 4, 
  sengoku: 4, "lucky-roux": 4, "rob-lucci-awakened": 2, "sanji-ifrit-jambe": 2, 
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
    const { hx, hy, hw, tc, ty, th } = d;
    d.eyes("stern", "#3a4a5a", "#6a7484").mouth("line");
    d.f(d.R + 1, d.ey + 2, 1, 4, "#a86a5a").f(d.R + 2, d.ey + 3, 1, 2, "#a86a5a"); // scar under his eye
    strands(d, "#b9c4d4");
    // Cigarette with a wisp of smoke.
    d.r(d.cx + 2, hy + 13, 5, 1, "#f4f4f4").d(d.cx + 7, hy + 13, "#ff7a3a");
    for (let i = 0; i < 6; i++) d.u(d.cx + 8 + (i % 2), hy + 12 - i * 2, 1, 2, "#d0d6de");
    d.r(hx + hw - 1, hy + 6, 2, 10, "#9aa6b8"); // ponytail falling over the shoulder
    openFront(d, 7, 3, "#5a6070");
    d.folds("#3a3f52", ty + 6, 4).belt("#5a3a2a", gold, ty + th - 6);
    // Long musket held across his body.
    d.asBody(() => {
      d.line(d.lx - 2, d.lhy + 4, d.rx + 12, d.rhy - 18, "#1e1e28").line(d.lx - 2, d.lhy + 3, d.rx + 12, d.rhy - 19, "#4a4f5a");
      d.line(d.lx - 6, d.lhy + 7, d.lx + 4, d.lhy + 1, "#8a5a2a").line(d.lx - 6, d.lhy + 8, d.lx + 4, d.lhy + 2, "#6a3a1a").line(d.lx - 7, d.lhy + 9, d.lx + 3, d.lhy + 3, "#5a2a10");
      d.r(tc - 1, ty + 9, 3, 2, gold);
    });
  },
  "lucky-roux": (d) => {
    const { hx, hy, hw, tc, ty, th } = d;
    d.eyes("happy").mouth("open");
    strands(d, "#c08a4a");
    d.r(hx + 1, hy + 2, hw - 2, 3, "#2a2a34").r(hx + 3, hy + 2, 4, 3, "#4a5a7a").r(hx + hw - 7, hy + 2, 4, 3, "#4a5a7a"); // goggles pushed up
    stubble(d, 2);
    d.recolor("#f0a35a", 0, ty, d.W, th, (x, y) => (x + y) % 5 === 0 ? "#d88a40" : null).trim("#f0a35a", "#c86a2a", ty);
    d.belt("#4a3a2a", gold);
    // A huge roast drumstick in one hand, a pistol tucked in the belt.
    d.asBody(() => {
      const mx = d.rx + 2, my = d.rhy - 8;
      for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (i * i + j * j * 1.3 <= 26) d.r(mx + i, my + j, 1, 1, i + j < -4 ? "#e08a4a" : i + j > 4 ? "#7a3a1a" : "#a8542a");
      d.r(mx - 1, my + 5, 3, 7, "#f4ecd8").r(mx - 2, my + 11, 2, 2, "#f4ecd8").r(mx + 1, my + 11, 2, 2, "#f4ecd8");
      d.r(tc + 3, ty + th - 9, 6, 2, "#3a3a44").r(tc + 3, ty + th - 7, 2, 3, "#6a4a2a");
    });
  },
  yasopp: (d) => {
    const { hx, hy, hw, ty, th } = d;
    d.eyes("stern", "#5a4a2a").mouth("smirk");
    // Dreadlocks hanging under the bandana.
    for (let i = 0; i < 6; i++) { const x = i < 3 ? hx - 3 + i * 2 : hx + hw - 5 + (i - 3) * 2; d.asBody(() => d.r(x, hy + 3, 2, 12 + (i % 2) * 3, i % 2 ? "#b8943c" : "#d8b45c").d(x, hy + 15 + (i % 2) * 3, "#8a6a2a")); }
    strands(d, "#d8b45c");
    d.recolor("#3a5a8a", hx - 2, hy - 6, hw + 6, 10, (x, y) => (x + y) % 4 === 0 ? "#f2f2f2" : null); // spotted bandana
    stubble(d);
    d.folds("#5a6a4a", ty + 6, 4).belt("#5a3a20", gold, ty + th - 6);
    d.asBody(() => d.line(d.tx + 2, ty + 1, d.tx + d.tw - 2, ty + th - 4, "#6a4a2a")); // bandolier
    // Long rifle held up, ready to fire.
    d.asBody(() => {
      const x0 = d.rx, y0 = d.rhy + 2;
      d.line(x0 - 4, y0 + 3, x0 + 14, y0 - 22, "#1e1e28").line(x0 - 3, y0 + 3, x0 + 15, y0 - 22, "#5a5f6a");
      d.r(x0 - 6, y0, 4, 6, "#8a5a2a").r(x0 - 6, y0, 1, 6, "#b07a3a").r(x0 + 3, y0 - 6, 3, 2, gold);
    });
  },

  // ----- Swordsmen -----
  "kozuki-oden": (d) => {
    const { hx, hy, hw, cx, ty, tx, tw, th } = d;
    d.wipeScar(["beard"]).eyes("glare", "#3a2a1a", "#14141c").mouth("grin");
    // Topknot bound with a rope, wild strands.
    strands(d, "#2a2d3a");
    d.r(cx - 2, hy - 3, 4, 2, "#e8d8a0").d(cx - 1, hy - 3, "#c8a860");
    d.f(hx + 1, hy + 9, 2, 7, "#2a2d3a").f(hx + hw - 3, hy + 9, 2, 7, "#2a2d3a").f(hx + 2, hy + 14, hw - 4, 2, "#2a2d3a").f(cx - 4, hy + 10, 8, 1, "#2a2d3a");
    d.asBody(() => d.r(cx - 4, hy + d.hh, 8, 3, "#2a2d3a"));
    // Open orange kimono with a flame pattern, white sash.
    openFront(d, 13, 5);
    muscles(d, 2);
    d.recolor("#ef6d4a", 0, ty, d.W, th + 2, (x, y) => (x * 3 + y * 2) % 11 === 0 ? "#ffd27a" : (x + y) % 7 === 0 ? "#c84a2a" : null);
    d.r(tx + 1, ty + th - 6, tw - 2, 3, "#f4f0e0").r(tx + 1, ty + th - 4, tw - 2, 1, "#c8c0a8");
    // Enma and Ame no Habakiri held out wide.
    sword(d, d.lx + 1, d.lhy, d.lx - 12, d.lhy - 24, { grip: "#4a2a6a", guard: gold });
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 11, d.rhy - 24, { grip: "#2a2a3a", guard: "#c8ccd8" });
  },
  vista: (d) => {
    const { hx, hy, hw, cx, ty } = d;
    d.eyes("stern", "#3a2a2a").mouth("smile");
    // Curled moustache.
    const st = new Map<string, string>();
    for (const s of [-1, 1]) stroke(st, 16, (t) => [cx - 0.5 + s * (1 + 7 * t), hy + 12 - 4 * Math.sin(t * Math.PI * 0.9)], (t) => 2 - t, () => "#1e1e28");
    blob(d, st);
    d.r(hx - 1, hy - 2, hw + 2, 2, "#c8283a"); // red hat band
    d.suit(SHIRT, undefined, "#c8ccd8");
    for (let i = 0; i < 4; i++) d.r(d.tc - 2, ty + 2 + i, 4, 1, i % 2 ? "#f4c0d0" : "#ffffff"); // frilled cravat
    d.folds("#3a3f52", d.legY, 3);
    // Two sabres, petals swirling around them.
    sword(d, d.lx + 1, d.lhy, d.lx - 8, d.lhy - 22, { guard: gold, grip: "#5a2a3a" });
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 7, d.rhy - 22, { guard: gold, grip: "#5a2a3a" });
    for (const [x, y] of [[d.lx - 10, d.lhy - 14], [d.lx - 4, d.lhy - 26], [d.rx + 12, d.rhy - 12], [d.rx + 8, d.rhy - 27], [d.lx - 12, d.lhy - 4], [d.rx + 14, d.rhy - 2]])
      d.u(x, y, 2, 1, "#ff8cae").u(x + 1, y + 1, 1, 1, "#ffc0d4");
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
    const { hx, hy, hw, cx, ty, th } = d;
    d.eyes("glare", "#3a8ad8", "#8a7a40").mouth("laugh");
    // Long wild blond mane.
    strands(d, "#f0d888");
    d.asBody(() => { for (let i = 0; i < 5; i++) d.u(hx - 4 + i, hy + 6, 1, 12 + i, "#f0d888").u(hx + hw + i - 1, hy + 6, 1, 16 - i, "#f0d888"); });
    d.f(cx - 5, hy + 4, 1, 1, "#c05050").f(cx - 4, hy + 5, 1, 1, "#c05050").f(cx + 4, hy + 5, 1, 1, "#c05050").f(cx + 3, hy + 6, 1, 1, "#c05050"); // scars
    // Polka-dot shirt.
    d.recolor("#7fc0f0", 0, ty, d.W, th, (x, y) => (x % 4 === 1 && y % 4 === 1) ? "#ffffff" : null);
    d.folds("#3a5aa8", d.legY, 3).belt("#2a2a34", gold, ty + th - 6);
    // Punisher: spinning scythe blades on both wrists.
    for (const [x, y] of [[d.lx - 1, d.lhy - 1], [d.rx + d.aw, d.rhy - 1]]) {
      d.asBody(() => {
        for (let a = 0; a < 6; a++) { const ang = (a * Math.PI) / 3; d.line(x, y, Math.round(x + Math.cos(ang) * 6), Math.round(y + Math.sin(ang) * 6), "#d8e0ec"); }
        d.r(x - 1, y - 1, 3, 3, "#3a3a44").d(x, y, "#c8ccd8");
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
    const { tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#2a4a6a", "#a8883a").mouth("smirk");
    for (const x of [d.L, d.R]) d.f(x, d.ey, 3, 1, shade(d.sk, -0.4)); // heavy-lidded
    strands(d, "#f0d070");
    // Open shirt over the Whitebeard tattoo, blue sash.
    openFront(d, 14, 6);
    for (let i = -3; i <= 3; i++) d.d(tc + i, ty + 7 + Math.abs(i) * 0, "#3a6ad0").d(tc, ty + 4 + i + 3, "#3a6ad0");
    d.r(tc - 3, ty + 5, 1, 1, "#3a6ad0").r(tc + 3, ty + 5, 1, 1, "#3a6ad0");
    d.r(tx + 1, ty + th - 6, tw - 2, 3, "#3a6ad0").r(tx + 1, ty + th - 6, tw - 2, 1, "#6a9af0");
    // Phoenix wings: blue flame feathers burning gold at the tips.
    wings(d, (t, f) => t > 0.82 ? "#fff4a0" : t > 0.62 ? "#7ae0ff" : f % 2 ? "#1a8ad8" : "#3ab8ff", 15);
    fire(d, d.lx - 1, d.lhy + 1, 6, "#1a8ad8", "#4ad0ff", "#fff4a0").flame(d.rx + d.aw, d.rhy + 1, 6, ["#fff4a0", "#4ad0ff", "#1a8ad8"]);
  },
  jozu: (d) => {
    const { hx, hy, hw, ty, th } = d;
    d.eyes("stern", "#3a5a7a").mouth("line");
    d.f(hx + 1, hy + 4, 2, 8, "#2a2d3a").f(hx + hw - 3, hy + 4, 2, 8, "#2a2d3a"); // sideburns
    d.r(hx + 3, hy + 1, 3, 1, shade(d.sk, 0.4));
    // Diamond body: faceted crystal torso and arms.
    facets(d, "#c9e8ff");
    d.belt("#2a2d3a", "#c9e8ff", ty + th - 6);
    d.u(d.lx - 3, d.lhy - 6, 1, 1, white).u(d.rx + d.aw + 2, d.rhy - 8, 1, 1, white);
  },
  "edward-weevil": (d) => {
    const { cx, hy, hx, hw, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a").mouth("none");
    d.clear(hx - 3, hy + 4, 3, 8).clear(hx + hw, hy + 4, 3, 8);
    const stache = new Map<string, string>();
    for (const s of [-1, 1]) stroke(stache, 28, (t) => [cx - (s < 0 ? 1 : 0) + s * (1 + 10 * t), hy + 13 - 7 * t ** 3], (t) => 2 * (1 - t) + 0.8, (t, j) => j === 0 ? "#c8bc98" : "#f2e8cc");
    blob(d, stache);
    strands(d, "#e8dcc0");
    // A big round belly in an open white shirt.
    openFront(d, 16, 6, "#c8ccd8");
    d.r(tc - 1, ty + 12, 2, 2, shade(d.sk, -0.4));
    d.folds("#3a3f52", d.legY, 4).r(tx + 1, ty + th - 5, tw - 2, 2, "#8a3a2a");
    // His father's bisento.
    const x = Math.min(d.rx + d.aw, d.W - 8), top = hy - 12;
    d.asBody(() => {
      d.r(x, top + 10, 3, d.bottom - top - 10, ink).r(x + 1, top + 11, 1, d.bottom - top - 12, "#6a4a2a");
      const blade = new Map<string, string>();
      stroke(blade, 22, (t) => [x + 1 - 5 * Math.sin(t * 1.7), top + 12 - 11 * t], (t) => 4 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 1, (t, j, w) => j === w - 1 ? "#ffffff" : j === 0 ? "#8a98b0" : "#d0dae8");
      blob(d, blade);
      d.r(x - 1, top + 10, 5, 2, gold).r(x + 3, top + 12, 2, 5, "#c82a3a");
    });
  },

  // ----- Beasts Pirates -----
  king: (d) => {
    const { hx, hy, hw, ty, tx, tw, th } = d;
    d.eyes("shadow", "#ff4a2a").mouth("none");
    // Spiked black leather mask over the head, long white hair.
    d.asBody(() => { for (let i = 0; i < 5; i++) d.r(hx + 1 + i * 3, hy - 4 - (i === 2 ? 3 : i % 2 ? 1 : 2), 2, 4, "#1a1a22"); });
    d.r(hx + 2, hy + 1, hw - 4, 1, "#4a4a5a");
    strands(d, "#f2f2f2");
    // Black leather suit with straps.
    d.recolor("#2a2d3a", tx, ty, tw, th, (x, y) => (x - y + 40) % 6 === 0 ? "#4a4a5a" : null);
    d.belt("#1a1a22", "#c8ccd8");
    // Lunarian flames on his back, black wings.
    for (let i = 0; i < 5; i++) fire(d, tx - 2 + i * ((tw + 4) / 4), ty - 2, 7 + (i % 2) * 3, "#c83a1a", "#ff8a3a", "#ffe08a");
    wings(d, (t, f) => t > 0.85 ? "#4a4a5a" : f % 2 ? "#14141c" : "#26262f", 15);
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 9, d.rhy - 24, { grip: "#1a1a22", guard: "#c8ccd8" });
  },
  queen: (d) => {
    const { hx, hy, hw, cx, ty, tx, tw } = d;
    d.wipeScar(["shades"]).eyes("none").mouth("grin");
    // Round gold shades, a moustache, and the giant braided pompadour.
    for (const x of [d.L - 1, d.R]) d.r(x, d.ey - 1, 5, 3, "#f0c040").d(x + 1, d.ey - 1, "#fff0a0");
    d.r(d.L + 4, d.ey, d.R - d.L - 4, 1, "#c89a20");
    d.f(cx - 5, hy + 11, 10, 1, "#2a2d3a");
    strands(d, "#2a2d3a");
    d.recolor("#2a2d3a", hx, hy - 10, hw + 10, 8, (x, y) => (x + y) % 3 === 0 ? "#4a4a5a" : null);
    // Green outfit with a fur collar; the cyborg arm with a gun barrel.
    d.trim("#7cc96c", "#4a8a3a", ty).folds("#7cc96c", ty + 8, 4);
    d.asBody(() => d.r(tx - 1, ty - 2, tw + 2, 3, "#f4ecd8").r(tx, ty - 2, tw, 1, "#ffffff"));
    d.recolor("#c0c8d4", 0, ty, d.W, d.p.height - ty, (x, y) => (x + y) % 4 === 0 ? "#8a94a4" : (y % 3 === 0 ? "#e8eef4" : null));
    d.asBody(() => d.r(d.lx - 4, d.lhy - 1, 5, 4, "#5a6474").r(d.lx - 7, d.lhy, 4, 2, "#3a3f4a").d(d.lx - 7, d.lhy, "#ff4a4a"));
  },
  jack: (d) => {
    const { hx, hy, hw, ty, th } = d;
    d.eyes("glare", "#a8341a", "#3a2a1a").mouth("none");
    strands(d, "#e8e0d0");
    // Mammoth-tusk face mask.
    d.recolor("#5a4a3a", hx, hy, hw, d.hh + 2, (x, y) => (x + y) % 4 === 0 ? "#3a2a1a" : null);
    d.asBody(() => {
      for (const s of [-1, 1]) { const x0 = s < 0 ? hx + 2 : hx + hw - 3; for (let i = 0; i < 6; i++) d.r(x0 + s * Math.floor(i / 2), hy + 12 + i, 2, 1, "#f4f0e0"); }
    });
    // Fur vest over a bare chest.
    openFront(d, 13, 5);
    muscles(d, 2);
    d.recolor("#8f7a6a", 0, ty, d.W, th, (x, y) => (x * 2 + y) % 5 === 0 ? "#6a5444" : (x + y * 3) % 7 === 0 ? "#b09a88" : null);
    d.belt("#3a2a1a", gold);
    // Two hooked blades.
    for (const [x, y, s] of [[d.lx, d.lhy, -1], [d.rx + d.aw - 1, d.rhy, 1]] as [number, number, number][]) d.asBody(() => {
      d.line(x, y, x + s * 3, y - 14, "#c8d2e0").line(x + s, y, x + s * 4, y - 14, "#8a94a4");
      d.line(x + s * 3, y - 14, x + s * 8, y - 16, "#e8eef8").line(x + s * 8, y - 16, x + s * 9, y - 12, "#e8eef8");
      d.r(x - 1, y - 1, 3, 4, "#3a2a1a");
    });
  },

  yamato: (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#ff8a3a", "#a8b8d0").mouth("smile");
    // Long white hair with a pale-blue sheen, red horns.
    strands(d, "#e8eef8");
    d.recolor("#e8eef8", 0, hy + 10, d.W, 20, (x, y) => y > hy + 18 && (x + y) % 3 === 0 ? "#9ac8e8" : null);
    d.recolor("#e85a4a", hx - 4, hy - 12, hw + 8, 12, (x, y) => y % 2 === 0 ? "#ff8a6a" : null);
    // White top with a shimenawa rope belt and paper streamers, red hakama.
    d.folds("#f2f2f2", ty + 4, 5).trim("#f2f2f2", "#c8d0e0", ty);
    d.asBody(() => {
      for (let x = tx - 1; x < tx + tw + 1; x++) d.r(x, ty + th - 7 + ((x >> 1) % 2), 1, 3, (x >> 1) % 2 ? "#e8d8a8" : "#b89a5a");
      for (const x of [tc - 4, tc + 2]) d.r(x, ty + th - 4, 2, 5, "#ffffff").d(x + 1, ty + th, "#c8ccd8").r(x, ty + th + 1, 2, 2, "#ffffff");
    });
    d.r(tx + 2, ty + th - 9, tw - 4, 1, "#7a4ac0");
    d.folds("#d84040", d.legY - 2, 3);
    // Takeru, her long black kanabo, held upright.
    const x = d.rx + d.aw + 1;
    d.asBody(() => {
      d.r(x - 1, d.rhy - 2, 4, 10, ink).r(x, d.rhy - 1, 2, 8, "#3a2a2a");
      d.r(x - 3, hy - 10, 8, d.rhy - hy + 8, ink).r(x - 2, hy - 9, 6, d.rhy - hy + 6, "#3a3f52").r(x - 2, hy - 9, 1, d.rhy - hy + 6, "#5a6074");
      for (let y = hy - 7; y < d.rhy - 2; y += 4) d.d(x - 3, y, "#c8ccd8").d(x + 4, y + 2, "#c8ccd8");
      d.r(x - 2, d.rhy - 3, 6, 2, gold);
    });
  },

  // ----- Big Mom Pirates -----
  katakuri: (d) => {
    const { hx, hy, hw, ty, tx, tw, th } = d;
    d.wipeScar(["xscar"]).eyes("glare", "#b4386b", "#5a1a34").mouth("none");
    strands(d, "#b4386b");
    // Spiked fur scarf over his mouth.
    d.recolor("#e0d0c0", hx - 2, hy + 6, hw + 8, 14, (x, y) => (x + y) % 3 === 0 ? "#b8a890" : (x * 2 + y) % 5 === 0 ? "#fff8ec" : null);
    d.asBody(() => { for (let i = 0; i < hw; i += 3) d.r(hx + i, hy + 9, 1, 1, "#fff8ec"); });
    // Studded leather jacket.
    d.recolor("#3a2a3a", tx, ty, tw, th, (x, y) => (x % 5 === 0 && y % 4 === 0) ? "#c8ccd8" : null).trim("#3a2a3a", "#6a4a6a", ty);
    d.belt("#1a1a22", "#c8ccd8");
    // Mogura: a white mochi trident.
    const x = d.rx + d.aw + 1;
    pole(d, x, hy - 8, d.bottom - 2, "#f4f0ec");
    d.asBody(() => { d.r(x - 4, hy - 8, 10, 2, "#f4f0ec"); for (const ox of [-4, 1, 5]) d.r(x + ox, hy - 15, 2, 7, "#ffffff").d(x + ox, hy - 16, "#ffd8e8"); });
    for (const [mx, my] of [[d.lx - 2, d.lhy + 4], [d.lx, d.lhy + 7]]) d.u(mx, my, 2, 2, "#ffffff");
  },

  // ----- Marines -----
  aokiji: (d) => {
    const { hx, hy, hw, ty } = d;
    d.eyes("stern", "#2a3a5a").mouth("line");
    for (const x of [d.L, d.R]) d.f(x, d.ey, 3, 1, shade(d.sk, -0.4));
    strands(d, "#2a2d3a");
    // Sleep mask pushed up on his curls.
    d.r(hx + 1, hy - 1, hw - 2, 3, "#5a8ad8").r(hx + 3, hy, 3, 1, "#ffffff").r(hx + hw - 6, hy, 3, 1, "#ffffff");
    d.suit("#f4f8ff", undefined, "#a8c8e8").folds("#7bc8f0", ty + 6, 4);
    marineCoat(d);
    // Frost: ice shards around his feet and a frozen hand.
    for (let i = 0; i < 5; i++) { const x = d.legX - 8 + i * 6, h = 4 + (i % 2) * 4; for (let j = 0; j < h; j++) d.u(x + (j > h / 2 ? 1 : 0), d.bottom - j, j < h - 1 ? 2 : 1, 1, j % 3 === 0 ? "#ffffff" : "#a8e8ff"); }
    d.recolor(d.sk, d.lx - 1, d.lhy - 1, d.aw + 2, 5, () => "#c8f0ff");
    wisps(d, [[d.lx - 4, d.lhy - 4, 2], [d.lx - 6, d.lhy - 9, 2]], "#e0f8ff");
  },
  kizaru: (d) => {
    const { hx, hy, hw, ty } = d;
    d.wipeScar(["shades"]).eyes("none").mouth("smirk");
    for (const x of [d.L - 1, d.R]) d.r(x, d.ey - 1, 5, 3, "#5a4a2a").d(x + 1, d.ey - 1, "#a8946a");
    d.r(d.L + 4, d.ey, d.R - d.L - 4, 1, "#3a2a1a");
    strands(d, "#2a2d3a");
    d.f(hx + 2, hy + 14, hw - 4, 1, shade(d.sk, -0.3));
    // Pinstriped yellow suit.
    d.recolor("#f3d04b", 0, ty, d.W, d.p.height - ty, (x) => x % 3 === 0 ? "#c8a428" : null);
    d.suit(SHIRT, "#2a2d3a", "#e8c040");
    marineCoat(d);
    // Light-speed streaks off one raised hand and his shin.
    for (let i = 0; i < 5; i++) d.u(d.rx + d.aw + 1 + i * 2, d.rhy - 6 - i, 6, 1, i % 2 ? "#fff4a0" : "#ffffff");
    d.orb(d.rx + d.aw + 1, d.rhy - 1, 2, "#fff8c0");
    for (let i = 0; i < 4; i++) d.u(d.legX - 6 - i * 3, d.bottom - 6 + i, 5, 1, "#fff4a0");
  },
  akainu: (d) => {
    const { hy, ty, tx } = d;
    d.eyes("glare", "#3a1a1a", "#14141c").mouth("line");
    d.f(d.cx - 3, hy + 13, 1, 1, shade(d.sk, -0.5)).f(d.cx + 2, hy + 13, 1, 1, shade(d.sk, -0.5));
    // Marine cap with the gull emblem.
    d.r(d.cx - 2, hy - 3, 4, 2, "#f2f2f2").d(d.cx - 1, hy - 3, "#3a5aa8");
    // Red suit, a rose on the lapel, coat with epaulettes.
    d.suit("#1e1e28", undefined, "#ff6a4a").folds("#e2442c", ty + 8, 4);
    d.r(tx + 3, ty + 4, 3, 3, "#ff4a6a").d(tx + 4, ty + 5, "#ffd0d8").d(tx + 4, ty + 7, "#3a8a3a");
    marineCoat(d, MARINE, "#c8cedc", true);
    // Magma fist: crusted, glowing, dripping.
    d.recolor("#ff6a2a", 0, ty, d.W, d.p.height - ty, (x, y) => (x + y) % 3 === 0 ? "#ffd04a" : (x * 2 + y) % 5 === 0 ? "#6a1a0a" : null);
    for (let i = 0; i < 3; i++) d.u(d.rx + i * 2, d.rhy + 4 + i * 2, 1, 2 + i, i % 2 ? "#ff6a2a" : "#ffb03a");
    fire(d, d.rx + 2, d.rhy - 2, 7, "#c8281a", "#ff7a2a", "#ffe08a");
    wisps(d, [[d.rx + 6, d.rhy - 10, 2], [d.rx + 2, d.rhy - 13, 2]], "#5a5058");
  },
  fujitora: (d) => {
    const { ty, tx, tw, th } = d;
    d.wipeScar(["xscar"]).eyes("none").mouth("smile");
    for (const x of [d.L, d.R]) d.f(x, d.ey + 1, 3, 1, shade(d.sk, -0.5));
    d.line(d.L - 1, d.ey - 3, d.L + 3, d.ey + 3, "#a05a5a").line(d.R + 3, d.ey - 3, d.R - 1, d.ey + 3, "#a05a5a"); // the X scars
    stubble(d);
    // Purple kimono with a pattern, a sash, the white coat.
    d.recolor("#a479d9", 0, ty, d.W, d.p.height, (x, y) => (x + y) % 6 === 0 ? "#c8a8f0" : (x - y + 60) % 6 === 0 ? "#7a50b0" : null);
    d.r(tx + 1, ty + th - 6, tw - 2, 3, "#3a2a4a");
    marineCoat(d);
    // Shikomizue cane-sword and gravity rings at his feet.
    const x = d.rx + d.aw;
    d.asBody(() => d.r(x - 1, d.rhy - 4, 3, d.bottom - d.rhy + 2, ink).r(x, d.rhy - 3, 1, d.bottom - d.rhy, "#c0a060").r(x - 1, d.rhy - 6, 3, 3, "#d8c080"));
    for (let i = 0; i < 3; i++) d.u(d.legX - 4 - i * 4, d.bottom + 0 - i, 8 + i * 8 + d.gap, 1, i === 0 ? "#c8a8f0" : `${"#a479d9"}88`);
    for (const [rx, ry] of [[tx - 6, ty - 8], [tx + tw + 5, ty - 12]]) d.u(rx, ry, 3, 3, "#6a5a5a").u(rx, ry, 1, 1, "#9a8a8a");
  },
  ryokugyu: (d) => {
    const { hx, hy, hw } = d;
    d.eyes("glare", "#3a8a3a").mouth("grin");
    // Leafy green mane, vines sprouting.
    strands(d, "#4fbf62");
    d.recolor("#4fbf62", hx - 6, hy - 10, hw + 12, d.hh + 14, (x, y) => (x * 3 + y) % 13 === 0 ? "#a8f08a" : null);
    // Open shirt, white coat.
    openFront(d, 10, 4);
    d.folds("#2a5a3a", d.legY, 4);
    marineCoat(d);
    // Roots and leaves growing from the ground.
    for (let i = 0; i < 6; i++) {
      const x = d.legX - 10 + i * 6;
      for (let j = 0; j < 5 + (i % 3) * 2; j++) d.u(x + ((j >> 1) % 2), d.bottom - j, 1, 1, "#6a4a2a");
      d.u(x - 1, d.bottom - 6 - (i % 3) * 2, 3, 2, "#4fbf62").u(x, d.bottom - 7 - (i % 3) * 2, 1, 1, "#a8f08a");
    }
  },
  sengoku: (d) => {
    const { hx, hy, hw, cx, ty, tx } = d;
    d.wipeScar(["glasses"]).eyes("stern", "#3a3a2a").glasses("#8a7a50", "#e8f4f8").mouth("line");
    d.f(cx - 4, hy + 11, 8, 1, "#2a2d3a");
    d.recolor("#2a2d3a", cx - 2, hy + d.hh - 2, 6, 16, (x, y) => y % 3 === 0 ? "#4a4a5a" : null); // braided beard
    // Goat on his hat and a suit with medals.
    d.recolor("#efe8d6", hx - 2, hy - 14, hw + 4, 10, (x, y) => (x + y) % 3 === 0 ? "#ffffff" : null);
    d.suit(SHIRT, undefined, "#4a4a5a");
    for (let i = 0; i < 3; i++) d.r(tx + 3 + i * 2, ty + 5, 1, 2, i % 2 ? "#c83a3a" : gold);
    marineCoat(d, MARINE, "#c8cedc", true);
    // The golden Buddha's palms.
    for (const [x, y] of [[d.lx + 1, d.lhy + 1], [d.rx + 2, d.rhy + 1]]) {
      d.orb(x, y, 3, "#ffe070");
      for (let a = 0; a < 8; a++) { const ang = (a * Math.PI) / 4; d.u(Math.round(x + Math.cos(ang) * 5), Math.round(y + Math.sin(ang) * 5), 1, 1, "#fff0a0"); }
    }
  },
  tsuru: (d) => {
    const { hx, hy, cx, ty, th } = d;
    d.eyes("happy").mouth("smile");
    strands(d, "#c4cde0");
    d.r(cx - 1, hy - 5, 2, 2, "#3a5aa8"); // bun pin
    for (let i = 0; i < 4; i++) d.f(hx + 3 + i * 3, hy + 14, 1, 1, shade(d.sk, -0.2));
    // Pearl necklace, blue suit, and the coat.
    for (let i = -5; i <= 5; i += 2) d.d(d.tc + i, ty + 1 + Math.round((i * i) / 12), "#ffffff");
    d.folds("#3a5aa8", ty + 8, 4).belt("#2a3a6a", gold, ty + th - 6);
    marineCoat(d, MARINE, "#c8cedc", true);
    // Wash-Wash: soapy water swirling from her hand.
    for (let i = 0; i < 4; i++) bubble(d, d.rx + d.aw + 2 + i * 3, d.rhy - 4 - i * 4, 1 + (i % 2), "#a8e0ff");
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
    const { hx, hy, hw, cx, ty, tx, th } = d;
    d.eyes("glare", "#5ccfd8", "#14141c").mouth("smirk");
    d.f(cx - 2, hy + 11, 4, 1, "#2a2d3a");
    d.recolor("#f2f2f2", hx - 2, hy - 8, hw + 4, 10, (x, y) => ((x >> 1) + (y >> 1)) % 4 === 0 && (y % 4) < 2 ? "#8a6a4a" : null);
    // Long black coat with a heart emblem, yellow shirt.
    d.trim("#2a2d3a", "#5ccfd8", ty).folds("#2a2d3a", d.legY - 4, 4);
    d.r(tx + 3, ty + 5, 3, 2, "#f0d040").d(tx + 4, ty + 7, "#f0d040");
    d.belt("#1a1a22", gold, ty + th - 6);
    // Room: a glowing dome behind him; Kikoku drawn.
    const cxr = Math.floor(d.W / 2), cyr = d.bottom - 2, R = Math.floor(d.W / 2) - 1;
    for (let a = 0; a <= 180; a += 2) { const ang = (a * Math.PI) / 180; d.u(Math.round(cxr + Math.cos(ang) * R), Math.round(cyr - Math.sin(ang) * R * 1.05), 1, 1, a % 8 === 0 ? "#c8ffff" : "#5ccfd8"); }
    d.u(1, cyr, d.W - 2, 1, "#5ccfd8");
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 8, d.rhy - 28, { grip: "#1a1a22", guard: "#c8283a", edge: "#e0ffff", guardW: 6 });
  },
  "kid-awakened": (d) => {
    const { hx, hy, hw, ty, tx, tw } = d;
    d.eyes("glare", "#ff5a3c", "#a02a1a").mouth("fangs");
    d.f(d.cx - 3, hy + 12, 6, 1, "#5a1a2a"); // dark lipstick
    strands(d, "#ff5a3c");
    d.r(hx + 1, hy, hw - 2, 3, "#2a2a34").r(hx + 3, hy, 3, 2, "#ff9a5a").r(hx + hw - 6, hy, 3, 2, "#ff9a5a"); // goggles
    // Fur-lined red coat over a bare chest.
    openFront(d, 12, 5);
    d.trim("#7a2a2a", "#f0e8d8", ty).folds("#7a2a2a", d.legY - 4, 4);
    d.asBody(() => d.r(tx - 2, ty - 2, tw + 4, 3, "#f0e8d8").r(tx - 1, ty - 2, tw + 2, 1, "#ffffff"));
    // The giant magnetic arm: scrap metal, bolts and pipes, crackling red.
    d.asBody(() => {
      const ax = d.lx - 9, ay = d.lhy - 14;
      for (let j = 0; j < 18; j++) for (let i = 0; i < 12; i++) if ((i - 6) ** 2 / 36 + (j - 9) ** 2 / 81 <= 1) d.r(ax + i, ay + j, 1, 1, (i * 3 + j * 2) % 7 === 0 ? "#c8ccd8" : (i + j) % 5 === 0 ? "#5a5f6a" : (i + j * 3) % 11 === 0 ? "#b05a2a" : "#7a808c");
      for (const [bx, by] of [[3, 4], [8, 7], [4, 12], [7, 15]]) d.r(ax + bx, ay + by, 2, 2, "#e8eef4");
      d.r(ax + 2, ay + 16, 8, 3, "#4a4f5a").r(ax + 3, ay + 18, 2, 3, "#c8ccd8").r(ax + 7, ay + 18, 2, 3, "#c8ccd8");
    });
    d.bolt(d.lx - 12, d.lhy - 18, -1, 7, "#ff5a3c", "#6a1a0a").bolt(d.lx + 2, d.lhy - 20, 1, 6, "#ff5a3c", "#6a1a0a");
  },
  "sanji-ifrit-jambe": (d) => {
    const { hx, hy, ty } = d;
    d.eyes("glare", "#3a6ad0", "#c8a838").mouth("smirk");
    d.f(d.R + 2, d.ey - 4, 2, 1, "#c8a838").f(d.R + 3, d.ey - 5, 1, 1, "#c8a838"); // curly brow
    strands(d, "#f0d070");
    for (let j = 0; j < 8; j++) d.r(hx + 1, hy + 2 + j, 8 - j, 1, j % 3 === 2 ? "#c8a838" : "#f0d070"); // fringe swept over one eye
    d.r(d.cx + 2, hy + 13, 5, 1, "#f4f4f4").d(d.cx + 7, hy + 13, "#ff7a3a");
    for (let i = 0; i < 5; i++) d.u(d.cx + 8 + (i % 2), hy + 12 - i * 2, 1, 2, "#d0d6de");
    // Black suit, blue shirt and tie.
    d.suit("#5a8ad8", "#2a3a8a", "#4a4f5a").buttons("#c8ccd8", 2, ty + 12);
    d.folds("#2a2d3a", d.legY, 3);
    // Ifrit Jambe: blue fire climbing both legs.
    for (const [x, h] of [[d.legX - 3, 14], [d.legX + d.gap + 9, 14], [d.legX + 3, 8], [d.legX + d.gap + 3, 8], [d.legX - 6, 8], [d.legX + d.gap + 12, 8]] as [number, number][]) fire(d, x, d.bottom - 1, h, "#1a4ad8", "#5ab0ff", "#e8f8ff");
    d.recolor("#2a2d3a", 0, d.legY + 2, d.W, d.legH + 4, (x, y) => { const k = (x * 7 + y * 3 + (y >> 2)) % 6; return k < 2 ? "#5ab0ff" : k === 2 ? "#e8f8ff" : k === 3 ? "#2a5ad8" : null; });
  },
  "rob-lucci-awakened": (d) => {
    const { hy, hw, ty } = d;
    d.eyes("glare", "#ffd04a", "#a8884a").mouth("fangs");
    // A thick rounded mane framing the face.
    const mane = new Map<string, string>();
    const mx = d.cx, my = hy + 8, R = hw / 2 + 5;
    for (let j = -R; j <= R + 2; j++) for (let i = -R; i <= R; i++) {
      const rr = i * i + (j * 0.9) ** 2, edge = R + ((Math.atan2(j, i) * 6) % 2 > 1 ? 1 : 0);
      if (rr <= edge * edge) mane.set(`${mx + i},${my + j}`, rr > (R - 3) ** 2 ? ((i + j) % 3 === 0 ? "#d8d0c0" : "#f8f0e0") : (i * 2 + j) % 5 === 0 ? "#ffffff" : "#f0e8d8");
    }
    blob(d, mane, () => false);
    // White fur with golden rosettes.
    for (const fam of ["#f2ece0", "#e8c26a"]) d.recolor(fam, 0, 0, d.W, d.p.height, (x, y) => ((x * 3 + y * 5) % 13 === 0) ? "#c89a3a" : ((x * 3 + y * 5) % 13 === 1) ? "#8a6a2a" : null);
    d.recolor("#f8f0e0", 0, 0, d.W, ty + 4, (x, y) => (x + y) % 3 === 0 ? "#ffffff" : (x * 2 + y) % 5 === 0 ? "#d8d0c0" : null);
    d.f(d.cx - 1, hy + 10, 2, 2, "#d87a8a"); // nose
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) d.f(d.cx + s * (3 + i), hy + 11 + i % 2, 1, 1, "#8a7a6a"); // whiskers
    // Claws gleaming.
    for (const [x, y] of [[d.lx, d.lhy + 4], [d.rx, d.rhy + 4]]) for (let i = 0; i < 3; i++) d.r(x + i * 2, y, 1, 3, "#ffffff");
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
    { margin: MARGIN[id], aura: (p, body, a, fr) => shapeAura(p, body, a, fr, 3, true) });
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

