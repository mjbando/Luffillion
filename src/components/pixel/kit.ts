export interface RunnerSprite {
  width: number;
  height: number;
  rows: string[];
  palette: Record<string, string>;
  goldHat: { x: number; y: number };
  /** Sprite pixels per world pixel (2 = high-detail art). Defaults to 1. */
  scale?: number;
}

export type Pose = -1 | 0 | 1;

// All art is assembled on an integer pixel grid, then cached into three frames.
// Each recruit has its own silhouette/accessories; the canvas and collection share the same sprite.
export class Pixels {
  cells: string[][];
  palette: Record<string, string> = {};
  keys = new Map<string, string>();
  constructor(public width = 20, public height = 24) {
    this.cells = Array.from({ length: height }, () => Array<string>(width).fill("."));
  }
  key(color: string) {
    let key = this.keys.get(color);
    if (!key) {
      // Keys start at "A", so "." always stays transparent.
      key = String.fromCharCode(65 + this.keys.size);
      this.keys.set(color, key);
      this.palette[key] = color;
    }
    return key;
  }
  r(x: number, y: number, w: number, h: number, color: string) {
    const key = this.key(color);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < this.height && i >= 0 && i < this.width) this.cells[j][i] = key;
    return this;
  }
  /** Fills only cells that are still transparent (for effects drawn behind the body). */
  under(x: number, y: number, w: number, h: number, color: string) {
    const key = this.key(color);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < this.height && i >= 0 && i < this.width && this.cells[j][i] === ".") this.cells[j][i] = key;
    return this;
  }
  filled(x: number, y: number) {
    return y >= 0 && y < this.height && x >= 0 && x < this.width && this.cells[y][x] !== ".";
  }
  /** Grows the canvas by `pad` on every side and traces a glowing outline around the silhouette. */
  aura(inner: string, outer?: string, pad = 2) {
    const w = this.width + pad * 2, h = this.height + pad * 2;
    this.cells = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => this.cells[y - pad]?.[x - pad] ?? "."));
    this.width = w; this.height = h;
    const ring = (test: (x: number, y: number) => boolean) => {
      const out: [number, number][] = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (this.cells[y][x] === "." && test(x, y)) out.push([x, y]);
      return out;
    };
    const solid = new Set<string>();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (this.cells[y][x] !== ".") solid.add(`${x},${y}`);
    const near = (set: Set<string>, x: number, y: number, diag: boolean) =>
      set.has(`${x - 1},${y}`) || set.has(`${x + 1},${y}`) || set.has(`${x},${y - 1}`) || set.has(`${x},${y + 1}`) ||
      (diag && (set.has(`${x - 1},${y - 1}`) || set.has(`${x + 1},${y - 1}`) || set.has(`${x - 1},${y + 1}`) || set.has(`${x + 1},${y + 1}`)));
    const first = ring((x, y) => near(solid, x, y, false));
    const innerKey = this.key(inner);
    for (const [x, y] of first) this.cells[y][x] = innerKey;
    if (outer) {
      const firstSet = new Set(first.map(([x, y]) => `${x},${y}`));
      const outerKey = this.key(outer);
      for (const [x, y] of ring((x, y) => near(firstSet, x, y, true))) if ((x + y) % 2 === 0) this.cells[y][x] = outerKey;
    }
    return pad;
  }
  finish(hatX = 2, hatY = 1): RunnerSprite {
    return { width: this.width, height: this.height, rows: this.cells.map(row => row.join("")), palette: this.palette, goldHat: { x: hatX, y: hatY } };
  }
}

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("")}`;
}

export const ink = "#182035", skin = "#f4c69c", skinShade = "#cb8e69", cream = "#fff4dc", white = "#f7f8fb", silver = "#bfcddd", gold = "#edc05e";

export function feet(p: Pixels, pose: Pose, x: number, y: number, trousers: string, shoes: string, gap = 5, height = 5) {
  const move = pose === -1 ? 0 : pose === 0 ? -1 : 1;
  p.r(x + move, y, 4, height, ink).r(x + move + 1, y, 2, height - 1, trousers).r(x + move - 1, y + height - 1, 5, 2, shoes);
  p.r(x + gap - move, y, 4, height, ink).r(x + gap - move + 1, y, 2, height - 1, trousers).r(x + gap - move, y + height - 1, 5, 2, shoes);
}

export function human(pose: Pose, hair: string, shirt: string, trousers: string, shoes = ink, face = skin) {
  const p = new Pixels();
  const swing = pose === -1 ? 0 : pose === 0 ? -1 : 1;
  feet(p, pose, 6, 18, trousers, shoes);
  p.r(4, 11 + swing, 3, 6, ink).r(5, 12 + swing, 2, 3, shirt).r(4, 16 + swing, 3, 2, face);
  p.r(13, 11 - swing, 3, 6, ink).r(13, 12 - swing, 2, 3, shirt).r(13, 16 - swing, 3, 2, face);
  p.r(6, 10, 8, 9, ink).r(7, 11, 6, 7, shirt);
  p.r(8, 9, 4, 2, face);
  p.r(5, 3, 10, 7, ink).r(6, 4, 8, 6, face).r(7, 10, 6, 1, skinShade);
  p.r(4, 6, 2, 3, face).r(14, 6, 2, 3, face);
  p.r(7, 7, 1, 1, ink).r(12, 7, 1, 1, ink).r(9, 9, 2, 1, skinShade);
  p.r(5, 2, 10, 3, hair).r(4, 4, 2, 2, hair).r(14, 4, 2, 2, hair);
  return p;
}
