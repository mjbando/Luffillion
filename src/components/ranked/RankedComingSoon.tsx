import Link from "next/link";

/** Pixel crossed cutlasses, drawn on a 16×16 grid. */
const SWORDS = [
  "x..............y",
  ".x............y.",
  "..x..........y..",
  "...x........y...",
  "....x......y....",
  ".....x....y.....",
  "......x..y......",
  ".......xy.......",
  ".......yx.......",
  "......y..x......",
  "..g..y....x..g..",
  "...gy......xg...",
  "...hg......gh...",
  "..h..g....g..h..",
  ".h............h.",
  "h..............h",
];
const COLORS: Record<string, string> = { x: "#e8eef7", y: "#b9c7d8", g: "#f6c45a", h: "#8a5a2b" };

function PixelSwords() {
  return <svg viewBox="0 0 16 16" width="112" height="112" shapeRendering="crispEdges" aria-hidden="true" className="rk-soon-swords">
    {SWORDS.flatMap((row, y) => [...row].map((p, x) => COLORS[p] ? <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={COLORS[p]} /> : null))}
  </svg>;
}

export default function RankedComingSoon() {
  return <main className="ranked-shell rk-soon">
    <header className="rk-topbar">
      <Link href="/" className="rk-link">◂ Back to the Daily Voyage</Link>
      <span className="rk-brand">⚔ <span>ONLINE RANKED<small>1V1 TRIVIA DUELS</small></span></span>
    </header>
    <section className="rk-soon-card px-box px-scan" aria-labelledby="rk-soon-title">
      <PixelSwords />
      <p className="rk-eyebrow">THE ARENA IS BEING BUILT</p>
      <h1 id="rk-soon-title" className="rk-soon-title">COMING SOON</h1>
      <p className="rk-soon-copy">Online Ranked is getting ready to set sail. Ten-second 1v1 duels, Bronze to Legend ranks, and friendly battles with your crew are almost here.</p>
      <div className="rk-soon-dots" aria-hidden="true"><span /><span /><span /></div>
      <Link href="/" className="px-btn rk-soon-cta">⚓ PLAY TODAY&apos;S VOYAGE ▸</Link>
      <Link href="/adventure" className="rk-link rk-soon-alt">Or keep sailing in Adventure Mode ▸</Link>
    </section>
  </main>;
}
