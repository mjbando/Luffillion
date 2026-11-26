import type { Metadata } from "next";
import Link from "next/link";
import "./ranked.css";

export const metadata: Metadata = {
  title: "Online Ranked · Coming Soon · Luffillion",
  description: "The Online Ranked Battle Arena is under construction and coming soon.",
};

export default function RankedPage() {
  return (
    <main className="ranked-shell">
      <div
        className="rk-page"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          textAlign: "center",
        }}
      >
        <p className="rk-eyebrow">ONLINE RANKED · UNDER CONSTRUCTION</p>
        <h1 className="mt-3 font-pixel-display text-5xl font-bold text-white sm:text-6xl">
          Coming Soon
        </h1>
        <p className="mt-4 max-w-md text-lg text-slate-300">
          The Ranked Battle Arena is being reworked. Check back soon for 10-second 1v1 niche-knowledge duels.
        </p>
        <span className="mt-6 inline-block rounded border border-amber-300/40 bg-amber-300/10 px-4 py-1.5 text-amber-200">
          Under Construction
        </span>
        <Link href="/" className="rk-link mt-8">
          ← Back to Daily Voyage
        </Link>
      </div>
    </main>
  );
}
