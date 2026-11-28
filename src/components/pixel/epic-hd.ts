import { chestCharacterById, type ChestCharacterId } from "@/data/chest-characters";
import type { CharacterId } from "@/data/playable-characters";
import { CHEST_LOOKS, type Look } from "./chest-looks";
import { figureFromLook } from "./generated";
import { shade, type Pose, type RunnerSprite, type Pixels } from "./kit";
import { renderHd, type Painter, type Px } from "./mythic-hd";
import { EPIC_PAINTERS, EPIC_LOOK, EPIC_MARGIN } from "./epic-painters";

// High-detail Epic art. Same 2× pipeline as the legendaries (shading, coloured outlines, real faces
// and a hand-drawn detail pass per character), one step down again in spectacle: a single soft
// rim light hugging the silhouette and two small glints. No haze, no motes, no stars.

/**
 * Epic glow: a thin translucent rim right against the silhouette, a dotted second ring,
 * and two glints near the head that swap sides between frames.
 */
export function epicAura(p: Pixels, body: boolean[][], accent: string, frame: number, pad = 3) {
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
  const next: Px[] = [];
  for (const [x, y] of edge) for (const [dx, dy] of N8) {
    const nx = x + dx, ny = y + dy;
    if (outside[ny]?.[nx] && !ring[ny][nx] && !isBody(nx, ny)) { ring[ny][nx] = 2; next.push([nx, ny]); }
  }
  edge = next;
  const rim = p.key(`${shade(accent, 0.35)}c0`), soft = p.key(`${shade(accent, 0.15)}60`);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (ring[y][x] === 1) p.cells[y][x] = rim;
    else if (ring[y][x] === 2 && (x + y + frame) % 2 === 0) p.cells[y][x] = soft;
  }
  // Two glints: the highest ring-2 cells left and right of centre, swapping brightness per frame.
  const glint = p.key(shade(accent, 0.7)), arm = p.key(`${shade(accent, 0.45)}b0`);
  const pick = (side: -1 | 1) => {
    for (let y = 0; y < h; y++) for (let k = 0; k < w / 2; k++) {
      const x = side < 0 ? k : w - 1 - k;
      if (ring[y][x] === 2) return [x + side * -1 * 0, y + 3] as Px;
    }
    return null;
  };
  [pick(-1), pick(1)].forEach((pt, i) => {
    if (!pt || (frame + i) % 3 === 2) return;
    const [x, y] = pt;
    if (!outside[y]?.[x] || isBody(x, y)) return;
    p.cells[y][x] = glint;
    for (const [dx, dy] of N4) if (outside[y + dy]?.[x + dx] && !isBody(x + dx, y + dy) && ring[y + dy][x + dx] !== 1) p.cells[y + dy][x + dx] = arm;
  });
  return pad;
}

export function isEpicArt(id: CharacterId): id is ChestCharacterId {
  return chestCharacterById(id)?.rarity === "epic";
}

function lookFor(id: ChestCharacterId): { look: Look; accent: string } {
  const look = { ...CHEST_LOOKS[id], ...EPIC_LOOK[id] };
  return { look, accent: look.fx ?? chestCharacterById(id)!.color };
}

function buildEpic(id: ChestCharacterId, pose: Pose, frame: number): RunnerSprite {
  const { look, accent } = lookFor(id);
  const paint: Painter | undefined = EPIC_PAINTERS[id];
  return renderHd(figureFromLook(look, accent, pose, true), figureFromLook(look, accent, pose, true, true), paint, frame, pose,
    { margin: EPIC_MARGIN[id], aura: (p, body, a, fr) => epicAura(p, body, a, fr) });
}

const cache = new Map<ChestCharacterId, RunnerSprite[]>();
/** High-detail epic sprite (2 pixels per world pixel). frame 0 = idle, 1/2 = strides. */
export function epicHdSprite(id: ChestCharacterId, frame: 0 | 1 | 2): RunnerSprite {
  let frames = cache.get(id);
  if (!frames) {
    frames = [buildEpic(id, -1, 0), buildEpic(id, 0, 1), buildEpic(id, 1, 2)];
    cache.set(id, frames);
  }
  return frames[frame];
}
