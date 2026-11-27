"use client";

import { useEffect, useState } from "react";
import { voyageRequest, localArchive, type LocalVoyage } from "@/lib/voyage-client";
import type { FinishedVoyage, VoyageHistory } from "@/lib/voyage";
import { archiveDays } from "@/lib/archive";
import { UPDATE_LIVE } from "@/lib/release";
import { playClick } from "@/lib/sound";

const dateLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

interface Row {
  day: string;
  score: number;
  solved: number;
  niche: number;
  beat: number | null;
  rank: number | null;
  luffillion: boolean;
  laughtale: boolean;
  /** Replayed later from the Archive (counts toward achievements, not leaderboards). */
  replay?: boolean;
  /** Never sailed: can be played from the Archive. */
  open?: boolean;
}

interface ArchiveList { days: string[]; replays: FinishedVoyage[] }
const emptyRow = (day: string): Row => ({ day, score: 0, solved: 0, niche: 0, beat: null, rank: null, luffillion: false, laughtale: false, open: true });

function fromCaptain(history: VoyageHistory): Row[] {
  return history.voyages.map(v => ({
    day: v.day,
    score: v.score,
    solved: v.solved,
    niche: v.niche ?? (v.legs ? v.legs.filter(l => l.tier === "rare" || l.tier === "epic" || l.tier === "luffillion").length : 0),
    beat: v.beat ?? null,
    rank: v.rank ?? null,
    luffillion: Array.isArray(v.legs) ? v.legs.some(l => l.tier === "luffillion") : false,
    laughtale: v.score >= 500,
  }));
}

function fromLocal(list: LocalVoyage[]): Row[] {
  return list.map(v => ({ day: v.day, score: v.score, solved: v.solved, niche: v.niche, beat: null, rank: null, luffillion: v.luffillion, laughtale: v.laughtale }));
}

export default function ArchivePanel({
  captain,
  refreshKey,
  onPlay,
  onSignIn,
  currentDay,
}: {
  captain: { id: string; username: string } | null;
  refreshKey: string;
  /** Treasure update: open a past day's voyage. */
  onPlay?: (day: string) => void;
  onSignIn?: () => void;
  /** The day currently loaded in the game. */
  currentDay?: string;
}) {
  const replayable = UPDATE_LIVE && Boolean(onPlay);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setRows([]);
    if (!captain) {
      const list = localArchive();
      const local = fromLocal(list);
      setRows(local);
      setLoading(false);
      return () => { live = false; };
    }
    const fetchAll = async () => {
      const captainId = captain.id;
      const accumulated: FinishedVoyage[] = [];
      let before: string | null = null;
      for (let page = 0; page < 20; page++) {
        const query: string = before ? `?before=${encodeURIComponent(before)}` : "";
        const d: VoyageHistory = await voyageRequest<VoyageHistory>(`/api/account/history${query}`);
        accumulated.push(...d.voyages);
        if (!d.nextBefore) break;
        before = d.nextBefore;
      }
      return accumulated;
    };
    const fetchArchive = (): Promise<ArchiveList | null> => replayable
      ? voyageRequest<ArchiveList>("/api/archive").catch(() => null)
      : Promise.resolve(null);
    Promise.all([fetchAll(), fetchArchive()])
      .then(([voyages, archive]) => {
        if (!live) return;
        const played = fromCaptain({ voyages, nextBefore: null, summary: { count: voyages.length, best: 0, average: 0 } });
        if (!archive) { setRows(played); return; }
        // Every replayable day shows up: sailed live, replayed later, or still open to play.
        const byDay = new Map(played.map(r => [r.day, r]));
        for (const r of fromCaptain({ voyages: archive.replays, nextBefore: null, summary: { count: 0, best: 0, average: 0 } })) {
          if (!byDay.has(r.day)) byDay.set(r.day, { ...r, beat: null, rank: null, replay: true });
        }
        for (const day of archive.days ?? archiveDays()) if (!byDay.has(day)) byDay.set(day, emptyRow(day));
        setRows([...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)));
      })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : "Couldn't load your archive."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captain?.id, refreshKey, retry]);

  const sailed = rows.filter(r => !r.open);
  const total = sailed.length;
  const best = total ? Math.max(...sailed.map(r => r.score)) : 0;
  const average = total ? Math.round(sailed.reduce((n, r) => n + r.score, 0) / total) : 0;
  const openDays = rows.filter(r => r.open).length;

  return (
    <div className="px-3 py-3">
      <div className="mb-2">
        <p className="text-base leading-tight tracking-[0.25em] text-cyan-200">ARCHIVE</p>
        <p className="text-sm text-slate-400">
          {captain
            ? replayable
              ? `Every voyage by ${captain.username}. Missed a day? Sail it now.`
              : `Every voyage by ${captain.username}. Each new day adds a row.`
            : "Every voyage played on this device. Each new day adds a row."}
        </p>
        {replayable && captain && <p className="mt-1 text-xs leading-snug text-slate-500">Archive voyages count toward achievements and bounty, never the daily leaderboard or Top 50 Scores.{openDays ? ` ${openDays} day${openDays === 1 ? "" : "s"} left to sail.` : ""}</p>}
        {UPDATE_LIVE && !captain && onSignIn && <p className="mt-1 text-sm text-slate-400"><button type="button" onClick={() => { playClick(); onSignIn(); }} className="text-amber-200 underline underline-offset-2">Sign in</button> to replay past voyages from the Archive.</p>}
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
        {[["VOYAGES", total], ["BEST", best], ["AVERAGE", average]].map(([l, v]) => (
          <div key={l} className="border border-white/10 bg-white/5 py-1">
            <p className="text-xs tracking-widest text-slate-400">{l}</p>
            <p className="text-lg text-white">{v}</p>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="border-l-2 border-rose-400 bg-rose-400/5 px-2 py-1 text-sm text-rose-200">
          {error}{" "}
          <button type="button" onClick={() => setRetry(n => n + 1)} className="underline">Retry</button>
        </p>
      ) : loading ? (
        <p className="animate-pulse py-6 text-center text-base text-cyan-200">Opening your archive…</p>
      ) : !rows.length ? (
        <p className="border border-dashed border-slate-600 px-3 py-4 text-center text-base text-slate-400">
          No voyages yet. Finish today&apos;s daily challenge and your archive starts.
        </p>
      ) : (
        <ol className="divide-y divide-white/5">
          {rows.map(r => r.open ? (
            <li key={r.day} className="flex items-center justify-between gap-2 py-2" data-archive-day={r.day}>
              <span className="min-w-0">
                <span className="block truncate text-base text-slate-300">{dateLabel(r.day)}</span>
                <span className="block text-xs text-slate-500">{currentDay === r.day ? "Sailing now" : "Not sailed yet"}</span>
              </span>
              <button type="button" disabled={currentDay === r.day} onClick={() => { playClick(); onPlay?.(r.day); }}
                className="px-btn h-8 shrink-0 bg-amber-400 px-3 text-sm tracking-wider text-amber-950 hover:bg-amber-300 disabled:bg-amber-300/20 disabled:text-amber-200">
                {currentDay === r.day ? "ON DECK" : "PLAY ▸"}
              </button>
            </li>
          ) : (
            <li key={r.day} className="flex items-center justify-between gap-2 py-2" data-archive-day={r.day}>
              <span className="min-w-0">
                <span className="block truncate text-base text-white">{dateLabel(r.day)}{r.replay && <span className="ml-1.5 border border-cyan-300/40 px-1 text-[11px] tracking-wider text-cyan-200">ARCHIVE</span>}</span>
                <span className="block text-xs text-slate-500">
                  {r.solved}/7 answered
                  {r.niche > 0 ? ` · ${r.niche} niche` : ""}
                  {r.rank ? ` · rank #${r.rank}` : ""}
                  {r.beat !== null ? ` · beat ${r.beat}%` : ""}
                  {r.laughtale ? " · Laugh Tale" : ""}
                  {r.luffillion ? " · Luffillion" : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {r.replay && onPlay && currentDay !== r.day && <button type="button" onClick={() => { playClick(); onPlay(r.day); }} className="text-sm text-slate-400 underline-offset-2 hover:text-amber-200 hover:underline">Recap</button>}
                <span className="text-xl text-cyan-300">{r.score}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
