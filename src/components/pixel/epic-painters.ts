import type { ChestCharacterId } from "@/data/chest-characters";
import type { Look } from "./chest-looks";
import { ink, white, gold, shade } from "./kit";
import { blob, type Detail, type Painter } from "./mythic-hd";
import { strands, repaint, stubble, openFront, muscles, bareTorso, sword, wisps, wings } from "./legendary-hd";

// Hand-drawn detail passes for the Epic roster, painted on the 2× figure.
// Left/right below are the viewer's unless it says "his/her left".

/** Tweaks to the chest looks for the HD version (mostly: the painter draws its own weapon or effect). */
export const EPIC_LOOK: Partial<Record<ChestCharacterId, Partial<Look>>> = {
  sabo: { x: ["scar:#d07a6a"], ow: true },
  "eustass-kid": { x: ["^goggles:#f0c040", "lips:#5a2a4a"], t: "#2a2d3a" },
  killer: { ow: true, x: ["killermask:#f2f2f2:#3a6ab8"] },
  "rob-lucci": { x: [] },
  "kaku-awakened": { ow: true, l: "#2a2d3a", sh: "#1e1e28" },
  "luffy-enies-lobby": { x: ["scar:#c05a4a", "open:#f4c69c"] },
  "luffy-gear-2": { x: ["open:#ff9a9a"] },
  "luffy-gear-3": { x: ["open:#f4c69c"] },
  "gecko-moria": { x: [] },
  magellan: { t: "#3a2a4a", sl: "#3a2a4a", l: "#2a2030", x: ["^horns:#2a2030"] },
  ivankov: { x: [], t: "#2a2d3a", l: "#2a2d3a", coat: "#8a2a6a" },
  inazuma: { ow: true, h: "#f2f2f2", hs: "slick", x: ["shades:#1a1d28"], t: "#f2f2f2", l: "#2a2d3a" },
  shiryu: { x: ["goatee:#1e2230"], t: "#2a2d3a", coat: "#3a3f52", ow: true },
  "boa-hancock": { x: ["earrings:#f0c040"], l: "#d9445c" },
  doflamingo: { x: ["grin"], l: "#f08a5a" },
  "charlotte-cracker": { x: [] },
  "charlotte-smoothie": { hs: "long", h: "#c8d0ec", t: "#2a2d3a", l: "#2a2d3a", coat: "#e8f2f8", x: [] },
  "charlotte-oven": { x: ["^horns:#f0763a"] },
  "charlotte-daifuku": { x: ["stache:#2a2d3a"], t: "#d8a36a", sl: "#d8a36a", l: "#7a3a5a" },
  "charlotte-perospero": { hs: "long", x: [] },
  "charlotte-brulee": { x: ["longnose:#e8b8a0"] },
  pedro: { x: ["patch", "^ears:#c07a2a:round"], t: "#3a4a3a", ow: true },
  carrot: { t: "#a8d4f0" },
  wanda: { h: "#f2ece0", sk: "#f2ece0", hs: "long", x: ["^ears:#f2ece0:dog"], t: "#8a7a5a" },
  denjiro: { hs: "long", t: "#4a3a7a", x: ["shades:#3a3f52"] },
  kinemon: { x: [], ow: true },
  "ashura-doji": { x: [], t: "#5a4030", ow: true },
  kawamatsu: { x: [] },
  kanjuro: { sk: "#f4f0ea", x: [] },
  "x-drake": { x: ["tail:#7a6a4a"], ow: true },
  "basil-hawkins": { x: [], ow: true },
  "scratchmen-apoo": { x: [], ow: true },
  urouge: { x: [], t: "#e0e6ee", l: "#7a5a8a" },
  "capone-bege": { ow: true },
  "jewelry-bonney": { x: [], t: "#2a2d3a", l: "#f08a3a" },
  sentomaru: { x: [], ow: true },
};

/** Extra transparent canvas (HD pixels per side) for wide weapons and effects. */
export const EPIC_MARGIN: Partial<Record<ChestCharacterId, number>> = {
  sabo: 6, "eustass-kid": 6, killer: 8, "rob-lucci": 2, "kaku-awakened": 6, "luffy-enies-lobby": 12, "luffy-gear-2": 4, "luffy-gear-3": 10, "gecko-moria": 6,
  magellan: 10, ivankov: 4, inazuma: 6, shiryu: 6, "boa-hancock": 10, doflamingo: 8, "charlotte-cracker": 6, "charlotte-smoothie": 6, "charlotte-oven": 6,
  "charlotte-daifuku": 10, "charlotte-perospero": 6, "charlotte-brulee": 8, pedro: 8, carrot: 6, wanda: 6, denjiro: 8, kinemon: 8, "ashura-doji": 8,
  kawamatsu: 4, kanjuro: 10, "x-drake": 8, "basil-hawkins": 10, "scratchmen-apoo": 8, urouge: 8, "capone-bege": 8, "jewelry-bonney": 6, sentomaru: 10,
};

// ---------- Helpers ----------
/** Coloured flames licking up from a point (drawn only into empty space). */
function flames(d: Detail, x: number, y: number, spread: number, h: number, outer: string, mid: string, core: string) {
  for (let i = -spread; i <= spread; i++) d.flame(x + i * 2, y, Math.max(3, h - Math.abs(i) * 3 + ((i + 7) % 2)), [core, mid, outer]);
  return d;
}
/** Polka dots over a cloth colour. */
function dots(d: Detail, family: string, c: string, every = 4, x = 0, y = d.ty, w = d.W, h = d.p.height - d.ty) {
  return d.recolor(family, x, y, w, h, (i, j) => i % every === 1 && j % every === 1 ? c : null);
}
/** Puffs of steam drifting off the body. */
function steam(d: Detail, list: [number, number, number][], c = "#f4eef0") { return wisps(d, list, c); }
/** A crescent blade around a hand. `dir` = which way it curves out. */
function crescent(d: Detail, x: number, y: number, r: number, dir: 1 | -1, steel = "#c8d2e0") {
  d.asBody(() => {
    for (let a = -70; a <= 70; a += 4) {
      const t = (a * Math.PI) / 180, px = Math.round(x + dir * Math.cos(t) * r), py = Math.round(y + Math.sin(t) * r);
      const w = Math.abs(a) < 30 ? 3 : Math.abs(a) < 55 ? 2 : 1;
      for (let k = 0; k < w; k++) d.r(px - dir * k, py, 1, 1, k === 0 ? white : k === 1 ? steel : shade(steel, -0.4));
    }
    d.r(x - 1, y - 1, 3, 3, "#5a5f6a");
  });
  return d;
}
/** Thin speed lines trailing behind a moving part. */
function speedLines(d: Detail, x0: number, x1: number, ys: number[], c = "#ffffffa0") {
  for (const y of ys) d.u(Math.min(x0, x1), y, Math.abs(x1 - x0), 1, c);
  return d;
}

// ---------- Painters ----------
export const EPIC_PAINTERS: Partial<Record<ChestCharacterId, Painter>> = {
  sabo: (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    // The burn scar around his left eye, under the eye itself.
    d.wipeScar();
    for (let j = -4; j <= 4; j++) for (let i = -2; i <= 4; i++) if (i * i + j * j * 0.7 <= 12) d.f(d.R + i, d.ey + j, 1, 1, (i + j) % 3 === 0 ? "#c86a5a" : "#e0907a");
    d.eyes("stern", "#2a3a8a", "#a88a3a").mouth("smile");
    strands(d, "#f0d070");
    // Wavy blond locks out from under the hat.
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - (i % 2), hy + 2 + i * 3, 2, 3, i % 2 ? "#c8a840" : "#f0d070"); d.r(hx + hw + (i % 2), hy + 2 + i * 3, 2, 3, i % 2 ? "#f0d070" : "#c8a840"); } });
    // Top hat with a blue band and goggles on the brim.
    d.asBody(() => {
      d.r(hx - 1, hy - 4, hw + 2, 2, "#3a5aa8").r(hx - 1, hy - 4, hw + 2, 1, "#5a7ad0");
      for (const gx of [hx + 2, hx + hw - 7]) d.r(gx, hy - 5, 5, 4, ink).r(gx + 1, hy - 4, 3, 2, "#8ac8f0").d(gx + 1, hy - 4, white).r(gx, hy - 3, 5, 1, "#c8a050");
    });
    // White cravat ruffle, blue tailcoat with gold buttons, a dark blue cape.
    d.r(tc - 3, ty + 1, 6, 6, "#f4f6fa").r(tc - 2, ty + 2, 4, 1, "#d8dce6").r(tc - 3, ty + 4, 6, 1, "#d8dce6").r(tc - 1, ty + 7, 2, 2, "#e8ecf2");
    d.buttons(gold, 3, ty + 9, 3);
    d.trim("#2a3a6a", "#5a7ad0", ty).folds("#2a3a6a", d.legY - 4, 4);
    d.belt("#3a2a20", gold, ty + th - 5);
    // The metal pipe, and Flame-Flame fire around his fist.
    d.asBody(() => { d.line(d.rx + 2, d.rhy + 6, d.rx + 9, d.rhy - 20, ink).line(d.rx + 3, d.rhy + 6, d.rx + 10, d.rhy - 20, "#5a5f72").line(d.rx + 4, d.rhy + 5, d.rx + 11, d.rhy - 20, "#9aa0b4"); });
    flames(d, d.lx - 1, d.lhy + 3, 3, 16, "#e8401a", "#ff9a2a", "#fff0a0");
    d.r(d.lx, d.lhy, d.aw, 3, "#ffb84a");
    for (const [x, y] of [[d.lx - 6, d.lhy - 12], [d.lx + 5, d.lhy - 15], [d.lx - 3, d.lhy - 18]]) d.u(x, y, 1, 1, "#ffcf6a");
    void tx; void tw;
  },
  "eustass-kid": (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#e8c040", "#a82a1a").mouth("smirk");
    d.f(d.cx - 2, hy + 12, 4, 2, "#5a2a4a").f(d.cx - 1, hy + 12, 2, 1, "#7a3a6a"); // dark lipstick
    // Flaming red hair swept up by the goggles.
    strands(d, "#e84b3c");
    d.asBody(() => { for (let i = 0; i < 6; i++) d.r(hx + 1 + i * 3, hy - 8 + (i % 2) * 2, 2, 5 - (i % 2), i % 2 ? "#c8301e" : "#ff6a4a"); });
    // Bare chest with a stitched scar, under a dark red fur coat with a black fur collar.
    bareTorso(d, "#2a2d3a", 2);
    for (let i = 0; i < 8; i++) d.d(tc - 5 + i, ty + 4 + Math.floor(i * 0.8), "#a85a4a").d(tc - 5 + i, ty + 3 + Math.floor(i * 0.8) + (i % 2 ? 2 : 0), "#e8b0a0");
    d.recolor("#7a2a2a", 0, ty, d.W, d.p.height - ty, (x, y) => (x * 3 + y * 5) % 7 === 0 ? "#a83a32" : (x + y * 2) % 9 === 0 ? "#4a1818" : null);
    d.asBody(() => { for (let i = 0; i < tw + 8; i += 2) d.r(tx - 4 + i, ty - 2 + (i % 4 === 0 ? 0 : 1), 2, 3, i % 4 ? "#1e1a1e" : "#3a323a"); });
    d.belt("#1e1a1e", "#c8a050", ty + th - 5);
    // His left arm: a heavy mechanical prosthetic with a magnetic scrap fist crackling red.
    d.asBody(() => {
      d.recolor(d.sk, d.rx - 1, ty - 1, d.aw + 2, d.rhy - ty + 4, (x, y) => y % 4 === 0 ? "#6a7280" : (x + y) % 3 === 0 ? "#e0e6ee" : "#a8b0bc");
      const ax = d.rx - 2, ay = d.rhy - 2;
      for (let j = 0; j < 11; j++) for (let i = 0; i < 11; i++) if ((i - 5) ** 2 + (j - 5) ** 2 <= 28) d.r(ax + i, ay + j, 1, 1, (i * 3 + j * 2) % 7 === 0 ? "#e8eef4" : (i + j) % 5 === 0 ? "#5a5f6a" : (i + j * 3) % 11 === 0 ? "#b05a2a" : "#8a909c");
    });
    d.bolt(d.rx + 9, d.rhy - 6, 1, 6, "#ff5a3c", "#6a1a0a").bolt(d.rx - 3, d.rhy - 8, -1, 5, "#ff5a3c", "#6a1a0a");
    for (const [x, y] of [[d.rx + 11, d.rhy + 8], [d.rx + 4, d.rhy - 10]]) d.u(x, y, 2, 2, "#8a909c").u(x, y, 1, 1, "#e8eef4");
  },
  killer: (d) => {
    const { hx, hy, hw, hh, tx, ty, tw } = d;
    // The white helmet-mask: rows of dark breathing holes and a blue stripe down each side.
    d.asBody(() => {
      d.r(hx + 1, hy + 1, hw - 2, hh - 1, "#f2f2f2").r(hx + 1, hy + 1, 2, hh - 1, "#ffffff").r(hx + hw - 3, hy + 1, 2, hh - 1, "#c8ccd8");
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) d.r(hx + 4 + i * 2 + (j % 2), hy + 4 + j * 2, 1, 1, "#1e2a4a");
      d.r(hx + 2, hy + 3, 1, hh - 4, "#3a6ab8").r(hx + hw - 3, hy + 3, 1, hh - 4, "#3a6ab8").r(hx + 2, hy + hh - 1, hw - 4, 1, "#a8b0c4");
    });
    // A huge wild blond mane spilling over his shoulders.
    const mane = new Map<string, string>();
    for (let j = -6; j <= hh + 10; j++) for (let i = -6; i <= hw + 5; i++) {
      const inHead = i >= 1 && i < hw - 1 && j >= 1;
      const r = j < 2 ? 1 : 0;
      if (inHead || r && (i < -3 + (j + 6) / 3 || i > hw + 2 - (j + 6) / 3)) continue;
      if (j > hh + 2 && i > 1 && i < hw - 2) continue;
      if (j > hh + 10 - ((i * 3) % 5)) continue;
      mane.set(`${hx + i},${hy + j}`, (i * 2 + j) % 5 === 0 ? "#c8a050" : (i + j * 3) % 7 === 0 ? "#fff0b0" : "#f0d888");
    }
    blob(d, mane, (x, y) => y < hy + 1 || x < hx || x >= hx + hw);
    // White shirt with black polka dots, blue trousers, a brown sash.
    dots(d, "#f2f2f2", "#1e1e28", 4, tx, ty, tw, d.th);
    d.r(tx, ty + d.th - 5, tw, 2, "#6a4a2a").r(tx, ty + d.th - 5, tw, 1, "#8a6a3a");
    // Punisher: a scythe blade spinning out of each wrist.
    crescent(d, d.lx + 1, d.lhy + 1, 8, -1);
    crescent(d, d.rx + d.aw - 2, d.rhy + 1, 8, 1);
  },
  "rob-lucci": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("line");
    // Long wavy black hair, a black top hat with a white band, a pointed goatee.
    strands(d, "#2a2d3a");
    d.asBody(() => { for (let i = 0; i < 4; i++) { d.r(hx - 2 + (i % 2), hy + 3 + i * 4, 2, 4, i % 2 ? "#3a3d4a" : "#1e1a22"); d.r(hx + hw - (i % 2), hy + 3 + i * 4, 2, 4, i % 2 ? "#1e1a22" : "#3a3d4a"); } });
    d.asBody(() => d.r(hx - 1, hy - 3, hw + 2, 1, "#c8ccd8"));
    d.f(cx - 3, hy + 11, 6, 1, "#1e1a22").f(cx - 1, hy + 13, 2, 1, "#1e1a22");
    d.asBody(() => d.r(cx - 1, hy + d.hh, 2, 3, "#1e1a22").d(cx, hy + d.hh + 3, "#1e1a22"));
    // Black suit with lapels, a white shirt and tie, black gloves.
    d.suit("#f4f6fa", "#f4f6fa", "#3a3d4a");
    d.r(tc - 1, ty + 2, 2, 8, "#e0e4ea").r(tc - 1, ty + 2, 2, 1, "#c8ccd8");
    d.r(d.lx, d.lhy, d.aw, 3, "#1e1a22").r(d.rx, d.rhy, d.aw, 3, "#1e1a22");
    // Hattori on his shoulder in his little tie, and Shigan: a finger jab leaving a white streak.
    d.asBody(() => {
      const bx = tx + tw - 2, by = ty - 7;
      d.r(bx, by, 7, 6, "#ffffff").r(bx + 1, by + 1, 5, 4, "#f2f2f2").d(bx + 5, by + 1, ink).r(bx + 7, by + 2, 2, 1, "#f08a3a").r(bx + 2, by + 5, 2, 2, "#1e1e28").r(bx - 1, by + 2, 2, 3, "#e0e0e8");
    });
    speedLines(d, d.lx - 10, d.lx - 1, [d.lhy, d.lhy + 2], "#ffffffb0");
  },
  "kaku-awakened": (d) => {
    const { hx, hy, hw, hh, cx, ty, tx, tw } = d;
    // Giraffe hybrid: patchwork spots over all his fur, his famous long square nose.
    d.recolor(d.sk, 0, 0, d.W, d.p.height, (x, y) => { const k = ((x >> 2) * 7 + (y >> 2) * 13) % 5; return k === 0 && (x + y) % 4 !== 0 ? "#a8642a" : null; });
    d.eyes("stern", "#2a2a2a", "#7a4a1a");
    // His long, square nose jutting straight out of his face.
    d.asBody(() => d.r(cx - 1, hy + 10, hw / 2 + 9, 4, ink).r(cx, hy + 11, hw / 2 + 7, 2, "#f6cf80").r(cx, hy + 11, hw / 2 + 7, 1, "#ffe0a0").d(cx + hw / 2 + 6, hy + 12, "#7a4a1a"));
    d.f(cx - 4, hy + 14, 3, 1, shade(d.sk, -0.55));
    // Ossicones and a short mane down the back of his neck.
    d.asBody(() => { for (const x of [hx + 2, hx + hw - 4]) d.r(x, hy - 6, 2, 6, "#c88a3a").r(x - 1, hy - 8, 4, 3, "#7a4a1a"); for (let j = 0; j < 8; j++) d.u(hx + hw, hy + 2 + j * 2, 2, 2, "#7a4a1a"); });
    // Black CP0-style trousers and two katana held in a reverse grip for Amane Dachi.
    sword(d, d.lx + 1, d.lhy, d.lx - 12, d.lhy - 18, { grip: "#2a2238" });
    sword(d, d.rx + d.aw - 2, d.rhy, d.rx + d.aw + 11, d.rhy - 18, { grip: "#2a2238" });
    void hh; void ty; void tx; void tw;
  },
  "luffy-enies-lobby": (d) => {
    const { hx, hy, hw, tc, ty } = d;
    d.wipeScar().eyes("glare", "#14141c", "#14141c").mouth("grin");
    d.f(d.L + 1, d.ey + 3, 3, 1, "#b04a3a").f(d.L + 2, d.ey + 2, 1, 3, "#b04a3a"); // the scar under his eye
    strands(d, "#1e2230");
    // Straw hat with the red band.
    d.asBody(() => d.r(hx - 1, hy - 3, hw + 2, 2, "#d83a3a").r(hx - 1, hy - 3, hw + 2, 1, "#ff6a5a"));
    d.recolor("#e8c060", hx - 6, hy - 10, hw + 12, 10, (x, y) => (x + y) % 3 === 0 ? "#c8a040" : null);
    // Open red vest over the bare chest, blue shorts with rolled cuffs.
    d.r(tc - 1, ty + 4, 2, 1, shade(d.sk, -0.24));
    // Gomu Gomu no Pistol: his arm stretched out to a fist, with speed lines.
    d.asBody(() => {
      const y = d.rhy - 4, x0 = d.rx + d.aw - 1, x1 = x0 + 14;
      d.r(x0, y, x1 - x0, 4, ink).r(x0, y + 1, x1 - x0, 2, d.sk).r(x0, y + 1, x1 - x0, 1, shade(d.sk, 0.2));
      d.r(x1, y - 2, 7, 8, ink).r(x1 + 1, y - 1, 5, 6, d.sk).r(x1 + 1, y - 1, 5, 1, shade(d.sk, 0.25)).r(x1 + 5, y, 1, 4, shade(d.sk, -0.3)).d(x1 + 3, y + 1, shade(d.sk, -0.3)).d(x1 + 3, y + 3, shade(d.sk, -0.3));
    });
    speedLines(d, d.rx + d.aw + 2, d.rx + d.aw + 14, [d.rhy - 7, d.rhy + 2, d.rhy + 4], "#ffffff90");
    d.clear(d.rx, d.rhy, d.aw, 2);
  },
  "luffy-gear-2": (d) => {
    const { hx, hy, hw, tc, ty } = d;
    d.eyes("glare", "#14141c", "#14141c").mouth("grin");
    d.f(d.L + 1, d.ey + 3, 3, 1, "#c0504a").f(d.L + 2, d.ey + 2, 1, 3, "#c0504a");
    strands(d, "#1e2230");
    d.asBody(() => d.r(hx - 1, hy - 3, hw + 2, 2, "#d83a3a").r(hx - 1, hy - 3, hw + 2, 1, "#ff6a5a"));
    d.recolor("#e8c060", hx - 6, hy - 10, hw + 12, 10, (x, y) => (x + y) % 3 === 0 ? "#c8a040" : null);
    // Flushed pink skin glistening with heat, steam pouring off his whole body.
    d.recolor(d.sk, 0, 0, d.W, d.p.height, (x, y) => (x * 3 + y * 2) % 11 === 0 ? "#ffc8c8" : null);
    d.r(tc - 1, ty + 4, 2, 1, shade(d.sk, -0.24));
    steam(d, [[hx - 4, hy + 2, 3], [hx + hw + 3, hy - 2, 3], [hx - 6, ty + 8, 3], [hx + hw + 5, ty + 6, 3], [d.legX - 5, d.legY + 4, 2], [d.legX + d.gap + 12, d.legY + 2, 2], [hx + 3, hy - 13, 2], [hx + hw - 2, hy - 15, 2]]);
    speedLines(d, d.lx - 6, d.lx - 1, [d.lhy - 6, d.lhy - 2], "#ffd0d090");
  },
  "luffy-gear-3": (d) => {
    const { hx, hy, hw, tc, ty } = d;
    d.eyes("glare", "#14141c", "#14141c").mouth("grin");
    d.f(d.L + 1, d.ey + 3, 3, 1, "#b04a3a").f(d.L + 2, d.ey + 2, 1, 3, "#b04a3a");
    strands(d, "#1e2230");
    d.asBody(() => d.r(hx - 1, hy - 3, hw + 2, 2, "#d83a3a").r(hx - 1, hy - 3, hw + 2, 1, "#ff6a5a"));
    d.recolor("#e8c060", hx - 6, hy - 10, hw + 12, 10, (x, y) => (x + y) % 3 === 0 ? "#c8a040" : null);
    d.r(tc - 1, ty + 4, 2, 1, shade(d.sk, -0.24));
    // Gigant Pistol: a colossal inflated fist with knuckles, swelling up from his arm.
    d.asBody(() => {
      const cx0 = d.rx + 6, cy0 = d.rhy - 6, R = 10;
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const q = i * i + j * j;
        if (q > R * R + R) continue;
        d.r(cx0 + i, cy0 + j, 1, 1, q > (R - 1) * (R - 1) + R - 1 ? ink : i + j < -R * 0.6 ? shade(d.sk, 0.28) : i + j > R * 0.7 ? shade(d.sk, -0.22) : d.sk);
      }
      for (let k = 0; k < 4; k++) d.r(cx0 - 6 + k * 4, cy0 - 7, 1, 5, shade(d.sk, -0.35)).r(cx0 - 7 + k * 4, cy0 - 8, 3, 1, shade(d.sk, 0.35));
      d.r(cx0 - 8, cy0 + 1, 10, 1, shade(d.sk, -0.35)).r(cx0 - 8, cy0 + 2, 4, 3, shade(d.sk, -0.12));
    });
    steam(d, [[d.rx + 18, d.rhy - 18, 2], [d.rx - 2, d.rhy - 18, 2]]);
  },
  "gecko-moria": (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#d84040", "#2a1e3a").mouth("none");
    // Kishishi: a huge toothy grin, and the stitches across his neck.
    d.r(cx - 6, hy + 10, 12, 1, ink).r(cx - 6, hy + 11, 12, 3, white).r(cx - 6, hy + 14, 12, 1, ink);
    for (let i = 0; i < 6; i++) d.d(cx - 5 + i * 2, hy + 12 + (i % 2), ink);
    for (let i = 0; i < 6; i++) d.d(cx - 6 + i * 2, hy + hh + 1, "#5a4a6a").d(cx - 5 + i * 2, hy + hh, "#5a4a6a");
    // A tall swept-back crest of dark purple hair.
    d.asBody(() => { for (let i = 0; i < 5; i++) d.r(hx + 2 + i * 4, hy - 9 + Math.abs(i - 2) * 2, 3, 10 - Math.abs(i - 2) * 2, i % 2 ? "#3a2a5a" : "#5a3a8a"); });
    strands(d, "#4a3a6a");
    // Black high-collared cape lined in purple, with a feathery fur collar.
    d.asBody(() => { for (let i = 0; i < tw + 12; i += 2) d.r(tx - 6 + i, ty - 3 - (i % 4 ? 0 : 2), 2, 4, i % 4 ? "#2a1e3a" : "#4a3a6a"); });
    d.recolor("#5a3a8a", 0, ty, d.W, d.p.height - ty, (x, y) => (x + y) % 6 === 0 ? "#3a2a5a" : null);
    d.belt("#d8c070", null, ty + th - 6);
    d.buttons("#d8c070", 3, ty + 4, 4);
    // His shadow bats fluttering around him.
    for (const [x, y] of [[tx - 10, ty + 2], [tx + tw + 6, ty - 4], [tx + tw + 8, ty + 12], [tx - 12, ty + 16]]) d.u(x, y, 5, 1, "#1a1222").u(x + 1, y - 1, 1, 1, "#1a1222").u(x + 3, y - 1, 1, 1, "#1a1222").u(x + 2, y + 1, 1, 1, "#1a1222").u(x + 2, y, 1, 1, "#d84040");
    void tc;
  },
  magellan: (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#5a2a8a", "#14141c").mouth("line");
    d.f(cx - 3, hy + 13, 6, 1, shade(d.sk, -0.4)); // heavy jaw
    // The horned devil hood and the bat wings of the Chief Warden's uniform.
    d.asBody(() => {
      d.r(hx - 1, hy - 2, hw + 2, 4, "#2a2030").r(hx - 1, hy + 2, 2, hh - 4, "#2a2030").r(hx + hw - 1, hy + 2, 2, hh - 4, "#2a2030").r(hx, hy - 2, hw, 1, "#4a3a5a");
      for (const [x, s] of [[hx - 2, -1], [hx + hw, 1]] as [number, number][]) for (let k = 0; k < 7; k++) d.r(x + s * Math.floor(k / 2), hy - 2 - k, 2, 1, k > 4 ? "#6a5a7a" : "#2a2030");
    });
    for (const s of [-1, 1]) for (let k = 0; k < 12; k++) {
      const x = s < 0 ? tx - 2 - k : tx + tw + 1 + k, y = ty - 6 + Math.abs(k - 5);
      d.u(x, y, 1, 10 - Math.floor(k / 2) + (k % 3 === 0 ? 2 : 0), k % 3 === 0 ? "#2a1e3a" : "#4a3a6a");
    }
    // Uniform with a gold rope belt, the Impel Down buttons.
    d.buttons("#c8a050", 4, ty + 4, 4).belt("#c8a050", "#c8a050", ty + th - 6);
    // Venom Hydra: a purple poison dragon rearing from his hand, dripping.
    d.asBody(() => {
      const x0 = d.rx + 2, y0 = d.rhy;
      for (let k = 0; k < 16; k++) { const x = x0 + Math.round(Math.sin(k / 3) * 3) + Math.floor(k / 3), y = y0 - k; d.r(x, y, 4, 2, k % 3 ? "#9a4ad8" : "#c88af0"); }
      const hx2 = x0 + 6, hy2 = y0 - 22;
      d.r(hx2 - 2, hy2, 10, 6, "#8a3ac8").r(hx2 - 1, hy2 + 1, 8, 2, "#c88af0").r(hx2 + 6, hy2 + 3, 4, 3, "#8a3ac8").r(hx2 + 1, hy2 + 1, 2, 1, "#fff04a");
      for (let i = 0; i < 3; i++) d.r(hx2 + 4 + i * 2, hy2 + 6, 1, 2, white);
    });
    for (const [x, y] of [[d.rx + 3, d.rhy + 4], [d.rx + 8, d.rhy - 6], [d.rx + 12, d.rhy - 13]]) d.u(x, y, 1, 2, "#b86af0");
    void tc;
  },
  ivankov: (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    // Make-up: heavy blue eyeshadow, long lashes, bright red lips.
    d.eyes("stern", "#5a2a8a", "#3a1a4a");
    for (const x of [d.L, d.R]) d.f(x - 1, d.ey - 2, 5, 2, "#4a8ae8").f(x - 1, d.ey - 3, 1, 1, ink).f(x + 3, d.ey - 3, 1, 1, ink);
    d.f(cx - 3, hy + 12, 6, 2, "#e8203a").f(cx - 2, hy + 12, 4, 1, "#ff6a7a").f(cx - 3, hy + 13, 6, 1, "#a8101a");
    // A colossal purple afro.
    const afro = new Map<string, string>(), acx = cx, acy = hy - 2, R = hw / 2 + 7;
    for (let j = -R; j <= R; j++) for (let i = -R - 3; i <= R + 3; i++) {
      if ((i * i) / ((R + 3) * (R + 3)) + (j * j) / (R * R) > 1) continue;
      const x = acx + i, y = acy + j;
      if (y > hy + 3 && x > hx && x < hx + hw - 1) continue;
      afro.set(`${x},${y}`, (i * 3 + j * 5) % 7 === 0 ? "#e8a8ff" : (i + j * 2) % 5 === 0 ? "#8a4aa8" : "#c27adf");
    }
    blob(d, afro, (x, y) => y < hy + 3 || x < hx || x >= hx + hw);
    // Fishnet top over the chest, black shorts, a crimson cape with a white fur collar.
    d.recolor("#2a2d3a", tx, ty, tw, th - 4, (x, y) => (x + y) % 3 === 0 || (x - y + 99) % 3 === 0 ? null : d.sk);
    d.asBody(() => { for (let i = 0; i < tw + 8; i += 2) d.r(tx - 4 + i, ty - 2 + (i % 4 ? 1 : 0), 2, 3, i % 4 ? "#f4f4f8" : "#d8d8e4"); });
    d.trim("#8a2a6a", "#e8a8ff", ty);
    // Hormone injection claws on one hand.
    d.asBody(() => { for (let i = 0; i < 4; i++) d.line(d.rx + i, d.rhy + 2, d.rx + i * 2 + 1, d.rhy + 9, i % 2 ? "#e0e6ee" : "#c8a8ff"); });
    d.sparkle(d.rx + 9, d.rhy + 10, "#ff9af0");
    void hh; void tc;
  },
  inazuma: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw } = d;
    d.mouth("line");
    // Wavy hair split down the middle: white on one side, red on the other.
    strands(d, "#f2f2f2");
    d.recolor("#f2f2f2", cx, hy - 10, hw, 14, (x, y) => (x + y) % 5 === 0 ? "#a82030" : "#d83a4a");
    d.recolor("#f2f2f2", hx - 4, hy - 10, cx - hx + 4, 14, () => null);
    // Dark round shades.
    d.r(d.L - 1, d.ey - 1, 4, 3, ink).r(d.R, d.ey - 1, 4, 3, ink).r(d.L + 3, d.ey, d.R - d.L - 3, 1, ink).d(d.L, d.ey - 1, "#5a6a8a").d(d.R + 1, d.ey - 1, "#5a6a8a");
    // A suit split the same way, white and black, with a red tie.
    d.recolor("#f2f2f2", cx, ty, tw, d.th, () => "#2a2d3a");
    d.r(tc - 1, ty + 1, 2, 9, "#d83a4a").r(tc - 1, ty + 1, 2, 2, "#a82030");
    // Snip-Snip: his hand is a giant pair of scissors, and a wine glass in the other.
    d.asBody(() => {
      const x0 = d.rx + 2, y0 = d.rhy + 1;
      d.line(x0, y0, x0 + 12, y0 - 10, ink).line(x0 + 1, y0, x0 + 13, y0 - 10, "#e0e6ee").line(x0 + 1, y0 + 1, x0 + 13, y0 - 9, "#9aa0aa");
      d.line(x0, y0 - 6, x0 + 13, y0 + 2, ink).line(x0 + 1, y0 - 6, x0 + 14, y0 + 2, "#e0e6ee").line(x0 + 1, y0 - 5, x0 + 14, y0 + 3, "#9aa0aa");
      d.r(x0 + 4, y0 - 4, 3, 3, "#d83a4a");
      const gx = d.lx - 5, gy = d.lhy - 6;
      d.r(gx, gy, 5, 4, "#e8f0f8").r(gx + 1, gy + 1, 3, 2, "#a8203a").r(gx + 2, gy + 4, 1, 3, "#e8f0f8").r(gx, gy + 7, 5, 1, "#e8f0f8");
    });
    void tx;
  },
  shiryu: (d) => {
    const { hx, hy, hw, cx, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a3a4a", "#14141c").mouth("smirk");
    // Long straight black hair, a cigar trailing smoke.
    strands(d, "#2a2d3a");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - i, hy + 4 + i * 4, 2, 6, "#1e2230"); d.r(hx + hw + i, hy + 4 + i * 4, 2, 6, "#1e2230"); } });
    d.r(cx + 2, hy + 13, 6, 2, "#6a3a1a").d(cx + 8, hy + 13, "#ff7a3a");
    for (let i = 0; i < 7; i++) d.u(cx + 9 + ((i >> 1) % 2), hy + 12 - i * 2, 1, 2, "#b8c0cc");
    // Long dark coat, his sword Raiu held point-down and dripping.
    d.trim("#3a3f52", "#5a6a88", ty).folds("#3a3f52", d.legY - 4, 4);
    d.belt("#1e1e28", "#9aa0aa", ty + th - 6);
    sword(d, d.rx + 1, d.rhy, d.rx + 6, d.bottom - 2, { steel: "#a8b4c8", grip: "#1e1e28", guard: "#5a6a88" });
    for (const [x, y] of [[d.rx + 7, d.bottom - 6], [d.rx + 4, d.bottom]]) d.u(x, y, 1, 2, "#a83a4a");
    // Clear-Clear: his legs fading out of sight.
    for (let y = d.legY + 4; y <= d.bottom; y++) for (let x = d.legX - 2; x < d.legX + d.gap + 12; x++) if ((x + y) % 2 === 0 && y > d.legY + 4 + ((x * 3) % 5)) { const c = d.at(x, y); if (c) d.d(x, y, `${c}55`); }
    void tx; void tw;
  },
  "boa-hancock": (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#2a3a8a", "#14141c").mouth("smile");
    for (const x of [d.L, d.R]) d.f(x - 1, d.ey - 1, 1, 1, ink).f(x + 3, d.ey - 1, 1, 1, ink); // lashes
    d.f(cx - 2, hy + 12, 4, 1, "#d9445c");
    // Long straight black hair with a blunt fringe, falling to her waist.
    strands(d, "#1e2230");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - (i ? 1 : 0), hy + 2, 2, hh + 14 - i * 2, i % 2 ? "#2a3040" : "#14161e"); d.r(hx + hw + (i ? 1 : 0), hy + 2, 2, hh + 14 - i * 2, i % 2 ? "#14161e" : "#2a3040"); } });
    d.r(hx + 1, hy + 1, hw - 2, 3, "#1e2230").r(hx + 2, hy + 3, hw - 4, 1, "#2a3040");
    // Gold snake earrings, a red top with a gold-trimmed cut, a white cape lined in red.
    d.f(hx, hy + 7, 2, 4, gold);
    openFront(d, 6, 2, "#f0c040");
    d.trim("#f2f2f2", "#d9445c", ty);
    d.belt("#f0c040", null, ty + th - 6);
    d.recolor("#d9445c", 0, d.legY, d.W, d.legH + 4, (x, y) => (x + y) % 7 === 0 ? "#ff7a8a" : null);
    // Salome, her white snake, coiled beside her with skull earrings.
    d.asBody(() => {
      const sx = tx - 9;
      for (let k = 0; k < 18; k++) d.r(sx + Math.round(Math.sin(k / 2.5) * 3), d.bottom - k, 5, 1, k % 4 === 0 ? "#c8c4e0" : "#f4f2fa");
      d.r(sx - 2, d.bottom - 24, 8, 6, "#f4f2fa").r(sx - 1, d.bottom - 23, 2, 1, "#2a2030").r(sx + 3, d.bottom - 23, 2, 1, "#2a2030").r(sx - 1, d.bottom - 19, 6, 1, "#d84a6a");
      d.r(sx - 3, d.bottom - 20, 2, 2, "#e8e4d0").d(sx - 3, d.bottom - 20, ink);
    });
    // Love-Love: hearts drifting from her hand.
    for (const [x, y, c] of [[d.rx + 7, d.rhy - 8, "#ff6aa8"], [d.rx + 11, d.rhy - 15, "#ff9ac8"], [d.rx + 5, d.rhy - 18, "#ff6aa8"]] as [number, number, string][])
      d.u(x, y, 2, 1, c).u(x + 3, y, 2, 1, c).u(x - 1, y + 1, 7, 1, c).u(x, y + 2, 5, 1, c).u(x + 1, y + 3, 3, 1, c).u(x + 2, y + 4, 1, 1, c).u(x, y + 1, 1, 1, white);
    void tc;
  },
  doflamingo: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.mouth("grin");
    // Short blond hair and wraparound red shades.
    strands(d, "#f0d070");
    d.r(hx + 1, d.ey - 1, hw - 2, 3, ink).r(hx + 2, d.ey, hw - 4, 1, "#ff4a4a").r(hx + 2, d.ey - 1, 3, 1, "#ff9a9a").d(cx, d.ey + 1, "#a82020");
    // Open white shirt, striped three-quarter trousers.
    openFront(d, 8, 3, "#d8dce6");
    d.recolor("#f08a5a", 0, d.legY, d.W, d.legH + 4, (x) => x % 3 === 0 ? "#ffd0a0" : null);
    // A huge pink feather coat, fluffy at every edge.
    const coat = new Map<string, string>();
    for (let y = ty + 1; y <= d.legY + 6; y++) for (let x = tx - 8; x < tx + tw + 8; x++) {
      const inside = x > tx + 2 && x < tx + tw - 3 && y > ty + 3;
      if (inside) continue;
      const edgeL = tx - 8 + ((y * 3) % 4), edgeR = tx + tw + 7 - ((y * 5) % 4);
      if (x < edgeL || x > edgeR) continue;
      if (y > d.legY + 2 + ((x * 7) % 5)) continue;
      coat.set(`${x},${y}`, (x * 3 + y * 2) % 7 === 0 ? "#ffb0d8" : (x + y * 3) % 5 === 0 ? "#d84a8a" : "#ff6fb2");
    }
    blob(d, coat, (x, y) => y < ty + 1 || x < tx + 1 || x > tx + tw - 2);
    // Parasite: strings running from his raised fingers up out of frame.
    for (let i = 0; i < 4; i++) d.line(d.rx + 1 + i, d.rhy, d.rx + 2 + i * 4, d.rhy - 34, "#ffffffa0", true);
    void th;
  },
  "charlotte-cracker": (d) => {
    const { hx, hy, hw, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#7a3aa8", "#4a1a6a").mouth("smirk");
    // Purple hair in tall spikes.
    d.asBody(() => { for (let i = 0; i < 6; i++) d.r(hx + i * 3, hy - 9 + (i % 2) * 3, 2, 10 - (i % 2) * 3, i % 2 ? "#7a3a98" : "#a050c0").d(hx + i * 3, hy - 9 + (i % 2) * 3, "#d890f0"); });
    strands(d, "#a050c0");
    // Biscuit armour: dotted with baking holes, plates and a scalloped edge.
    for (const fam of ["#d8a36a", "#a07040"]) d.recolor(fam, 0, ty - 2, d.W, d.p.height, (x, y) => x % 4 === 1 && y % 4 === 1 ? "#8a5a2a" : (x + y) % 9 === 0 ? "#f0c890" : null);
    d.r(tx, ty + 8, tw, 1, "#8a5a2a").r(tx, ty + 14, tw, 1, "#8a5a2a");
    // Extra biscuit arms reaching out behind him (Thousand Arms).
    for (const [x, y, s] of [[tx - 6, ty + 6, -1], [tx + tw + 1, ty + 6, 1], [tx - 8, ty + 12, -1], [tx + tw + 3, ty + 12, 1]] as [number, number, number][])
      d.u(x, y, 6, 3, "#c89050").u(x + (s < 0 ? -2 : 5), y - 1, 3, 4, "#d8a36a").u(x + 2, y + 1, 1, 1, "#8a5a2a");
    void tc; void th;
  },
  "charlotte-smoothie": (d) => {
    const { hx, hy, hw, hh, cx, ty, tx, tw, th } = d;
    d.eyes("stern", "#4a7aa8", "#8aa6c4").mouth("line");
    d.f(cx - 2, hy + 12, 4, 1, "#a85a7a");
    // Very long silver-blue hair.
    strands(d, "#c8d0ec");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - i, hy + 2, 2, hh + 16 - i * 3, i % 2 ? "#a8b4d8" : "#c8d0ec"); d.r(hx + hw + i, hy + 2, 2, hh + 16 - i * 3, i % 2 ? "#c8d0ec" : "#a8b4d8"); } });
    // Black outfit under a long pale coat, with a white fur stole.
    d.trim("#e8f2f8", "#8aa6c4", ty).folds("#e8f2f8", d.legY - 4, 4);
    for (let i = 0; i < 5; i++) d.r(d.tc - 3 + Math.floor(i / 2), ty + i, 6 - Math.floor(i / 2) * 2, 1, "#2a2d3a");
    d.belt("#5a7aa8", "#c0d0e0", ty + th - 6);
    // Squeezing the juice out of a defeated pirate: drops falling from her fist into a glass.
    for (const [x, y] of [[d.lx, d.lhy + 4], [d.lx + 1, d.lhy + 8], [d.lx, d.lhy + 12]]) d.u(x, y, 2, 2, "#ff9a3a").u(x, y, 1, 1, "#ffd08a");
  },
  "charlotte-oven": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#e8401a", "#a83a10").mouth("grin");
    strands(d, "#f0763a");
    // Red-hot palms glowing white at the centre, heat shimmer and steam.
    for (const [x, y] of [[d.lx, d.lhy], [d.rx, d.rhy]]) {
      d.r(x - 1, y - 1, d.aw + 2, 4, "#ff5a1a").r(x, y, d.aw, 2, "#ffd84a").d(x + 1, y, white);
      flames(d, x + 1, y + 1, 1, 9, "#e8401a", "#ff9a2a", "#fff0a0");
    }
    steam(d, [[d.lx - 5, d.lhy - 10, 2], [d.rx + d.aw + 4, d.rhy - 12, 2], [hx - 3, hy - 4, 2]], "#ffe8d8");
    // A dark open coat over his huge chest, a red sash.
    openFront(d, 10, 4);
    muscles(d, 2);
    d.r(tx, ty + th - 6, tw, 3, "#c8301e").r(tx, ty + th - 6, tw, 1, "#ff5a3a");
    void cx; void tc;
  },
  "charlotte-daifuku": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("grin");
    // Pointed black goatee and the flat topknot.
    d.asBody(() => d.r(cx - 2, hy + d.hh, 4, 3, "#2a2d3a").r(cx - 1, hy + d.hh + 3, 2, 2, "#2a2d3a"));
    // Bare muscular chest, a gold sash and baggy trousers.
    bareTorso(d, "#d8a36a", 3);
    d.r(tx, ty + th - 6, tw, 4, "#f0c040").r(tx, ty + th - 6, tw, 1, "#ffe08a").r(tc + 4, ty + th - 2, 3, 6, "#f0c040");
    // Hoya Hoya: the red smoke genie rising behind him with a spear.
    const smoke = new Map<string, string>(), gx = tx + tw + 6, gy = hy - 2;
    for (let j = -8; j <= 26; j++) for (let i = -8; i <= 8; i++) {
      const rad = j < 6 ? 7 : Math.max(2, 7 - Math.floor((j - 6) / 4));
      if (i * i + (j < 6 ? j * j * 0.8 : 0) > rad * rad) continue;
      smoke.set(`${gx + i + (j > 6 ? Math.round(Math.sin(j / 3) * 2) : 0)},${gy + j}`, (i + j * 2) % 6 === 0 ? "#ff7a6a" : (i * 3 + j) % 5 === 0 ? "#9a2a3a" : "#d8404a");
    }
    for (const [k, v] of smoke) { const [x, y] = k.split(",").map(Number); d.u(x, y, 1, 1, `${v}cc`); }
    d.u(gx - 4, gy - 9, 2, 3, "#f0c040").u(gx + 3, gy - 9, 2, 3, "#f0c040");
    d.u(gx - 4, gy - 1, 3, 2, "#fff04a").u(gx + 2, gy - 1, 3, 2, "#fff04a").u(gx - 3, gy + 3, 7, 1, "#4a0c18");
    d.line(gx + 8, gy - 6, gx + 8, gy + 24, "#8a5a2a", true).line(gx + 7, gy - 10, gx + 9, gy - 10, "#e0e6ee", true).line(gx + 8, gy - 12, gx + 8, gy - 7, "#e0e6ee", true);
    // A sliver of smoke linking the genie to his belly.
    for (let i = 0; i < 6; i++) d.u(tx + tw + i, ty + th - 6 - i, 2, 2, "#d8404acc");
    void hx; void hw;
  },
  "charlotte-perospero": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#5a3a8a", "#3a5a2a").mouth("grin");
    // His trademark long tongue hanging down to his chest.
    d.asBody(() => d.r(cx - 1, hy + 13, 3, 9, ink).r(cx, hy + 13, 1, 8, "#ff7aa0").d(cx + 1, hy + 14, "#ff9ac0").d(cx, hy + 20, "#e05a80"));
    // Long green hair under a candy-swirl top hat.
    strands(d, "#5a8a3a");
    d.asBody(() => { for (let i = 0; i < 2; i++) { d.r(hx - 2 - i, hy + 4, 2, 14 - i * 3, "#4a7a2a"); d.r(hx + hw + i, hy + 4, 2, 14 - i * 3, "#4a7a2a"); } });
    d.recolor("#6a3a8a", hx - 4, 0, hw + 8, hy + 2, (x, y) => (x + y) % 4 === 0 ? "#ff7aa0" : (x + y) % 4 === 2 ? "#f2f2f2" : null);
    // A purple coat over the white shirt, a candy ruff at the neck.
    openFront(d, 10, 3);
    for (let i = 0; i < tw; i += 2) d.r(tx + i, ty, 2, 2, i % 4 ? "#ff7aa0" : "#a6ec79");
    // Candy cane: red-and-white stripes, and a candy wall growing from the ground.
    d.recolor("#ff7aa0", d.rx - 2, 0, 14, d.p.height, (x, y) => ((x + y) >> 1) % 2 ? white : null);
    d.asBody(() => { for (let i = 0; i < 5; i++) d.r(tx - 10 + i * 2, d.bottom - 3 - (i % 3) * 3, 2, 4 + (i % 3) * 3, i % 2 ? "#ff9ac0" : "#ffd0e0"); });
    void th; void tc;
  },
  "charlotte-brulee": (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#8a3a8a", "#5a2a5a").mouth("gapGrin");
    // The big scar across her face, a long hooked witch nose.
    d.line(hx + 2, hy + 4, hx + hw - 3, hy + 12, "#a07080");
    // Long lavender hair in loose waves, and the witch's hat.
    strands(d, "#c49ae8");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - i, hy + 3 + i, 2, hh + 10 - i * 3, i % 2 ? "#a07ad0" : "#c49ae8"); d.r(hx + hw + i, hy + 3 + i, 2, hh + 10 - i * 3, i % 2 ? "#c49ae8" : "#a07ad0"); } });
    d.trim("#3a2a5a", "#c49ae8", ty).belt("#7a3a8a", "#f0c040", ty + th - 6);
    // Mirror-Mirror: an oval hand-mirror world with a hand reaching out of it.
    d.asBody(() => {
      const mx = tx - 10, my = ty + 2;
      for (let j = -7; j <= 7; j++) for (let i = -5; i <= 5; i++) {
        const e = (i * i) / 25 + (j * j) / 49;
        if (e > 1) continue;
        d.r(mx + i, my + j, 1, 1, e > 0.7 ? "#c8a050" : (i - j) % 5 === 0 ? "#ffffff" : "#a8d8f0");
      }
      d.r(mx - 1, my + 8, 2, 6, "#c8a050");
      d.r(mx - 2, my - 1, 3, 3, "#f4c69c").r(mx - 3, my - 2, 1, 2, "#f4c69c");
    });
    d.sparkle(tx - 15, ty - 5, "#d8f4ff");
    void cx; void tc;
  },
  pedro: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("closedLeft", "#4a3a1a", "#7a4a1a").mouth("smirk");
    // Jaguar rosettes across his golden fur, a pale muzzle with whiskers.
    d.recolor("#e3a64a", 0, 0, d.W, d.p.height, (x, y) => (x * 3 + y * 5) % 11 === 0 ? "#6a3a1a" : (x * 3 + y * 5) % 11 === 1 ? "#a8701a" : null);
    d.f(cx - 3, hy + 10, 6, 4, "#f4dca8");
    d.f(cx - 1, hy + 10, 2, 1, "#3a2a1a");
    for (const s of [-1, 1]) d.line(cx + s * 3, hy + 11, cx + s * 9, hy + 10, "#f4f0e0").line(cx + s * 3, hy + 12, cx + s * 9, hy + 13, "#f4f0e0");
    // The eye patch, a green shirt with an open collar, a sash.
    openFront(d, 6, 2);
    d.belt("#a83a2a", null, ty + th - 6);
    // Long straight sword gripped point-forward, crackling with Electro.
    sword(d, d.rx + 1, d.rhy, d.rx + 14, d.rhy - 16, { steel: "#d0d8e4", grip: "#5a3a1a", guard: gold });
    d.bolt(d.rx + 8, d.rhy - 14, 1, 7, "#fff04a", "#ffffff").bolt(d.lx - 3, d.lhy - 4, -1, 7, "#fff04a", "#ffffff");
    void hx; void hw; void tc; void tx; void tw;
  },
  carrot: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#d03a3a", "#c8a040").mouth("smile");
    // Fluffy white-gold hair and big floppy ears with pink insides.
    strands(d, "#ffd872");
    d.recolor("#ffd872", 0, 0, d.W, hy - 1, (x, y) => (x % 3 === 1 && y > 2) ? "#ffb0c0" : null);
    // A light blue dress with puffy white collar and a red ribbon.
    d.r(tx, ty, tw, 2, white).r(tc - 2, ty + 1, 4, 2, "#e04050");
    d.recolor("#a8d4f0", tx, ty + 2, tw, th, (x, y) => (x + y) % 6 === 0 ? "#d8ecf8" : null);
    // Electro: lightning arcing from her claws, a bouncy dash pose.
    for (const [x, y, s] of [[d.lx - 1, d.lhy, -1], [d.rx + d.aw, d.rhy, 1], [d.rx + 3, d.rhy - 10, 1]] as [number, number, 1 | -1][]) d.bolt(x, y, s, 9, "#fff04a", "#ffffff");
    d.sparkle(hx - 4, hy + 3, "#fff6a0").sparkle(hx + hw + 4, hy - 2, "#fff6a0");
    void cx;
  },
  wanda: (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#3a3a4a", "#b8a890").mouth("smile");
    // White dog fur, a black button nose, a long silky mane.
    d.f(cx - 1, hy + 10, 3, 2, ink).d(cx, hy + 10, "#5a5a6a");
    strands(d, "#f2ece0");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - i, hy + 3, 2, hh + 6 - i * 2, i % 2 ? "#d8d0c0" : "#f2ece0"); d.r(hx + hw + i, hy + 3, 2, hh + 6 - i * 2, i % 2 ? "#f2ece0" : "#d8d0c0"); } });
    // Tan explorer top with a brown belt, a curved sabre.
    d.belt("#5a3a1a", gold, ty + th - 6).trim("#8a7a5a", "#c8b890", ty);
    d.bolt(d.rx + 6, d.rhy - 12, 1, 7, "#fff04a", "#ffffff");
    void tx; void tw; void tc;
  },
  denjiro: (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.mouth("smirk");
    // Kyoshiro: a wild mane of black hair with a tall topknot and round dark shades.
    strands(d, "#2a2d3a");
    d.asBody(() => { for (let i = 0; i < 4; i++) { d.r(hx - 2 - (i % 2) * 2, hy + 1 + i * 3, 3, 4, "#1e2230"); d.r(hx + hw - 1 + (i % 2) * 2, hy + 1 + i * 3, 3, 4, "#1e2230"); } });
    d.r(d.L - 1, d.ey - 1, 4, 3, "#2a2d3a").r(d.R, d.ey - 1, 4, 3, "#2a2d3a").r(d.L + 3, d.ey, d.R - d.L - 3, 1, ink).d(d.L, d.ey - 1, "#7a8ab0").d(d.R + 1, d.ey - 1, "#7a8ab0");
    // Purple kimono with a crane pattern and a white collar.
    d.r(tc - 1, ty, 2, 8, white).line(tc - 4, ty, tc, ty + 7, white).line(tc + 3, ty, tc, ty + 7, white);
    d.recolor("#4a3a7a", 0, ty, d.W, d.p.height, (x, y) => (x * 2 + y * 3) % 13 === 0 ? "#e8e0f0" : null);
    d.belt("#d8a040", null, ty + th - 6);
    // A fast drawn slash arcing in front of him.
    for (let k = 0; k < 16; k++) d.u(d.rx + 4 + k, d.rhy - 12 + Math.round(Math.sin(k / 5) * 4), 1, 2, k > 12 ? "#ffffff80" : "#c8e0ffcc");
    void cx; void tx; void tw; void hh;
  },
  kinemon: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("line");
    // Thick handlebar moustache, the black topknot.
    d.f(cx - 5, hy + 11, 4, 1, "#2a2d3a").f(cx + 1, hy + 11, 4, 1, "#2a2d3a").f(cx - 6, hy + 12, 1, 1, "#2a2d3a").f(cx + 5, hy + 12, 1, 1, "#2a2d3a");
    // Red kimono with a white crest, a black haori.
    d.r(tc - 2, ty + 4, 4, 4, white).d(tc - 1, ty + 5, "#d84e4e").d(tc, ty + 6, "#d84e4e");
    d.trim("#d84e4e", "#2a2d3a", ty).belt("#2a2d3a", null, ty + th - 6);
    // Fox-Fire Style: two katana sheathed in orange flame.
    for (const [x, y, tx2, ty2] of [[d.lx, d.lhy, d.lx - 12, d.lhy - 18], [d.rx + 1, d.rhy, d.rx + 14, d.rhy - 18]]) {
      sword(d, x, y, tx2, ty2, { steel: "#e0e6ee", grip: "#2a2d3a", guard: gold });
      for (let k = 2; k < 18; k += 4) { const t = k / 18; d.flame(Math.round(x + (tx2 - x) * t), Math.round(y + (ty2 - y) * t) + 1, 5, ["#fff0a0", "#ff9a2a", "#e8401a"]); }
    }
    void hx; void hw; void tx; void tw;
  },
  "ashura-doji": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("grin");
    // Wild black hair, a full beard and a scar over one eye.
    strands(d, "#2a2d3a");
    d.asBody(() => { for (let i = 0; i < 6; i++) d.r(hx - 2 + i * 4, hy - 4 - (i % 2) * 2, 3, 6, "#1e2230"); });
    d.asBody(() => d.r(hx + 2, hy + d.hh - 2, hw - 4, 4, "#2a2d3a").r(hx + 4, hy + d.hh + 2, hw - 8, 2, "#2a2d3a"));
    d.line(d.R + 1, d.ey - 4, d.R + 2, d.ey + 4, "#8a4a3a");
    // A brown open kimono over a scarred chest, a rope belt.
    openFront(d, 12, 4);
    muscles(d, 2);
    d.belt("#d8c8a0", null, ty + th - 6);
    // His huge nodachi resting on his shoulder.
    sword(d, d.rx + 1, d.rhy, d.rx + 12, hy - 8, { steel: "#c0c8d4", grip: "#7a2a2a", guard: "#5a5f6a", thick: true });
    // A sake gourd at his hip.
    d.r(tx - 3, ty + th - 6, 4, 6, "#c88a3a").r(tx - 2, ty + th - 8, 2, 2, "#c88a3a").d(tx - 2, ty + th - 4, "#e8b860");
    void cx; void tc; void tw;
  },
  kawamatsu: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#2a3a1a", "#2a4a1a");
    // Kappa: a yellow beak for a mouth, the plate on top of his head and a ring of hair.
    d.f(cx - 3, hy + 11, 6, 3, "#e8b840").f(cx - 3, hy + 12, 6, 1, "#a87a1a");
    d.asBody(() => { d.r(hx + 2, hy - 2, hw - 4, 3, "#e8f0f0").r(hx + 3, hy - 2, hw - 6, 1, "#ffffff"); for (let i = 0; i < hw; i += 2) d.r(hx + i, hy + 1, 2, 2 + (i % 4 ? 1 : 0), "#3a5a2a"); });
    // His green shell behind him, a sumo mawashi, a straw cape.
    d.asBody(() => { for (let j = 0; j < d.th; j++) d.u(tx - 3, ty + j, tw + 6, 1, j % 5 === 0 ? "#5a8a40" : "#7ab060"); });
    d.r(tx, ty + th - 6, tw, 5, "#d84040").r(tx, ty + th - 6, tw, 1, "#ff6a6a").r(tc - 2, ty + th - 1, 4, 5, "#d84040");
    d.recolor("#c8a060", tx, ty, tw, th - 6, (x, y) => (x + y) % 3 === 0 ? "#a8803a" : null);
    // A cucumber in his free hand.
    d.asBody(() => d.r(d.lx - 2, d.lhy - 6, 3, 9, "#4a8a3a").r(d.lx - 1, d.lhy - 5, 1, 7, "#7ac060"));
  },
  kanjuro: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    // Kabuki face paint: chalk-white face, red streaks, bright red lips.
    d.eyes("stern", "#2a2030", "#14141c");
    for (const x of [d.L, d.R]) d.f(x - 1, d.ey + 2, 5, 1, "#d82040").f(x, d.ey - 2, 3, 1, "#d82040");
    d.f(cx - 2, hy + 12, 4, 2, "#c02040");
    // Pink kimono and a giant calligraphy brush.
    d.recolor("#e0577a", 0, ty, d.W, d.p.height, (x, y) => (x * 3 + y) % 9 === 0 ? "#ffd0e0" : null);
    d.belt("#2a2d3a", null, ty + th - 6);
    // Brush-Brush: a fresh ink drawing coming alive beside him (a little ink tiger).
    d.asBody(() => {
      const gx = tx + tw + 6, gy = ty + 6;
      d.r(gx, gy, 10, 6, "#2a2d3a").r(gx + 1, gy + 1, 8, 4, "#f4f0ea");
      for (let i = 0; i < 4; i++) d.r(gx + 2 + i * 2, gy + 1, 1, 4, "#2a2d3a");
      d.r(gx + 8, gy - 4, 6, 5, "#2a2d3a").r(gx + 9, gy - 3, 4, 3, "#f4f0ea").d(gx + 11, gy - 2, "#d82040").r(gx + 9, gy - 5, 1, 1, "#2a2d3a").r(gx + 12, gy - 5, 1, 1, "#2a2d3a");
      for (const x of [gx + 1, gx + 3, gx + 6, gx + 8]) d.r(x, gy + 6, 1, 4, "#2a2d3a");
      d.r(gx - 3, gy, 3, 1, "#2a2d3a").r(gx - 4, gy - 2, 1, 2, "#2a2d3a");
    });
    for (const [x, y] of [[tx + tw + 3, ty + 20], [tx + tw + 8, ty + 18], [tx + tw + 12, ty + 21]]) d.u(x, y, 2, 1, "#2a2d3a");
    void hx; void hw; void tc;
  },
  "x-drake": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#5a2a1a", "#8a2a2a").mouth("line");
    // The X-shaped scar on his chin, slicked red hair.
    d.line(cx - 2, hy + 12, cx + 2, hy + 15, "#e8d8c8").line(cx + 2, hy + 12, cx - 2, hy + 15, "#e8d8c8");
    strands(d, "#c84040");
    // Black shirt, a red cape, the X logo of SWORD.
    d.trim("#d34848", "#ffb0a0", ty);
    d.r(tc - 3, ty + 5, 1, 1, "#e8d8c8").line(tc - 3, ty + 5, tc + 2, ty + 10, "#e8d8c8").line(tc + 2, ty + 5, tc - 3, ty + 10, "#e8d8c8");
    // Allosaurus: scaly forearms with claws and a dinosaur tail swinging behind.
    d.recolor(d.sk, d.lx - 1, d.lhy - 8, d.aw + 2, 12, (x, y) => (x + y) % 3 === 0 ? "#8a7a4a" : "#a89a5a");
    d.recolor(d.sk, d.rx - 1, d.rhy - 8, d.aw + 2, 12, (x, y) => (x + y) % 3 === 0 ? "#8a7a4a" : "#a89a5a");
    for (const x of [d.lx, d.rx]) for (let i = 0; i < 3; i++) d.d(x + i * 2, (x === d.lx ? d.lhy : d.rhy) + 3, white);
    // A wide axe and a hooked sword, his signature pair.
    d.asBody(() => {
      d.r(d.rx + 2, d.rhy - 18, 2, 22, "#5a3a1a");
      d.r(d.rx + 4, d.rhy - 18, 6, 9, "#c0c8d4").r(d.rx + 9, d.rhy - 19, 2, 11, "#e0e6ee").r(d.rx + 4, d.rhy - 18, 6, 1, white);
    });
    sword(d, d.lx, d.lhy, d.lx - 12, d.lhy - 14, { steel: "#c0c8d4", grip: "#2a2d3a", guard: "#5a5f6a" });
    void hx; void hw; void tw;
  },
  "basil-hawkins": (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#5a3a5a", "#c8b070").mouth("line");
    // Expressionless, with the red marks under his eyes.
    for (const x of [d.L, d.R]) d.f(x + 1, d.ey + 2, 1, 3, "#d04040");
    // Long straight blond hair to his waist.
    strands(d, "#f0dd9c");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - i, hy + 2, 2, hh + 16 - i * 3, i % 2 ? "#c8b070" : "#f0dd9c"); d.r(hx + hw + i, hy + 2, 2, hh + 16 - i * 3, i % 2 ? "#f0dd9c" : "#c8b070"); } });
    // A long purple coat with a gold cross-hatched trim.
    d.trim("#2a2d3a", "#c8a050", ty).recolor("#5a3a5a", 0, ty, d.W, d.p.height, (x, y) => (x + y) % 4 === 0 ? "#7a5a7a" : null);
    // Tarot cards orbiting him, and a straw doll in his hand.
    const cards: [number, number, string][] = [[tx - 12, ty - 8, "#d04040"], [tx + tw + 6, ty - 12, "#5a3a5a"], [tx - 14, ty + 10, "#3a6ab8"], [tx + tw + 8, ty + 8, "#c8a050"]];
    for (const [x, y, c] of cards) d.u(x, y, 5, 7, "#f4f0e0").u(x + 1, y + 1, 3, 5, c).u(x + 2, y + 3, 1, 1, "#f4f0e0");
    d.asBody(() => {
      const x = d.rx + 1, y = d.rhy - 8;
      d.r(x, y, 4, 4, "#d8b860").r(x - 2, y + 4, 8, 2, "#d8b860").r(x + 1, y + 6, 2, 5, "#d8b860").r(x - 1, y + 10, 2, 2, "#d8b860").r(x + 3, y + 10, 2, 2, "#d8b860");
      d.r(x, y + 1, 4, 1, "#a88a3a").r(x + 1, y + 2, 1, 1, ink).r(x + 3, y + 2, 1, 1, ink);
    });
    void cx; void tc;
  },
  "scratchmen-apoo": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("happy", "#3a2a1a", "#14141c");
    // His huge toothy grin and a loose hood.
    d.r(cx - 5, hy + 10, 10, 4, ink).r(cx - 4, hy + 11, 8, 1, white).r(cx - 4, hy + 12, 8, 1, white);
    for (let i = 0; i < 4; i++) d.d(cx - 3 + i * 2, hy + 11, "#c8c8c8");
    // An orange shirt covered in musical notes, and his arms are piano keys.
    d.recolor("#e68e48", tx, ty, tw, th, (x, y) => (x * 3 + y * 2) % 11 === 0 ? "#2a2d3a" : null);
    for (const [x, y] of [[d.lx, d.lhy], [d.rx, d.rhy]]) d.r(x, y - 10, d.aw, 10, white).r(x + 1, y - 10, 1, 6, ink).r(x + 3, y - 10, 1, 6, ink).r(x + 5, y - 10, 1, 6, ink);
    // Sound waves and notes flying out (Tatakai no Ongaku).
    const note = (x: number, y: number, c: string) => d.u(x, y + 4, 3, 2, c).u(x + 2, y, 1, 5, c).u(x + 3, y, 2, 1, c);
    note(tx + tw + 6, ty - 10, "#ffd84a"); note(tx + tw + 12, ty - 2, "#8adcff"); note(tx - 12, ty - 6, "#ff9ac0"); note(tx - 9, ty + 8, "#ffd84a");
    for (let r = 4; r <= 10; r += 3) for (let a = -40; a <= 40; a += 10) { const t = (a * Math.PI) / 180; d.u(Math.round(d.rx + d.aw + 2 + Math.cos(t) * r), Math.round(d.rhy - 4 + Math.sin(t) * r), 1, 1, "#ffffff90"); }
    void hx; void hw; void tc;
  },
  urouge: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("happy", "#3a2a1a", "#14141c").mouth("grin");
    // Bald with sky-island markings, a priest's white robe.
    d.f(hx + 2, hy + 2, hw - 4, 1, "#e0c060");
    // Turned huge by Automatic Power: veins of red light on bulging arms.
    for (const [x, y] of [[d.lx, d.lhy], [d.rx, d.rhy]]) { d.line(x + 1, y - 10, x + 3, y - 2, "#ff5a3a"); d.line(x + 3, y - 10, x + 4, y - 4, "#ff9a3a"); }
    d.trim("#e0e6ee", "#c8a050", ty).folds("#e0e6ee", ty + 8, 4);
    d.belt("#7a5a8a", gold, ty + th - 6);
    // Big feathered wings fanned out, bigger than the low-res pair.
    wings(d, (t, f) => f % 2 ? "#f2f2f2" : t > 0.7 ? "#d8dce6" : "#ffffff", 12);
    // A spiked iron club over his shoulder.
    d.asBody(() => { d.r(d.rx + 2, d.rhy - 22, 3, 24, "#5a3a2a"); d.r(d.rx, d.rhy - 26, 7, 8, "#5a4a3a"); for (let i = 0; i < 3; i++) d.r(d.rx - 1 + i * 4, d.rhy - 27, 1, 1, "#c0c8d4").r(d.rx + 7, d.rhy - 25 + i * 3, 1, 1, "#c0c8d4"); });
    void cx; void tc; void tw;
  },
  "capone-bege": (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("smirk");
    // A big cigar and a pinstripe mafia suit with a red tie.
    d.r(cx + 1, hy + 12, 6, 2, "#6a3a1a").d(cx + 7, hy + 12, "#ff7a3a");
    steam(d, [[cx + 9, hy + 6, 2], [cx + 11, hy + 1, 2]], "#c8ccd8");
    d.suit("#f2f2f2", "#c02030");
    d.recolor("#5a4f3a", 0, ty, d.W, d.p.height, (x) => x % 3 === 0 ? "#7a6f5a" : null);
    // Castle Human: battlements on his shoulders, tiny cannons poking out.
    d.asBody(() => { for (const x0 of [tx - 3, tx + tw - 4]) for (let i = 0; i < 7; i += 2) d.r(x0 + i, ty - 3, 2, 3, "#9a9488").r(x0 + i, ty - 3, 2, 1, "#c8c0b0"); });
    for (const [x, y] of [[tx + 3, ty + 12], [tx + tw - 5, ty + 12]]) d.r(x, y, 2, 2, ink);
    // His tommy gun: barrel, drum magazine and muzzle flash.
    d.asBody(() => {
      const x = d.rx, y = d.rhy - 2;
      d.r(x, y, 14, 3, "#2a2d3a").r(x + 4, y + 3, 5, 4, "#2a2d3a").r(x + 5, y + 4, 3, 2, "#5a5f6a").r(x - 3, y + 1, 4, 3, "#6a3a1a").r(x, y, 14, 1, "#5a5f6a");
    });
    d.flame(d.rx + 17, d.rhy - 1, 4, ["#fff0a0", "#ffb04a", "#ff6a2a"]).u(d.rx + 15, d.rhy - 1, 3, 1, "#fff0a0");
    void hx; void hw; void th; void tc;
  },
  "jewelry-bonney": (d) => {
    const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d;
    d.eyes("stern", "#a83a5a", "#d06a9a").mouth("grin");
    // Long pink hair under her green cap.
    strands(d, "#ff9fc8");
    d.asBody(() => { for (let i = 0; i < 3; i++) { d.r(hx - 2 - i, hy + 2, 2, hh + 8 - i * 2, i % 2 ? "#e07aa8" : "#ff9fc8"); d.r(hx + hw + i, hy + 2, 2, hh + 8 - i * 2, i % 2 ? "#ff9fc8" : "#e07aa8"); } });
    // Black crop top, orange shorts, a cropped green jacket.
    d.r(tx, ty + 8, tw, 4, d.sk).r(tc - 1, ty + 10, 1, 1, shade(d.sk, -0.3));
    d.asBody(() => { d.r(tx - 2, ty, 3, 8, "#3a8a5a"); d.r(tx + tw - 1, ty, 3, 8, "#3a8a5a"); });
    // A slice of pizza in hand (she's always eating), and Age-Age sparkles.
    d.asBody(() => {
      const x = d.rx + 1, y = d.rhy - 10;
      for (let j = 0; j < 8; j++) d.r(x + Math.floor(j / 2), y + j, 8 - j, 1, j === 0 ? "#d8a040" : "#ffd84a");
      d.d(x + 2, y + 2, "#d83a3a").d(x + 4, y + 3, "#d83a3a").d(x + 3, y + 5, "#d83a3a");
    });
    for (const [x, y] of [[tx - 8, ty - 4], [tx + tw + 9, ty + 6], [tx - 6, ty + 14]]) d.sparkle(x, y, "#ffd0e8");
    void cx; void th;
  },
  sentomaru: (d) => {
    const { hx, hy, hw, cx, tc, ty, tx, tw, th } = d;
    d.eyes("glare", "#3a2a1a", "#14141c").mouth("grin");
    // Big bushy sideburns poking out of his white helmet with the Marine anchor.
    d.asBody(() => { d.r(hx - 2, hy + 4, 3, 8, "#2a2d3a"); d.r(hx + hw - 1, hy + 4, 3, 8, "#2a2d3a"); });
    d.r(cx - 2, hy - 3, 4, 3, "#3a6ab8").d(cx - 1, hy - 3, white);
    // Sumo stance: the mawashi over his uniform trousers, an open shirt.
    openFront(d, 8, 3);
    d.r(tx, ty + th - 6, tw, 5, "#2a2d3a").r(tx, ty + th - 6, tw, 1, "#5a5f6a").r(tc - 2, ty + th - 1, 4, 5, "#2a2d3a");
    // The giant battle axe and a "Dokkoi" palm thrust, the strongest defence.
    d.asBody(() => {
      d.r(d.lx - 2, d.lhy - 26, 3, 30, "#7a5a3a");
      d.r(d.lx - 12, d.lhy - 26, 10, 12, "#c0c8d4").r(d.lx - 13, d.lhy - 27, 2, 14, "#e0e6ee").r(d.lx - 11, d.lhy - 22, 6, 2, "#9aa0aa");
      d.r(d.rx, d.rhy - 4, d.aw + 4, 8, d.sk).r(d.rx + d.aw + 2, d.rhy - 5, 2, 10, d.sk).r(d.rx + d.aw + 3, d.rhy - 4, 1, 8, shade(d.sk, -0.3));
    });
    speedLines(d, d.rx + d.aw + 6, d.rx + d.aw + 14, [d.rhy - 3, d.rhy, d.rhy + 3]);
    void hw;
  },
};

void stubble; void openFront; void muscles; void repaint;
