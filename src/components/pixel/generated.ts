import { chestCharacterById, type ChestCharacterId, type ChestCharacterRarity } from "@/data/chest-characters";
import { CHEST_LOOKS, type Look } from "./chest-looks";
import { Pixels, feet, ink, silver, skin as defaultSkin, white, gold, shade, type Pose, type RunnerSprite } from "./kit";

// Procedural sprites for the chest-only roster. Every character has a hand-written
// look (build, hair, outfit, hat, weapon and extras); rarity layers on effects:
// legendary recruits glow, and mythic recruits get a shimmering double aura,
// and glowing eyes so they outshine everything else.

export const HEAD = 6; // headroom for hats, horns and ears, trimmed afterwards

interface Geometry { W: number; H: number; hx: number; hy: number; hw: number; hh: number; tx: number; ty: number; tw: number; th: number; legX: number; legY: number; legH: number; gap: number; aw: number }
const BUILDS: Record<NonNullable<Look["b"]>, Geometry> = {
  small: { W: 16, H: 19, hx: 3, hy: 1, hw: 10, hh: 7, tx: 4, ty: 8, tw: 8, th: 6, legX: 4, legY: 13, legH: 5, gap: 4, aw: 2 },
  normal: { W: 20, H: 24, hx: 5, hy: 3, hw: 10, hh: 7, tx: 6, ty: 10, tw: 8, th: 9, legX: 6, legY: 18, legH: 5, gap: 5, aw: 3 },
  big: { W: 22, H: 26, hx: 6, hy: 3, hw: 10, hh: 7, tx: 5, ty: 10, tw: 12, th: 10, legX: 6, legY: 19, legH: 6, gap: 6, aw: 3 },
  giant: { W: 24, H: 27, hx: 7, hy: 2, hw: 10, hh: 8, tx: 4, ty: 10, tw: 16, th: 11, legX: 7, legY: 20, legH: 6, gap: 6, aw: 4 },
};
// Leaner proportions for the high-detail mythic art: narrower heads, torsos and arms, longer legs.
const SLIM_BUILDS: Record<"normal" | "big" | "giant", Geometry> = {
  normal: { W: 20, H: 26, hx: 6, hy: 3, hw: 8, hh: 7, tx: 6, ty: 10, tw: 8, th: 10, legX: 6, legY: 19, legH: 6, gap: 4, aw: 2 },
  big: { W: 22, H: 27, hx: 7, hy: 3, hw: 8, hh: 7, tx: 6, ty: 10, tw: 10, th: 10, legX: 7, legY: 19, legH: 7, gap: 4, aw: 3 },
  giant: { W: 24, H: 28, hx: 7, hy: 2, hw: 10, hh: 8, tx: 6, ty: 10, tw: 12, th: 11, legX: 8, legY: 20, legH: 7, gap: 4, aw: 3 },
};


export interface Frame {
  p: Pixels; g: Geometry; cx: number; hx: number; hy: number; hw: number; hh: number; tx: number; ty: number; tw: number; th: number;
  lx: number; rx: number; lhy: number; rhy: number; sk: string; bottom: number;
}

function drawBody(look: Look, pose: Pose, slim = false): Frame {
  const build = look.b ?? "normal";
  const g = slim && build !== "small" ? SLIM_BUILDS[build] : BUILDS[build];
  const p = new Pixels(g.W, g.H + HEAD);
  const o = HEAD, sk = look.sk ?? defaultSkin, swing = pose === -1 ? 0 : pose === 0 ? -1 : 1;
  const sleeve = look.sl ?? look.t, hand = look.hand ?? sk;
  feet(p, pose, g.legX, g.legY + o, look.l, look.sh ?? ink, g.gap, g.legH);
  const hx = g.hx, hy = g.hy + o, hw = g.hw, hh = g.hh, tx = g.tx, ty = g.ty + o, tw = g.tw, th = g.th;
  const armTop = ty + 1, armH = th - 3, lx = tx - g.aw + 1, rx = tx + tw - 1;
  const lhy = armTop + armH - 1 + swing, rhy = armTop + armH - 1 - swing;
  p.r(lx, armTop + swing, g.aw, armH, ink).r(lx + 1, armTop + 1 + swing, g.aw - 1, armH - 3, sleeve).r(lx, lhy, g.aw, 2, hand);
  p.r(rx, armTop - swing, g.aw, armH, ink).r(rx, armTop + 1 - swing, g.aw - 1, armH - 3, sleeve).r(rx, rhy, g.aw, 2, hand);
  p.r(tx, ty, tw, th, ink).r(tx + 1, ty + 1, tw - 2, th - 2, look.t);
  const cx = hx + hw / 2;
  p.r(cx - 2, ty - 1, 4, 2, sk);
  p.r(hx, hy, hw, hh, ink).r(hx + 1, hy + 1, hw - 2, hh - 1, sk).r(hx + 2, hy + hh, hw - 4, 1, shade(sk, -0.2));
  p.r(hx - 1, hy + 3, 2, 3, sk).r(hx + hw - 1, hy + 3, 2, 3, sk);
  p.r(hx + 2, hy + 4, 1, 1, ink).r(hx + hw - 3, hy + 4, 1, 1, ink).r(cx - 1, hy + 6, 2, 1, shade(sk, -0.25));
  return { p, g, cx, hx, hy, hw, hh, tx, ty, tw, th, lx, rx, lhy, rhy, sk, bottom: g.H + HEAD - 1 };
}

function drawHair(f: Frame, style: Look["hs"], c: string) {
  const { p, hx, hy, hw, hh, cx } = f;
  const short = () => p.r(hx, hy - 1, hw, 3, c).r(hx - 1, hy + 1, 2, 2, c).r(hx + hw - 1, hy + 1, 2, 2, c);
  switch (style ?? "short") {
    case "bald": p.r(hx + 2, hy + 1, 2, 1, shade(f.sk, 0.35)); break;
    case "short": short(); break;
    case "long": short(); p.r(hx - 1, hy + 1, 2, hh + 3, c).r(hx + hw - 1, hy + 1, 2, hh + 3, c); break;
    case "spiky": short(); for (let i = 0; i < hw; i += 2) p.r(hx + i, hy - 2 - (i % 4 === 0 ? 1 : 0), 1, 2, c); break;
    case "afro": p.r(hx - 2, hy - 4, hw + 4, 6, ink).r(hx - 1, hy - 3, hw + 2, 5, c).r(hx - 2, hy + 1, 2, 3, c).r(hx + hw, hy + 1, 2, 3, c); break;
    case "slick": p.r(hx, hy - 1, hw, 2, c).r(hx + hw - 2, hy, 3, 4, c).r(hx + 1, hy + 1, 3, 1, c); break;
    case "mohawk": p.r(cx - 1, hy - 3, 3, 4, c); break;
    case "bun": short(); p.r(cx - 2, hy - 3, 4, 2, c); break;
    case "pony": short(); p.r(hx + hw, hy + 1, 2, 7, c).r(hx + hw - 1, hy, 2, 2, c); break;
    case "wild": p.r(hx - 2, hy - 2, hw + 4, 4, c).r(hx - 2, hy, 2, hh + 3, c).r(hx + hw, hy, 2, hh + 3, c);
      for (let i = -2; i < hw + 2; i += 3) p.r(hx + i, hy - 3, 2, 1, c); break;
    case "twin": short(); p.r(hx - 3, hy + 1, 2, 7, c).r(hx + hw + 1, hy + 1, 2, 7, c).r(hx - 2, hy, 2, 2, c).r(hx + hw, hy, 2, 2, c); break;
    case "fringe": short(); p.r(hx + 1, hy + 1, 4, 3, c); break;
    case "topknot": p.r(hx, hy, hw, 1, c).r(cx - 1, hy - 3, 2, 3, c).r(cx - 2, hy - 1, 4, 1, c); break;
    case "curly": p.r(hx - 1, hy - 2, hw + 2, 3, c); for (let i = -1; i < hw + 1; i += 2) p.r(hx + i, hy - 3, 1, 1, c); p.r(hx - 2, hy, 2, 4, c).r(hx + hw, hy, 2, 4, c); break;
    case "pomp": p.r(hx, hy - 1, hw, 2, c).r(hx + hw - 4, hy - 3, 6, 3, c).r(hx + hw + 1, hy - 2, 2, 2, c); break;
    case "three": short(); p.r(cx - 2, hy - 4, 4, 1, c).r(cx + 1, hy - 4, 1, 4, c).r(cx - 2, hy - 2, 4, 1, c); break;
    case "flame": short(); for (let i = 0; i < hw; i += 2) p.r(hx + i, hy - 3 + (i % 4 ? 1 : 0), 2, 3, c); p.r(hx - 2, hy, 2, 5, c).r(hx + hw, hy, 2, 5, c); break;
    case "none": break;
  }
}

function drawHat(f: Frame, hat: Look["hat"], c: string) {
  const { p, hx, hy, hw, cx } = f;
  const band = shade(c, -0.35);
  switch (hat) {
    case "straw": p.r(hx - 2, hy, hw + 4, 1, "#e6c35c").r(hx + 1, hy - 3, hw - 2, 3, "#e6c35c").r(hx + 1, hy - 1, hw - 2, 1, "#d33d3d"); break;
    case "pirate": p.r(hx - 2, hy - 1, hw + 4, 2, c).r(hx + 1, hy - 4, hw - 2, 3, c).r(cx - 1, hy - 3, 2, 2, white); break;
    case "bicorne": p.r(hx - 3, hy - 1, hw + 6, 2, c).r(hx, hy - 4, hw, 3, c).r(hx - 3, hy - 2, 2, 1, c).r(hx + hw + 1, hy - 2, 2, 1, c).r(cx - 1, hy - 3, 2, 1, gold); break;
    case "marine": p.r(hx, hy - 2, hw, 3, white).r(hx + 1, hy + 1, hw - 2, 1, "#2a4a7a").r(cx - 1, hy - 1, 2, 1, "#2a4a7a"); break;
    case "bandana": p.r(hx, hy - 1, hw, 3, c).r(hx + hw, hy + 1, 2, 3, c); break;
    case "top": p.r(hx - 1, hy, hw + 2, 1, c).r(hx + 1, hy - 5, hw - 2, 5, c).r(hx + 1, hy - 1, hw - 2, 1, band); break;
    case "crown": p.r(hx + 1, hy - 2, hw - 2, 2, gold).r(hx + 1, hy - 3, 1, 1, gold).r(cx - 1, hy - 3, 2, 1, gold).r(hx + hw - 2, hy - 3, 1, 1, gold).r(cx - 1, hy - 1, 2, 1, c); break;
    case "cap": p.r(hx, hy - 2, hw, 3, c).r(hx + hw - 1, hy, 4, 1, band); break;
    case "beanie": p.r(hx, hy - 2, hw, 3, c).r(hx, hy, hw, 1, band).r(cx - 1, hy - 3, 2, 1, white); break;
    case "helmet": p.r(hx - 1, hy - 2, hw + 2, 4, c).r(hx - 1, hy + 1, hw + 2, 1, band).r(cx - 1, hy - 3, 2, 1, band); break;
    case "wide": p.r(hx - 3, hy, hw + 6, 1, c).r(hx + 1, hy - 3, hw - 2, 3, c).r(hx + 1, hy - 1, hw - 2, 1, band); break;
    case "hood": p.r(hx - 1, hy - 2, hw + 2, 3, c).r(hx - 2, hy, 2, 7, c).r(hx + hw, hy, 2, 7, c); break;
    case "bonnet": p.r(hx - 1, hy - 2, hw + 2, 3, c).r(hx - 2, hy, 2, 5, c).r(hx + hw, hy, 2, 5, c).r(hx - 1, hy + 5, 2, 2, white).r(hx + hw - 1, hy + 5, 2, 2, white); break;
    case "jester": p.r(hx, hy - 2, hw, 3, c).r(hx - 2, hy - 4, 3, 3, band).r(hx + hw - 1, hy - 4, 3, 3, band).r(hx - 3, hy - 4, 1, 1, gold).r(hx + hw + 2, hy - 4, 1, 1, gold); break;
    case "plume": p.r(hx - 3, hy, hw + 6, 1, c).r(hx + 1, hy - 3, hw - 2, 3, c).r(hx + hw - 2, hy - 6, 2, 4, "#f4f4f4").r(hx + hw - 1, hy - 6, 2, 1, "#f4f4f4"); break;
    case "turban": p.r(hx - 1, hy - 3, hw + 2, 4, c).r(cx - 1, hy - 2, 2, 2, gold); break;
    case "tall": p.r(hx, hy, hw, 1, c).r(hx + 2, hy - 6, hw - 4, 6, c).r(hx + 2, hy - 2, hw - 4, 1, gold); break;
    case "goat": p.r(hx, hy - 2, hw, 3, c).r(hx + 2, hy - 5, 6, 3, "#efe8d6").r(hx + 1, hy - 6, 1, 2, "#b8a98c").r(hx + 7, hy - 6, 1, 2, "#b8a98c"); break;
    case undefined: break;
  }
}

function drawWeapon(f: Frame, weapon: Look["w"], c: string) {
  const { p, rx, rhy, lx, lhy, g, hx, hy, hw } = f;
  const x = Math.min(rx + g.aw - 1, g.W - 2);
  const top = HEAD - 2;
  const katana = (bx: number, by: number, grip: string) => {
    const long = 12, y = by - long + 4;
    p.r(bx, y, 2, long, ink).r(bx, y + 1, 1, long - 5, silver).r(bx - 1, y + long - 4, 4, 1, gold).r(bx, y + long - 3, 2, 3, grip);
  };
  switch (weapon) {
    case "katana": katana(x, rhy, c); break;
    case "katana2": katana(x, rhy, c); katana(lx, lhy, c); break;
    case "katana3": katana(x, rhy, c); katana(lx, lhy, c); p.r(hx - 2, hy + 6, hw + 4, 1, silver).r(hx + hw / 2 - 1, hy + 6, 2, 1, c); break;
    case "greatsword": p.r(x, top, 2, rhy - top + 3, ink).r(x, top + 1, 1, rhy - top - 2, c).r(x - 2, rhy - 3, 6, 1, gold).r(x, rhy - 4, 2, 1, "#43c66b"); break;
    case "club": p.r(x - 1, rhy - 9, 3, 11, ink).r(x, rhy - 8, 1, 8, c).r(x - 1, rhy - 7, 1, 1, silver).r(x + 1, rhy - 5, 1, 1, silver).r(x - 1, rhy - 3, 1, 1, silver); break;
    case "staff": p.r(x, top, 1, f.bottom - top, c); break;
    case "spear": p.r(x, top + 2, 1, f.bottom - top - 2, c).r(x - 1, top, 3, 2, silver).r(x, top - 1, 1, 1, silver); break;
    case "trident": p.r(x, top + 2, 1, f.bottom - top - 2, c).r(x - 2, top + 1, 5, 1, silver).r(x - 2, top - 1, 1, 2, silver).r(x, top - 1, 1, 2, silver).r(x + 2, top - 1, 1, 2, silver); break;
    case "bisento": p.r(x, top + 3, 1, f.bottom - top - 3, c).r(x - 2, top, 3, 4, silver).r(x - 3, top + 1, 1, 2, silver).r(x - 1, top + 4, 3, 1, gold); break;
    case "gun": p.r(rx - 1, rhy, 5, 2, ink).r(rx, rhy, 4, 1, c); break;
    case "hook": p.r(lx - 1, lhy + 1, 2, 2, gold).r(lx - 2, lhy + 2, 1, 2, gold).r(lx - 1, lhy + 4, 1, 1, gold); break;
    case "axe": p.r(x, rhy - 7, 1, 9, "#8a5a32").r(x + 1, rhy - 7, 2, 4, silver).r(x - 1, rhy - 6, 1, 2, silver); break;
    case "claws": [0, 1, 2].forEach(i => { p.r(rx + i, rhy + 2, 1, 3, silver); p.r(lx + i, lhy + 2, 1, 3, silver); }); break;
    case "cane": p.r(x, rhy, 1, f.bottom - rhy, c).r(x, rhy - 1, 2, 1, c); break;
    case "tonfa": p.r(rx - 1, rhy, 4, 1, c).r(lx - 1, lhy, 4, 1, c); break;
    case "bat": p.r(x - 1, rhy - 8, 3, 9, ink).r(x, rhy - 7, 1, 7, c); break;
    case "umbrella": p.r(x - 3, rhy - 10, 7, 2, c).r(x - 2, rhy - 11, 5, 1, c).r(x, rhy - 8, 1, 9, ink); break;
    case "blades": p.r(rx - 1, rhy - 1, 4, 4, silver).r(rx, rhy, 2, 2, ink).r(lx - 1, lhy - 1, 4, 4, silver).r(lx, lhy, 2, 2, ink); break;
    case "whip": for (let i = 0; i < 6; i++) p.r(rx + 1 + (i % 2), rhy + 2 + i, 1, 1, c); break;
    case "knife": p.r(x, rhy - 3, 1, 4, silver).r(x - 1, rhy, 3, 1, c); break;
    case "brush": p.r(x, rhy - 7, 1, 8, "#8a5a32").r(x - 1, rhy - 9, 3, 2, c); break;
    case "fork": p.r(x, top + 3, 1, f.bottom - top - 3, c).r(x - 2, top + 2, 5, 1, c).r(x - 2, top, 1, 2, c).r(x + 2, top, 1, 2, c).r(x, top, 1, 2, c); break;
    case "jitte": p.r(x, rhy - 7, 2, 9, ink).r(x, rhy - 6, 1, 6, c).r(x - 1, rhy - 2, 1, 2, silver); break;
    case undefined: break;
  }
}

function drawExtra(f: Frame, spec: string, accent: string) {
  const [name, a = accent, b] = spec.split(":");
  const { p, hx, hy, hw, hh, cx, tx, ty, tw, th, lx, rx, lhy, rhy, g } = f;
  switch (name) {
    case "beard": p.r(hx + 1, hy + 5, hw - 2, 3, a).r(hx + 2, hy + hh, hw - 4, 2, a).r(cx - 1, hy + 6, 2, 1, shade(a, -0.4)); break;
    case "goatee": p.r(cx - 1, hy + hh - 1, 2, 3, a); break;
    case "braid": p.r(cx - 1, hy + hh - 1, 2, 6, a).r(cx - 2, hy + hh + 4, 4, 1, gold); break;
    case "stache": p.r(cx - 3, hy + 5, 6, 1, a).r(cx - 4, hy + 4, 1, 1, a).r(cx + 3, hy + 4, 1, 1, a); break;
    case "crescent": p.r(hx + 1, hy + 5, hw - 2, 1, a).r(hx - 1, hy + 2, 2, 4, a).r(hx + hw - 1, hy + 2, 2, 4, a); break;
    case "glasses": p.r(hx + 1, hy + 3, 3, 3, a).r(hx + hw - 4, hy + 3, 3, 3, a).r(hx + 2, hy + 4, 1, 1, ink).r(hx + hw - 3, hy + 4, 1, 1, ink).r(cx - 1, hy + 4, 2, 1, a); break;
    case "shades": p.r(hx + 1, hy + 3, hw - 2, 2, a).r(hx + 2, hy + 3, 1, 1, shade(a, 0.5)); break;
    case "nose": p.r(cx - 1, hy + 4, 2, 2, a); break;
    case "longnose": p.r(hx + hw - 1, hy + 5, 4, 1, a); break;
    case "saw": p.r(hx + hw - 1, hy + 4, 5, 2, a).r(hx + hw, hy + 6, 1, 1, white).r(hx + hw + 2, hy + 6, 1, 1, white); break;
    case "scar": p.r(hx + 2, hy + 2, 1, 4, a); break;
    case "xscar": p.r(cx - 2, hy + 2, 1, 1, a).r(cx - 1, hy + 3, 2, 1, a).r(cx + 1, hy + 2, 1, 1, a).r(cx - 2, hy + 4, 1, 1, a).r(cx + 1, hy + 4, 1, 1, a); break;
    case "mask": p.r(hx + 1, hy + 1, hw - 2, hh - 1, a).r(hx + 2, hy + 4, 2, 1, ink).r(hx + hw - 4, hy + 4, 2, 1, ink); break;
    case "killermask": p.r(hx, hy, hw, hh, a); for (let i = 1; i < hw; i += 2) p.r(hx + i, hy + 1, 1, hh - 2, b ?? "#d43c3c"); break;
    case "patch": p.r(hx + hw - 4, hy + 3, 3, 2, ink).r(hx, hy + 2, hw, 1, ink); break;
    case "ears": if (b === "rabbit") p.r(hx + 1, hy - 6, 2, 6, a).r(hx + hw - 3, hy - 6, 2, 6, a).r(hx + 2, hy - 5, 1, 4, "#ffc0cb").r(hx + hw - 2, hy - 5, 1, 4, "#ffc0cb");
      else if (b === "dog") p.r(hx - 2, hy, 2, 6, a).r(hx + hw, hy, 2, 6, a);
      else p.r(hx - 1, hy - 2, 3, 3, a).r(hx + hw - 2, hy - 2, 3, 3, a); break;
    case "mane": p.under(hx - 3, hy - 3, hw + 6, hh + 6, a); break;
    case "tail": p.under(tx - 4, ty + 3, 2, 6, a).under(tx - 3, ty + 8, 4, 2, a); break;
    case "horns": p.r(hx, hy - 3, 2, 3, a).r(hx - 1, hy - 4, 1, 2, a).r(hx + hw - 2, hy - 3, 2, 3, a).r(hx + hw, hy - 4, 1, 2, a); break;
    case "bighorns": p.r(hx - 2, hy - 2, 3, 3, a).r(hx - 3, hy - 5, 2, 4, a).r(hx + hw - 1, hy - 2, 3, 3, a).r(hx + hw + 1, hy - 5, 2, 4, a); break;
    case "wings": p.under(tx - 6, ty - 3, 6, 9, a).under(tx + tw, ty - 3, 6, 9, a).under(tx - 7, ty - 4, 2, 4, shade(a, 0.3)).under(tx + tw + 5, ty - 4, 2, 4, shade(a, 0.3)); break;
    case "halo": p.r(hx + 2, hy - 6, hw - 4, 1, a).r(hx + 1, hy - 5, 1, 1, a).r(hx + hw - 2, hy - 5, 1, 1, a); break;
    case "sockets": p.r(hx + 1, hy + 3, 3, 2, ink).r(hx + hw - 4, hy + 3, 3, 2, ink).r(cx - 2, hy + 6, 4, 1, ink); break;
    case "fin": p.r(cx - 1, hy - 4, 3, 4, a).r(cx, hy - 5, 2, 1, a); break;
    case "cigar": p.r(hx + hw - 3, hy + 6, 3, 1, "#7a4a2a").r(hx + hw, hy + 6, 1, 1, "#ff7a3a").r(hx + hw, hy + 3, 1, 2, "#d0d6de"); break;
    case "goggles": p.r(hx, hy + 1, hw, 1, ink).r(hx + 1, hy, 3, 2, a).r(hx + hw - 4, hy, 3, 2, a); break;
    case "fire": p.under(lx - 2, lhy - 2, 2, 3, a).under(rx + g.aw, rhy - 2, 2, 3, a).under(lx - 1, lhy - 4, 1, 2, shade(a, 0.4)).under(rx + g.aw, rhy - 4, 1, 2, shade(a, 0.4)); break;
    case "legfire": p.under(g.legX - 2, g.legY + HEAD + 1, 2, g.legH, a).under(g.legX + g.gap + 4, g.legY + HEAD + 1, 2, g.legH, a); break;
    case "spark": [[tx - 3, ty - 2], [tx - 2, ty], [tx - 3, ty + 2], [tx - 2, ty + 4]].forEach(([x, y]) => p.under(x, y, 2, 2, a));
      [[tx + tw + 1, ty + 1], [tx + tw, ty + 3], [tx + tw + 1, ty + 5]].forEach(([x, y]) => p.under(x, y, 2, 2, a)); break;
    case "smoke": p.under(g.legX - 3, g.legY + HEAD + 1, 3, 3, a).under(g.legX + g.gap + 4, g.legY + HEAD, 3, 3, a).under(tx - 4, ty + 2, 3, 3, a); break;
    case "clouds": p.under(0, f.bottom - 2, 4, 3, a).under(g.W - 4, f.bottom - 2, 4, 3, a).under(2, f.bottom - 4, 3, 2, a).under(g.W - 5, f.bottom - 4, 3, 2, a); break;
    case "belt": p.r(tx + 1, ty + th - 3, tw - 2, 1, a); break;
    case "sash": p.r(tx + 1, ty + th - 4, tw - 2, 2, a); break;
    case "stripe": p.r(cx - 1, ty + 1, 2, th - 2, a); break;
    case "tie": p.r(cx - 1, ty + 1, 2, 5, a); break;
    case "open": p.r(cx - 1, ty + 1, 2, th - 3, f.sk); break;
    case "bigfist": p.r(rx - 1, rhy - 3, 6, 6, ink).r(rx, rhy - 2, 4, 4, a); break;
    case "bajrang": p.r(rx - 3, rhy - 10, 9, 9, ink).r(rx - 2, rhy - 9, 7, 7, a).r(rx - 1, rhy - 8, 2, 2, shade(a, 0.5)); break;
    case "tattoo": p.r(hx + 1, hy + 3, 2, 3, a); break;
    case "lips": p.r(cx - 1, hy + 6, 2, 1, a); break;
    case "grin": p.r(cx - 2, hy + 6, 4, 1, white).r(cx - 1, hy + 6, 1, 1, ink); break;
    case "earrings": p.r(hx - 1, hy + 6, 1, 1, a).r(hx + hw, hy + 6, 1, 1, a); break;
    case "drums": for (let i = 0; i < 5; i++) p.under(tx - 3 + i * ((tw + 4) / 4), ty - 3 + (i % 2), 2, 2, a); p.under(tx - 3, ty - 2, tw + 6, 1, shade(a, -0.3)); break;
    case "spider": for (let i = 0; i < 4; i++) { p.under(tx - 2 - i, ty + 1 + i * 2, 2 + i, 1, a); p.under(tx + tw, ty + 1 + i * 2, 2 + i, 1, a); } break;
    case "coatwing": p.under(tx - 3, ty, 3, th + 3, a).under(tx + tw, ty, 3, th + 3, a); break;
    case "scarf": p.r(hx + 1, hy + 5, hw - 2, 3, a).r(hx + hw - 2, hy + 7, 3, 4, a); break;
    case "tongue": p.r(cx, hy + 6, 1, 4, a); break;
    case "shell": p.under(tx - 2, ty, tw + 4, th, a); break;
    case "gills": p.r(hx + 1, hy + 5, 1, 1, a).r(hx + hw - 2, hy + 5, 1, 1, a); break;
    case "room": p.under(0, ty - 4, g.W, 1, a).under(0, f.bottom, g.W, 1, a).under(0, ty - 4, 1, f.bottom - ty + 5, a).under(g.W - 1, ty - 4, 1, f.bottom - ty + 5, a); break;
    case "magnet": p.r(lx - 3, lhy - 5, 5, 7, ink).r(lx - 2, lhy - 4, 3, 5, a).r(lx - 2, lhy - 6, 1, 1, silver).r(lx, lhy - 6, 1, 1, silver); break;
    case "neck": p.r(cx - 1, ty - 6, 2, 6, f.sk); break;
    case "sumo": p.r(tx + 1, ty + th - 4, tw - 2, 3, a); break;
    case "shell2": p.r(hx + 1, hy - 1, hw - 2, 2, a); break;
    case "body": p.r(tx + 1, ty + 1, tw - 2, th - 2, a).r(lx, lhy - 3, g.aw, 3, a).r(rx, rhy - 3, g.aw, 3, a); break;
  }
}

/** Special non-humanoid bodies. */
function drawSpecial(look: Look, pose: Pose): Frame | null {
  if (look.b !== "small" || !look.special) return null;
  const step = pose === -1 ? 0 : pose === 0 ? -1 : 1;
  const p = new Pixels(18, 22 + HEAD);
  const o = HEAD;
  if (look.special === "duck") {
    p.r(5 + step, 18 + o, 2, 4, "#e8973a").r(11 - step, 18 + o, 2, 4, "#e8973a").r(4 + step, 21 + o, 4, 1, "#e8973a").r(10 - step, 21 + o, 4, 1, "#e8973a");
    p.r(2, 9 + o, 14, 10, ink).r(3, 10 + o, 12, 8, look.t).r(1, 11 + o, 3, 4, look.t);
    p.r(9, 1 + o, 7, 10, ink).r(10, 2 + o, 5, 9, look.t).r(15, 5 + o, 3, 2, "#e8973a").r(12, 4 + o, 1, 1, ink);
    p.r(10, 0 + o, 1, 2, look.h).r(12, -1 + o, 1, 3, look.h);
    p.r(5, 12 + o, 6, 3, shade(look.t, -0.15));
    p.r(9, 10 + o, 6, 2, look.l);
  } else {
    // egg
    p.r(6 + step, 18 + o, 2, 4, "#e8973a").r(10 - step, 18 + o, 2, 4, "#e8973a");
    p.r(3, 4 + o, 12, 15, ink).r(4, 5 + o, 10, 13, look.t).r(5, 3 + o, 8, 2, ink).r(5, 4 + o, 8, 1, look.t);
    p.r(6, 9 + o, 1, 1, ink).r(11, 9 + o, 2, 2, gold).r(11, 9 + o, 1, 1, ink).r(8, 12 + o, 3, 1, "#e8973a");
    p.r(5, 0 + o, 8, 3, look.h).r(4, 3 + o, 10, 1, look.h);
    p.r(4, 15 + o, 10, 1, look.l);
  }
  const g = { ...BUILDS.small, W: 18, H: 22 };
  return { p, g, cx: 9, hx: 4, hy: o + 2, hw: 10, hh: 7, tx: 4, ty: o + 10, tw: 10, th: 8, lx: 3, rx: 13, lhy: o + 14, rhy: o + 14, sk: look.sk ?? defaultSkin, bottom: 22 + HEAD - 1 };
}

/** Removes empty headroom so every sprite stands on the same baseline. */
export function trimTop(p: Pixels) {
  let top = 0;
  while (top < p.height - 1 && p.cells[top].every(cell => cell === ".")) top++;
  if (top) { p.cells = p.cells.slice(top); p.height -= top; }
  return top;
}

export const MYTHIC_SHIMMER = ["#ffe066", "#ffffff", "#ff8de0"];

/** Draws the body, hair, extras, hat, weapon and coat — everything except rarity effects. */
/** Extras that are floating effects rather than part of the body (left out of aura outlines). */
const EFFECT_EXTRAS = new Set(["spark", "smoke", "fire", "legfire", "clouds", "room", "drums"]);

export function buildFigure(id: ChestCharacterId, pose: Pose, slim = false, bodyOnly = false) {
  const look = CHEST_LOOKS[id];
  const character = chestCharacterById(id)!;
  return { ...figureFromLook(look, look.fx ?? character.color, pose, slim, bodyOnly), rarity: character.rarity as ChestCharacterRarity };
}

/** Builds a figure straight from a look (used by one-off art such as the creator's Gear 6). */
export function figureFromLook(look: Look, accent: string, pose: Pose, slim = false, bodyOnly = false) {
  const f = drawSpecial(look, pose) ?? drawBody(look, pose, slim);
  if (!look.special) {
    drawHair(f, look.hs, look.h);
    const extras = (look.x ?? []).filter((extra) => !bodyOnly || !EFFECT_EXTRAS.has(extra.replace("^", "").split(":")[0]));
    for (const extra of extras) if (!extra.startsWith("^")) drawExtra(f, extra, accent);
    drawHat(f, look.hat, look.hc ?? look.h);
    for (const extra of extras) if (extra.startsWith("^")) drawExtra(f, extra.slice(1), accent);
    if (!(slim && look.ow)) drawWeapon(f, look.w, look.wc ?? "#7a4a2a");
    if (look.coat) {
      const { p, tx, ty, tw, g } = f;
      p.r(tx - 1, ty, tw + 2, 2, look.coat);
      p.under(tx - 2, ty, 3, g.legY + HEAD - ty + 3, look.coat).under(tx + tw - 1, ty, 3, g.legY + HEAD - ty + 3, look.coat);
    }
  }
  return { f, look, accent };
}

function drawChest(id: ChestCharacterId, pose: Pose, frame: number): RunnerSprite {
  const { f, look, rarity, accent } = buildFigure(id, pose);
  const { p } = f;
  const glowEye = rarity === "mythic" ? accent : null;
  if (glowEye && !look.special) {
    p.r(f.hx + 2, f.hy + 4, 1, 1, glowEye).r(f.hx + f.hw - 3, f.hy + 4, 1, 1, glowEye);
  }
  if (rarity === "epic") {
    // Two twinkles orbiting the head.
    const twinkle = shade(accent, 0.45);
    p.under(f.hx - 3 + (frame % 2), f.hy - 1, 1, 1, twinkle).under(f.hx + f.hw + 2 - (frame % 2), f.hy + 2, 1, 1, twinkle);
  }
  let top = trimTop(p);
  let pad = 0;
  if (rarity === "legendary") pad = p.aura(shade(accent, 0.15));
  if (rarity === "mythic") pad = p.aura(shade(accent, 0.2), MYTHIC_SHIMMER[frame], 2);
  top -= pad;
  return p.finish(Math.max(0, f.hx - 3 + pad), Math.max(0, f.hy - 3 - top));
}

const cache = new Map<ChestCharacterId, RunnerSprite[]>();
/** frame 0 = idle, 1 = left stride, 2 = right stride. */
export function chestSprite(id: ChestCharacterId, frame: 0 | 1 | 2): RunnerSprite {
  let frames = cache.get(id);
  if (!frames) {
    frames = [drawChest(id, -1, 0), drawChest(id, 0, 1), drawChest(id, 1, 2)];
    cache.set(id, frames);
  }
  return frames[frame];
}
