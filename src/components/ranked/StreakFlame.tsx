import type { CSSProperties } from "react";

// A flickering pixel flame with the win-streak count inside it.
// Three hand-generated frames sit side by side in one SVG strip; CSS slides the strip one
// frame at a time (a cheap transform), and two embers drift up. Colour heats up with the streak:
// orange (2–4), crimson-gold blaze (5–9), blue inferno (10+).

const W = 12, H = 15;
type Frame = { x: number; y: number; w: number; layer: number }[];

/** Builds one flame frame: a round base with a tongue that sways, layered by depth from the edge. */
function frame(sway: number, lick: number): Frame {
  // A tongue of fire from a base row up to a tip, narrowing as it rises.
  const tongue = (px: number, py: number, tipX: number, tipY: number, baseX: number, baseY: number, half: number) => {
    if (py < tipY || py > baseY) return false;
    const t = (py - tipY) / (baseY - tipY);
    const c = baseX + (tipX - baseX) * (1 - t) * (1 - t);
    return Math.abs(px - c) <= half * Math.pow(t, 1.15);
  };
  const inside = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const px = x + 0.5, py = y + 0.5;
    if ((px - 6) ** 2 + ((py - 10.4) * 1.08) ** 2 <= 4.7 ** 2) return true; // base
    if (tongue(px, py, 6 + sway * 2, 0.4, 6, 10.4, 4.4)) return true; // centre flame
    if (tongue(px, py, 1.4 - sway, 2.8 + (lick === 1 ? -1 : 0), 3.6, 10.4, 2.8)) return true; // left tongue
    if (tongue(px, py, 10.6 - sway, 3.6 + (lick === 2 ? -1 : 0), 8.4, 10.4, 2.8)) return true; // right tongue
    return false;
  };
  const depth = (x: number, y: number) => {
    let d = 0;
    while (d < 4 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => inside(x + dx * (d + 1), y + dy * (d + 1)))) d++;
    return d;
  };
  const out: Frame = [];
  for (let y = 0; y < H; y++) {
    let run: { x: number; y: number; w: number; layer: number } | null = null;
    for (let x = 0; x <= W; x++) {
      // Red edges and tips, orange then yellow inside, a white-hot core low in the base.
      const d = x < W && inside(x, y) ? depth(x, y) : -1;
      const layer = d < 0 ? -1 : Math.min(4, 1 + d + (y > 9 && d > 0 ? 1 : 0));
      if (run && run.layer === layer) { run.w++; continue; }
      if (run && run.layer >= 0) out.push(run);
      run = { x, y, w: 1, layer };
    }
  }
  return out;
}

const FRAMES = [frame(0, 0), frame(1, 1), frame(-1, 2)];

export default function StreakFlame({ streak, size = 22, className = "" }: { streak: number; size?: number; className?: string }) {
  const heat = streak >= 10 ? "inferno" : streak >= 5 ? "blaze" : "hot";
  const width = Math.round((size * W) / H);
  return (
    <span className={`streak-flame is-${heat} ${className}`} style={{ "--sf-w": `${width}px`, "--sf-h": `${size}px` } as CSSProperties}
      title={`${streak}-win streak`} aria-label={`${streak}-win streak`} role="img">
      <span className="sf-window" aria-hidden>
        <svg className="sf-strip" viewBox={`0 0 ${W * 3} ${H}`} width={width * 3} height={size} shapeRendering="crispEdges">
          {FRAMES.map((f, i) => (
            <g key={i} transform={`translate(${i * W} 0)`}>
              {f.map((r) => <rect key={`${r.x}:${r.y}`} x={r.x} y={r.y} width={r.w} height={1} className={`sf-l${r.layer}`} />)}
            </g>
          ))}
        </svg>
      </span>
      <i className="sf-ember" aria-hidden />
      <i className="sf-ember is-b" aria-hidden />
      <b className="sf-num font-pixel" aria-hidden>{streak}</b>
    </span>
  );
}
