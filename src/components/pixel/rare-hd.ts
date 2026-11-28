import { chestCharacterById, type ChestCharacterId } from "@/data/chest-characters";
import type { CharacterId } from "@/data/playable-characters";
import { CHEST_LOOKS } from "./chest-looks";
import { figureFromLook } from "./generated";
import { ink, white, shade, type Pose, type RunnerSprite } from "./kit";
import { renderHd, type Detail } from "./mythic-hd";
import { strands, openFront } from "./legendary-hd";

// High-detail Rare art: the same 2× figure as the Epics (shading, coloured outlines and real
// eyes and mouths), with one or two small signature touches each. No aura, no glints and no big
// effects: those stay Epic and above.

type Eyes = Parameters<Detail["eyes"]>[0];
type Mouth = Parameters<Detail["mouth"]>[0];
interface Rare { eyes?: Eyes; iris?: string; mouth?: Mouth; touch?: (d: Detail) => void }

const dotsOn = (d: Detail, family: string, c: string, every: number, y0 = d.ty) =>
  d.recolor(family, 0, y0, d.W, d.p.height - y0, (x, y) => (x * 3 + y * 2) % every === 0 ? c : null);

// Straw Hat Jinbe's Jolly Roger emblem: a black disc with a white rim, skull and crossbones.
const EMBLEM = [
  "..wwwww..",
  ".wkkkkkw.",
  "wkkwwwkkw",
  "wkwkwkwkw",
  "wkkwwwkkw",
  "wkwkkkwkw",
  "wkkwkwkkw",
  ".wkkkkkw.",
  "..wwwww..",
];
const KIMONO = "#f2c232", FLOWER = "#b07a1c", DOT = "#fbf6e6", SASH = "#4cae3a", CAPE = "#e8622c";

function paintJinbe(d: Detail) {
  const { hx, hy, hw, hh, cx, tc, ty, tx, tw, th } = d, dark = shade(d.sk, -0.55);
  // Orange haori draped over both shoulders and hanging behind him almost to the ground.
  d.asBody(() => {
    for (let y = ty - 1; y < d.bottom - 2; y++) {
      const spread = Math.min(5, 2 + Math.floor((y - ty) / 6));
      d.u(tx - spread - 2, y, tw + spread * 2 + 4, 1, y % 5 === 0 ? shade(CAPE, -0.22) : CAPE);
      d.u(tx - spread - 3, y, 1, 1, ink).u(tx + tw + spread + 2, y, 1, 1, ink);
    }
    d.u(tx - 7, d.bottom - 2, tw + 14, 1, ink);
  });
  d.r(tx - 2, ty - 1, 6, 4, CAPE).r(tx + tw - 4, ty - 1, 6, 4, CAPE).r(tx - 2, ty - 1, 6, 1, "#ff9a5a").r(tx + tw - 4, ty - 1, 6, 1, "#ff9a5a");
  // One long robe down to the shins (bare blue feet below).
  d.r(tx + 1, ty + th - 2, tw - 2, d.bottom - ty - th - 2, KIMONO).r(tx, ty + th - 2, 1, d.bottom - ty - th - 2, ink).r(tx + tw - 1, ty + th - 2, 1, d.bottom - ty - th - 2, ink)
    .r(tx, d.bottom - 4, tw, 1, ink).r(tc, ty + th, 1, d.bottom - ty - th - 4, "#c8941c");
  // A stern frown, the tuft of beard under it, a scar over one eye and the tusks from the lower jaw.
  d.f(cx - 3, hy + 13, 6, 1, dark).f(cx - 4, hy + 14, 1, 1, dark).f(cx + 3, hy + 14, 1, 1, dark);
  d.r(cx - 2, hy + 15, 4, 2, "#17161e").r(cx - 1, hy + 17, 2, 1, "#17161e");
  d.line(d.R + 3, d.ey - 4, d.R + 1, d.ey + 2, "#8a5a6a");
  for (const x of [hx + 1, hx + hw - 5]) {
    d.f(x - 1, hy + hh - 3, 6, 4, "#d8b890").f(x - 1, hy + hh, 6, 1, "#b8946a"); // tan pad the tusk grows from
    d.r(x, hy + hh - 6, 4, 6, ink).r(x + 1, hy + hh - 5, 2, 5, "#f4ecd8").d(x + 1, hy + hh - 5, "#fffaf0").d(x + 2, hy + hh - 1, "#d8ccb0").d(x, hy + hh - 6, "#d8b890").d(x + 3, hy + hh - 6, "#d8b890");
  }
  strands(d, "#17161e", hy - 12, 26);
  // Kimono print: big Jolly Roger emblems, brown flowers and white dots, only on the yellow cloth.
  const by = ty + th - 5;
  const emblems: [number, number][] = [[tc - 7, ty + 12], [tc + 7, ty + 12], [tc - 5, d.bottom - 10], [tc + 6, d.bottom - 11]];
  d.recolor(KIMONO, 0, ty - 2, d.W, d.p.height - ty + 2, (x, y) => {
    for (const [ex, ey] of emblems) {
      const k = EMBLEM[y - ey + 4]?.[x - ex + 4];
      if (k === "k") return "#1a1a22";
      if (k === "w") return DOT;
    }
    const gy = Math.round((y - ty - 3) / 6), gx = Math.round((x - tc - (gy % 2 ? 3 : 0)) / 6);
    const ox = x - tc - (gy % 2 ? 3 : 0) - gx * 6, oy = y - ty - 3 - gy * 6;
    if ((gx + gy) % 2 === 0) return Math.abs(ox) + Math.abs(oy) <= 1 ? DOT : null;
    return (Math.abs(ox) <= 1 && oy === 0) || (ox === 0 && Math.abs(oy) <= 1) ? FLOWER : null;
  });
  // Crossed kimono collar opening on the blue chest, with the red sun tattoo.
  for (let i = 0; i < 10; i++) {
    const half = Math.max(1, 6 - Math.floor(i / 2));
    d.r(tc - half, ty + i, half * 2, 1, d.sk).d(tc - half - 1, ty + i, "#c8941c").d(tc + half, ty + i, "#c8941c");
  }
  const sy = ty + 5;
  d.r(tc - 2, sy, 4, 2, "#d83a2a").d(tc - 3, sy, "#d83a2a").d(tc + 2, sy, "#d83a2a").d(tc - 1, sy - 1, "#d83a2a").d(tc, sy - 1, "#d83a2a")
    .d(tc - 4, sy - 1, "#d83a2a").d(tc + 3, sy - 1, "#d83a2a").d(tc - 1, sy + 2, "#a82a1e").d(tc, sy + 2, "#a82a1e").d(tc - 1, sy, "#ffd0a0");
  // Green sash round the waist, tied in a knot at the front with its ends hanging down.
  d.r(tx + 1, by, tw - 2, 3, SASH).r(tx + 1, by + 2, tw - 2, 1, shade(SASH, -0.25)).r(tx + 1, by, tw - 2, 1, "#6ccc56");
  d.r(tc - 3, by - 1, 6, 5, ink).r(tc - 2, by, 4, 3, "#6ccc56").r(tc - 3, by + 4, 3, 7, ink).r(tc, by + 4, 3, 6, ink)
    .r(tc - 2, by + 4, 2, 6, SASH).r(tc + 1, by + 4, 1, 5, shade(SASH, -0.2));
}

const FUR = "#efe4c4", FUR_SHADE = "#c8b890", ASCOT = "#9ad46a";

function paintCrocodile(d: Detail) {
  const { hx, hw, hy, cx, tc, ty, tx, tw, th, ey } = d, VEST = "#26252c";
  // Slicked-back hair to the nape, the stitched scar straight across his face and a cigar.
  d.wipeScar(["hscar"]);
  d.asBody(() => d.u(hx + hw - 2, hy + 4, 3, 12, "#18171e").u(hx - 1, hy + 4, 2, 8, "#18171e"));
  d.recolor("#d0d6de", hx + hw - 4, hy, 10, 12, () => "#18171e"); // the low-res cigar smoke
  d.recolor("#7a4a2a", hx, hy, hw + 2, 16, () => d.sk).recolor("#ff7a3a", hx, hy, hw + 2, 16, () => d.sk); // and its cigar
  d.f(hx + 1, ey + 2, hw - 2, 3, d.sk);
  for (let x = hx + 2; x < hx + hw - 2; x++) d.f(x, ey + 2, 1, 1, "#8a5444");
  for (let x = hx + 3; x < hx + hw - 3; x += 3) d.f(x, ey + 3, 1, 1, "#6a3c30");
  d.f(cx - 3, hy + 12, 4, 1, shade(d.sk, -0.55));
  d.asBody(() => { for (let i = 0; i < 7; i++) d.r(cx + 1 + i, hy + 11 - (i >> 1), 1, 3, ink); for (let i = 0; i < 6; i++) d.d(cx + 1 + i, hy + 12 - (i >> 1), i % 3 === 2 ? "#c89a5a" : "#8a5a32"); });
  d.d(cx + 7, hy + 9, "#ff7a3a").u(cx + 8, hy + 6, 1, 2, "#d0d6de").u(cx + 9, hy + 3, 1, 2, "#d0d6de");
  // Black vest with gold buttons over a green ascot.
  d.recolor(ASCOT, tx, ty + 8, tw, th, () => VEST);
  d.r(tc - 2, ty - 1, 4, 3, ASCOT).r(tc - 3, ty + 2, 6, 4, ASCOT).r(tc - 2, ty + 6, 4, 2, ASCOT).d(tc - 1, ty + 8, ASCOT)
    .r(tc - 1, ty + 1, 1, 6, "#6aa848").d(tc + 1, ty + 3, "#6aa848").d(tc - 2, ty + 4, "#c8f0a0");
  for (let y = ty + 10; y < ty + th - 4; y += 4) d.d(tc, y, "#e8c23a").d(tc, y + 1, "#a8862a");
  // Belt with a white buckle and studs.
  const by = ty + th - 3;
  d.r(tx + 1, by, tw - 2, 3, "#1e2a30").r(tx + 1, by, tw - 2, 1, "#e8ecf0").r(tx + 1, by + 2, tw - 2, 1, "#e8ecf0");
  for (let x = tx + 2; x < tx + tw - 2; x += 3) d.d(x, by + 1, "#e8ecf0");
  d.r(tc - 3, by - 1, 6, 5, "#e8ecf0").r(tc - 2, by, 4, 3, "#1e2a30").d(tc - 1, by + 1, "#e8ecf0");
  // Long black coat with a grey-blue lining showing on one side.
  d.recolor("#1c1b22", 0, ty + 6, tx - 1, d.bottom - ty, (x) => x >= tx - 4 ? "#5a6a70" : null);
  // The big cream fur collar: over the shoulders and down both lapels, ragged at the edges.
  d.asBody(() => {
    for (const s of [-1, 1]) for (let i = 0; i < 15; i++) {
      const y = ty - 1 + i, w = i < 3 ? 6 : Math.max(2, 5 - Math.floor((i - 3) / 3)), jag = (i * 7) % 3 === 0 ? 1 : 0;
      const inner = s < 0 ? tx + 2 + Math.min(3, Math.max(0, i - 4) >> 2) : tx + tw - 2 - Math.min(3, Math.max(0, i - 4) >> 2);
      const x0 = s < 0 ? inner - w - jag : inner + 1;
      d.r(x0, y, w + jag, 1, FUR).d(s < 0 ? inner - 1 : inner + 1, y, FUR_SHADE).d(s < 0 ? x0 : x0 + w + jag - 1, y, i % 2 ? FUR_SHADE : "#fffaf0");
    }
  });
  // The golden hook on his left hand, with its black bands.
  d.asBody(() => {
    const x = d.lx - 1, y = d.lhy;
    d.r(x - 1, y - 1, 8, 6, ink).r(x, y, 6, 4, "#e8c23a").r(x, y + 1, 6, 1, "#1a1a1a").r(x + 2, y, 1, 4, "#1a1a1a").r(x, y, 6, 1, "#fff0a0");
    d.r(x + 1, y + 5, 2, 5, ink).r(x + 1, y + 5, 1, 4, "#e8c23a").r(x - 2, y + 9, 4, 2, ink).r(x - 1, y + 9, 2, 1, "#e8c23a").r(x - 3, y + 6, 2, 4, ink).d(x - 2, y + 7, "#fff0a0");
  });
}

const RARES: Partial<Record<ChestCharacterId, Rare>> = {
  "robin-miss-all-sunday": { eyes: "stern", iris: "#3a5aa8", mouth: "smile", touch: (d) => {
    d.recolor("#c8a0e0", d.hx - 6, 0, d.hw + 12, d.hy + 2, (x, y) => y === d.hy - 1 ? "#7a4ac8" : null);
    d.sparkle(d.rx + 5, d.rhy - 8, "#f4b8d8");
  } },
  franky: { mouth: "grin", touch: (d) => {
    dotsOn(d, "#e84a4a", "#4ab85a", 7);
    for (const [x, y] of [[d.lx, d.lhy - 6], [d.rx, d.rhy - 6]]) d.r(x + 1, y, 2, 1, "#46b8ff").r(x + 1, y - 1, 1, 3, "#46b8ff");
  } },
  brook: { mouth: "none", touch: (d) => {
    d.r(d.cx - 3, d.hy + 11, 6, 3, ink).r(d.cx - 2, d.hy + 12, 4, 1, white).d(d.cx - 1, d.hy + 12, "#d8d0c0").d(d.cx + 1, d.hy + 12, "#d8d0c0");
    d.r(d.tc - 2, d.ty + 1, 4, 2, "#e04060");
  } },
  "jinbe-warlord": { eyes: "glare", iris: "#2a2d3a", mouth: "none", touch: (d) => paintJinbe(d) },
  smoker: { eyes: "glare", iris: "#3a3f52", mouth: "line", touch: (d) => {
    d.trim("#f2f4f7", "#c8cedc", d.ty);
  } },
  tashigi: { eyes: "stern", iris: "#3a3f52", mouth: "line", touch: (d) => {
    d.belt("#2a2d3a", "#c0c8d4");
  } },
  crocodile: { eyes: "stern", iris: "#8a9a8a", mouth: "smirk", touch: (d) => paintCrocodile(d) },
  "daz-bones": { eyes: "none", mouth: "line", touch: (d) => {
    d.line(d.cx - 4, d.hy + 3, d.cx - 1, d.hy + 7, shade(d.sk, -0.35));
  } },
  "bon-clay": { eyes: "stern", iris: "#3a2a4a", mouth: "smile", touch: (d) => {
    for (const x of [d.L, d.R]) d.f(x, d.ey - 2, 3, 1, "#4a8ae8");
    d.r(d.tc - 3, d.ty, 6, 2, white);
  } },
  wyper: { eyes: "glare", iris: "#2a1a1a", mouth: "line", touch: (d) => {
    d.wipeScar();
    for (const x of [d.L, d.R]) d.f(x + 1, d.ey + 2, 1, 3, "#202020");
  } },
  ohm: { eyes: "none", mouth: "smirk", touch: (d) => {
    for (let i = 0; i < 4; i++) d.u(d.rx + 6 + i * 2, d.rhy - 16 + (i % 2) * 2, 2, 1, "#d8e0ec");
  } },
  satori: { eyes: "none", mouth: "grin", touch: (d) => {
    d.recolor("#f0c77a", d.tx, d.ty, d.tw, d.th, (x, y) => (x + y) % 6 === 0 ? "#d8a850" : null);
  } },
  gedatsu: { eyes: "none", mouth: "open" },
  blueno: { eyes: "stern", iris: "#2a2d3a", mouth: "line", touch: (d) => { d.buttons("#d8d8e0", 2, d.ty + 10, 4); } },
  kalifa: { eyes: "stern", iris: "#3a3f52", mouth: "smile", touch: (d) => {
    for (const [x, y] of [[d.lx - 4, d.lhy - 10], [d.lx - 7, d.lhy - 16]]) d.u(x, y, 3, 3, "#d8f0ffa0").u(x, y, 1, 1, white);
  } },
  fukuro: { eyes: "stern", iris: "#2a2d3a", mouth: "none", touch: (d) => {
    for (let i = 0; i < 6; i++) d.r(d.cx - 3 + i, d.hy + 12, 1, 1, i % 2 ? "#c0c8d4" : "#3a3f52");
  } },
  kumadori: { eyes: "glare", iris: "#5a1a2a", mouth: "open", touch: (d) => {
    d.wipeScar();
    for (const x of [d.L, d.R]) d.f(x - 1, d.ey - 3, 5, 1, "#d02040").f(x + 1, d.ey + 2, 1, 3, "#d02040");
  } },
  jabra: { eyes: "glare", iris: "#5a3a1a", mouth: "fangs" },
  "bellamy-dressrosa": { eyes: "glare", iris: "#3a2a1a", mouth: "grin", touch: (d) => { d.trim("#8a6a5a", "#c8a890", d.ty); } },
  bartolomeo: { eyes: "glare", iris: "#2a5a2a", mouth: "gapGrin", touch: (d) => { d.trim("#d84040", "#ff8a7a", d.ty); } },
  cavendish: { eyes: "stern", iris: "#3a5aa8", mouth: "smile", touch: (d) => {
    strands(d, "#f6e7a2");
    d.sparkle(d.hx - 3, d.hy + 2, "#fff6c0");
  } },
  sai: { eyes: "none", mouth: "line", touch: (d) => { d.buttons("#f0c040", 3, d.ty + 4, 4); } },
  "don-chinjao": { eyes: "stern", iris: "#3a3a3a", mouth: "none", touch: (d) => { strands(d, "#e8e0d0", d.hy + 8, 20); } },
  "baby-5": { eyes: "stern", iris: "#3a3f52", mouth: "smile", touch: (d) => {
    d.r(d.tc - 3, d.ty + 4, 6, d.th - 6, white).r(d.tc - 3, d.ty + 4, 6, 1, "#d8dce6");
  } },
  "senor-pink": { eyes: "none", mouth: "line", touch: (d) => {
    d.r(d.tc - 3, d.ty, 6, 5, white).r(d.tc - 2, d.ty + 1, 4, 3, "#f8d8e8");
  } },
  diamante: { eyes: "glare", iris: "#3a2a4a", mouth: "grin", touch: (d) => { d.trim("#7a4ac8", "#f0c040", d.ty); } },
  trebol: { eyes: "none", mouth: "open", touch: (d) => {
    d.r(d.cx, d.hy + 11, 1, 3, "#a8d880").d(d.cx, d.hy + 14, "#c8f0a0");
  } },
  pica: { eyes: "stern", iris: "#3a3a3a", mouth: "line", touch: (d) => {
    d.recolor("#b8b4a8", 0, 0, d.W, d.p.height, (x, y) => (x * 5 + y * 3) % 13 === 0 ? "#8a8678" : null);
  } },
  rebecca: { eyes: "stern", iris: "#3a5a2a", mouth: "smile", touch: (d) => { d.trim("#c0c8d4", "#f3a7c8", d.ty); } },
  kyros: { eyes: "stern", iris: "#3a3a2a", mouth: "none", touch: (d) => {
    d.wipeScar();
    d.line(d.R + 1, d.ey - 3, d.R + 2, d.ey + 3, "#c08a6a");
  } },
  pekoms: { eyes: "none", mouth: "line", touch: (d) => {
    d.recolor("#7a8a5a", 0, d.ty - 2, d.W, d.th + 4, (x, y) => (x + y) % 4 === 0 ? "#5a6a3a" : null);
  } },
  monet: { eyes: "stern", iris: "#3a5a4a", mouth: "smile", touch: (d) => {
    for (const [x, y] of [[d.lx - 5, d.lhy - 12], [d.rx + 8, d.rhy - 18]]) d.sparkle(x, y, "#e0f4ff");
  } },
};

export function isRareArt(id: CharacterId): id is ChestCharacterId {
  return chestCharacterById(id)?.rarity === "rare" && !CHEST_LOOKS[id as ChestCharacterId]?.special;
}

function paintRare(id: ChestCharacterId) {
  const spec = RARES[id] ?? {};
  const look = CHEST_LOOKS[id];
  return (d: Detail) => {
    d.eyes(spec.eyes ?? "stern", spec.iris).mouth(spec.mouth ?? "line");
    if (look.hs && !["bald", "none"].includes(look.hs)) strands(d, look.h);
    if (look.x?.some((x) => x.startsWith("open"))) openFront(d, 6, 2);
    spec.touch?.(d);
  };
}

function buildRare(id: ChestCharacterId, pose: Pose, frame: number): RunnerSprite {
  const look = CHEST_LOOKS[id], accent = look.fx ?? chestCharacterById(id)!.color;
  return renderHd(figureFromLook(look, accent, pose, true), figureFromLook(look, accent, pose, true, true), paintRare(id), frame, pose,
    { margin: 4, aura: () => 0 });
}

const cache = new Map<ChestCharacterId, RunnerSprite[]>();
/** High-detail rare sprite (2 pixels per world pixel). frame 0 = idle, 1/2 = strides. */
export function rareHdSprite(id: ChestCharacterId, frame: 0 | 1 | 2): RunnerSprite {
  let frames = cache.get(id);
  if (!frames) {
    frames = [buildRare(id, -1, 0), buildRare(id, 0, 1), buildRare(id, 1, 2)];
    cache.set(id, frames);
  }
  return frames[frame];
}
