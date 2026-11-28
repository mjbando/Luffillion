"use client";

import { useEffect, useRef, useState } from "react";
import "./treasure.css";
import BerryMark from "./BerryMark";
import { formatBerries } from "@/lib/achievements";
import { berriesLabel } from "@/lib/coins";
import { BOUNTY_MILESTONES, type MilestoneReport } from "@/lib/ranked-achievements";
import type { Captain } from "@/lib/voyage";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";

/** Bounty milestones: each bounty total pays berries (the chest currency) once. */
export default function MilestonesPanel({ captain, onSignIn, onBerries }: {
  captain: Captain | null;
  onSignIn: () => void;
  onBerries?: (berries: number) => void;
}) {
  const [report, setReport] = useState<MilestoneReport | null>(null);
  const [berries, setBerries] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [claiming, setClaiming] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  useEffect(() => {
    if (!captain) return;
    const ctrl = new AbortController();
    voyageRequest<{ milestones?: MilestoneReport; berries?: number }>("/api/account/achievements", "GET", undefined, ctrl.signal)
      .then(d => { if (!ctrl.signal.aborted) { setReport(d.milestones ?? null); setBerries(d.berries ?? 0); } })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Couldn't load your milestones."); });
    return () => ctrl.abort();
  }, [captain, retry]);

  async function claim(bounty: number) {
    if (claiming) return;
    playClick(); setClaiming(bounty); setError(""); setNotice("");
    try {
      const data = await voyageRequest<{ paid: number; berries: number; milestones: MilestoneReport }>("/api/account/achievements", "POST", { claim: "milestone", id: bounty });
      if (!live.current) return;
      setReport(data.milestones); setBerries(data.berries); onBerries?.(data.berries);
      setNotice(data.paid ? `+${berriesLabel(data.paid)} added. You have ${berriesLabel(data.berries)}.` : "Already claimed.");
    } catch (e) {
      if (live.current) setError(e instanceof Error ? e.message : "Couldn't claim this milestone.");
    } finally { if (live.current) setClaiming(null); }
  }

  const bounty = report?.bounty ?? 0;
  const rows = report?.milestones ?? BOUNTY_MILESTONES.map(m => ({ ...m, reached: false, claimed: false }));
  const next = rows.find(m => !m.reached);
  const ready = rows.filter(m => m.reached && !m.claimed).length;
  const totalBerries = BOUNTY_MILESTONES.reduce((n, m) => n + m.berries, 0);

  return <section className="p-4" aria-labelledby="milestones-title">
    <header className="flex items-center gap-3">
      <div className="grid h-14 w-14 shrink-0 place-items-center border border-amber-300/25 bg-amber-300/[.06]"><BerryMark size={34}/></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-[.25em] text-amber-300">BOUNTY MILESTONES</p>
        <h2 id="milestones-title" className="font-pixel-display text-xl text-white">Milestones</h2>
        <p className="text-base leading-tight text-slate-400">Raise your bounty to earn berries for Treasure Chests.</p>
      </div>
    </header>

    {!captain ? <div className="mt-4 border border-amber-300/30 bg-amber-300/[.07] p-4 text-center">
      <p className="text-base text-slate-200">Sign in to track your bounty and claim berries.</p>
      <button type="button" onClick={() => { playClick(); onSignIn(); }} className="px-btn mt-3 h-9 bg-amber-400 px-5 text-base text-amber-950 hover:bg-amber-300">SIGN IN / CREATE ACCOUNT ▸</button>
    </div> : <div className="mt-3 grid grid-cols-2 gap-2">
      <p className="ms-stat"><span>YOUR BOUNTY</span><b className="text-amber-100">{report ? formatBerries(bounty) : "…"}</b></p>
      <p className="ms-stat"><span>YOUR BERRIES</span><b className="flex items-center justify-end gap-1 text-amber-200"><BerryMark size={16}/>{berries === null ? "…" : berries.toLocaleString()}</b></p>
    </div>}

    {captain && report && <p className="mt-2 text-sm leading-snug text-cyan-200/80">
      {next ? `${formatBerries(next.bounty - bounty)} to your next milestone (${formatBerries(next.bounty)}).` : "Every milestone reached. The Marines fear you."}
      {ready > 0 && <span className="text-amber-200"> {ready} reward{ready === 1 ? "" : "s"} ready to claim.</span>}
    </p>}
    {error && <p role="alert" className="mt-2 border-l-2 border-rose-400 px-2 py-1 text-base text-rose-200">{error} <button type="button" onClick={() => { playClick(); setRetry(n => n + 1); }} className="underline">Retry</button></p>}
    {notice && <p role="status" className="mt-2 border-l-2 border-emerald-400 px-2 py-1 text-base text-emerald-200">{notice}</p>}

    <ol className="ms-track mt-3" aria-label="Bounty milestones">
      {rows.map((m, i) => {
        const prev = i ? rows[i - 1].bounty : 0;
        const pct = m.reached ? 100 : Math.max(0, Math.min(100, ((bounty - prev) / (m.bounty - prev)) * 100));
        const state = m.claimed ? "is-claimed" : m.reached ? "is-ready" : "is-locked";
        return <li key={m.bounty} className={`ms-row ${state}`} data-milestone={m.bounty}>
          <span className="ms-node" aria-hidden="true">{m.claimed ? "✓" : m.reached ? "!" : ""}</span>
          <span className="ms-line" aria-hidden="true"><i style={{ height: `${captain ? pct : 0}%` }}/></span>
          <div className="min-w-0 flex-1">
            <p className="ms-bounty">{formatBerries(m.bounty)} <small>bounty</small></p>
            <p className="ms-reward"><BerryMark size={13}/> {berriesLabel(m.berries)}</p>
          </div>
          {captain && (m.claimed ? <span className="ms-status text-emerald-300">CLAIMED</span>
            : m.reached ? <button type="button" disabled={claiming !== null} onClick={() => claim(m.bounty)} className="px-btn h-9 shrink-0 bg-amber-400 px-3 text-base tracking-wider text-amber-950 hover:bg-amber-300 disabled:opacity-60">{claiming === m.bounty ? "…" : "CLAIM ▸"}</button>
            : <span className="ms-status text-slate-500">LOCKED</span>)}
        </li>;
      })}
    </ol>
    <p className="mt-3 text-sm leading-snug text-slate-400">Bounty comes only from ranked wins (bot battles count): +฿10,000 a win, +฿5,000 if you keep every life, and ฿50,000 or ฿100,000 for beating a captain one or two ranks above you. All {BOUNTY_MILESTONES.length} milestones pay {berriesLabel(totalBerries)} in total. Each one can be claimed once.</p>
  </section>;
}
