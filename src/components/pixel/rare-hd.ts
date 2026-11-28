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
  "jinbe-warlord": { eyes: "glare", iris: "#2a2d3a", mouth: "fangs", touch: (d) => {
    d.recolor("#3a5aa8", 0, d.ty, d.W, d.p.height, (x, y) => (x + y * 2) % 9 === 0 ? "#6a8ad8" : null);
  } },
  smoker: { eyes: "glare", iris: "#3a3f52", mouth: "line", touch: (d) => {
    d.trim("#f2f4f7", "#c8cedc", d.ty);
  } },
  tashigi: { eyes: "stern", iris: "#3a3f52", mouth: "line", touch: (d) => {
    d.belt("#2a2d3a", "#c0c8d4");
  } },
  crocodile: { eyes: "glare", iris: "#5a4a2a", mouth: "smirk", touch: (d) => {
    d.wipeScar();
    d.line(d.hx + 3, d.ey + 2, d.hx + d.hw - 4, d.ey + 2, "#d08a7a");
    for (let i = 0; i < d.tw + 4; i += 2) d.d(d.tx - 2 + i, d.ty, i % 4 ? "#d8c08a" : "#b89a60");
  } },
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
