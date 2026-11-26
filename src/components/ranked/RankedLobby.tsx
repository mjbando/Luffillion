"use client";

import Link from "next/link";
import { ArrowLeft, Compass, Flame, Search, Shield, Swords, Trophy, Users, Volume2, VolumeX, X } from "lucide-react";
import CharacterPortrait from "../CharacterPortrait";
import { RANK_TIERS, rankTierFor } from "@/lib/ranked";
import type { RankedLobbyResponse, RankedMatchView } from "@/lib/ranked-types";
import { playClick } from "@/lib/sound";

function RankBadge({ points }: { points: number }) {
  const tier = rankTierFor(points);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-bold tracking-wider ring-1 ${tier.badge}`}>
      {tier.name.toUpperCase()} · {points} RP
    </span>
  );
}

export default function RankedLobby({
  data,
  search,
  onSearch,
  busy,
  error,
  muted,
  onMute,
  onAccount,
  onQueue,
  onUnqueue,
  onChallenge,
  onAccept,
  onDecline,
  onCancel,
  onInspectMatch,
}: {
  data: RankedLobbyResponse;
  search: string;
  onSearch: (v: string) => void;
  busy: boolean;
  error: string;
  muted: boolean;
  onMute: () => void;
  onAccount: () => void;
  onQueue: () => void;
  onUnqueue: () => void;
  onChallenge: (target: { targetId?: string; targetUsername?: string }) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  onInspectMatch: (m: RankedMatchView) => void;
}) {
  const { captain, profile, inQueue, onlineCount, onlinePlayers, challenges, leaderboard, recentMatches, serverNow } = data;
  const tier = rankTierFor(profile?.rankPoints ?? 0);
  const pctToNext = tier.nextMin && profile
    ? Math.min(100, Math.round(((profile.rankPoints - tier.min) / (tier.nextMin - tier.min)) * 100))
    : 100;

  return (
    <main className="ranked-shell">
      <header className="rk-topbar">
        <div className="flex items-center gap-4">
          <Link href="/" onClick={playClick} className="rk-link">
            <ArrowLeft size={16} /> Daily voyage
          </Link>
          <Link href="/adventure" onClick={playClick} className="rk-link hidden sm:flex">
            <Compass size={16} /> Adventure
          </Link>
        </div>
        <div className="rk-brand">
          <Swords size={20} />
          <span>
            LUFFILLION <small>ONLINE RANKED</small>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMute}
            aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
            className="rk-icon-btn"
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button type="button" onClick={onAccount} className="rk-account">
            {captain ? captain.username : "Sign in / Create account"}
          </button>
        </div>
      </header>

      <div className="rk-page">
        <section className="rk-hero">
          <p className="rk-eyebrow">10-SECOND NICHE KNOWLEDGE DUELS · BEST OF 3 · 3 LIVES</p>
          <h1>Ranked Battle Arena</h1>
          <p>
            Search for an online pirate or enter matchmaking. Best of 3 — a wrong answer costs a life, and the lower total scores a life lost.
          </p>
        </section>

        {error && (
          <p role="alert" className="rk-error">
            {error}
          </p>
        )}

        {/* Incoming / Outgoing Challenges */}
        {challenges.length > 0 && (
          <section className="rk-challenges" aria-label="Active challenges">
            {challenges.map((ch) => {
              const sec = Math.max(0, Math.ceil((ch.expiresAt - serverNow) / 1000));
              return (
                <div key={ch.id} className={`rk-challenge-card ${ch.direction === "incoming" ? "is-incoming" : ""}`}>
                  <CharacterPortrait characterId={ch.opponent.characterId} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="rk-eyebrow">
                      {ch.direction === "incoming" ? "INCOMING RANKED CHALLENGE" : "CHALLENGE SENT"} · {sec}S
                    </p>
                    <p className="rk-challenge-title">
                      <strong>{ch.opponent.username}</strong> · {ch.opponent.title} ·{" "}
                      <span style={{ color: rankTierFor(ch.opponent.rankPoints).color }}>
                        {ch.opponent.rankName} ({ch.opponent.rankPoints} RP)
                      </span>{" "}
                      · {ch.opponent.bounty.toLocaleString()} berries
                    </p>
                  </div>
                  {ch.direction === "incoming" ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => onAccept(ch.id)} className="rk-btn-gold">
                        ACCEPT ▸
                      </button>
                      <button type="button" disabled={busy} onClick={() => onDecline(ch.id)} className="rk-btn-muted">
                        DECLINE
                      </button>
                    </div>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => onCancel(ch.id)} className="rk-btn-muted">
                      CANCEL
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <div className="rk-grid">
          {/* Left column: Player Stats & Rank Guide */}
          <aside className="space-y-4">
            <div className="rk-card px-scan" style={{ borderTopColor: tier.color }}>
              {captain && profile ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="rk-portrait-box">
                      <CharacterPortrait characterId={profile.characterId} size={74} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="rk-eyebrow">CAPTAIN CARD</p>
                      <h2 className="rk-username">{profile.username}</h2>
                      <p className="text-base text-amber-200">{profile.title}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rk-stat-box">
                      <span className="rk-stat-label">BOUNTY</span>
                      <span className="rk-stat-val text-amber-300">{profile.bounty.toLocaleString()}</span>
                    </div>
                    <div className="rk-stat-box">
                      <span className="rk-stat-label">RANK</span>
                      <span className="rk-stat-val" style={{ color: tier.color }}>
                        {profile.rankName}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-base">
                      <span style={{ color: tier.color }}>{profile.rankPoints} RP</span>
                      <span className="text-sm text-slate-400">
                        {tier.nextMin ? `${tier.nextMin - profile.rankPoints} to ${rankTierFor(tier.nextMin).name}` : "Max Tier"}
                      </span>
                    </div>
                    <div className="mt-1 h-2 bg-slate-800">
                      <div className="h-full transition-[width]" style={{ width: `${pctToNext}%`, backgroundColor: tier.color }} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1 text-center text-sm">
                    <div className="bg-white/5 py-1">
                      <span className="block text-xs text-slate-500">W</span>
                      <span className="text-emerald-300">{profile.wins}</span>
                    </div>
                    <div className="bg-white/5 py-1">
                      <span className="block text-xs text-slate-500">L</span>
                      <span className="text-rose-300">{profile.losses}</span>
                    </div>
                    <div className="bg-white/5 py-1">
                      <span className="block text-xs text-slate-500">D</span>
                      <span className="text-slate-300">{profile.draws}</span>
                    </div>
                    <div className="bg-white/5 py-1">
                      <span className="block text-xs text-slate-500">STREAK</span>
                      <span className="text-amber-300">
                        <Flame size={12} className="inline" /> {profile.winStreak}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-3 text-center">
                  <Shield size={36} className="mx-auto text-amber-300" />
                  <h2 className="mt-2 font-pixel-display text-xl text-white">Sign in to Battle</h2>
                  <p className="mt-1 text-base text-slate-400">
                    Load your username, title, bounty, and rank into online 1v1 matches.
                  </p>
                  <button type="button" onClick={onAccount} className="rk-btn-gold mt-3 w-full">
                    SIGN IN / CREATE ACCOUNT ▸
                  </button>
                </div>
              )}
            </div>

            <div className="rk-card px-scan">
              <p className="rk-eyebrow">RANKED TIERS &amp; SCORING</p>
              <ul className="mt-2 space-y-1 text-base">
                {RANK_TIERS.map((t) => (
                  <li key={t.id} className="flex items-center justify-between border-b border-white/5 py-1">
                    <span style={{ color: t.color }}>{t.name}</span>
                    <span className="text-slate-400">{t.min}+ RP</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 text-sm text-slate-400">
                <p>• Best of 3: a wrong answer costs a life; lower total points costs a life</p>
                <p>• Win: +30 RP (more vs higher ranks, less vs lower)</p>
                <p>• Loss: -15 RP (bigger drop vs lower ranks, 0 floor)</p>
                <p>• Draw: +10 RP for both players</p>
                <p>• Win streaks: +10 (3 wins), +20 (5 wins), +50 (10 wins)</p>
              </div>
            </div>
          </aside>

          {/* Center column: Search & Matchmaking */}
          <section className="space-y-4">
            <div className="rk-card px-scan">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="rk-eyebrow">QUICK MATCHMAKING</p>
                  <h2 className="font-pixel-display text-2xl text-white">
                    {inQueue ? "Searching for an opponent…" : "Find a Ranked Opponent"}
                  </h2>
                  <p className="text-base text-slate-400">
                    <Users size={14} className="mr-1 inline" /> {onlineCount} captain{onlineCount === 1 ? "" : "s"} online in Ranked right now
                  </p>
                </div>
                {captain ? (
                  inQueue ? (
                    <button type="button" disabled={busy} onClick={onUnqueue} className="rk-btn-muted h-11 px-5">
                      <X size={16} className="mr-1 inline" /> CANCEL SEARCH
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={onQueue} className="rk-btn-gold h-11 px-6">
                      <Swords size={16} className="mr-1.5 inline" /> FIND MATCH ▸
                    </button>
                  )
                ) : (
                  <button type="button" onClick={onAccount} className="rk-btn-gold h-11 px-5">
                    SIGN IN TO QUEUE ▸
                  </button>
                )}
              </div>
              {inQueue && (
                <div className="mt-3 flex items-center gap-2 border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-base text-amber-200">
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-amber-300" />
                  Searching for another online pirate near your rank…
                </div>
              )}
            </div>

            <div className="rk-card px-scan">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="rk-eyebrow">DIRECT CHALLENGE</p>
                  <h2 className="font-pixel-display text-xl text-white">Search Online Players</h2>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (search.trim() && captain) onChallenge({ targetUsername: search.trim() });
                }}
                className="mt-3 flex gap-2"
              >
                <div className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Search online username…"
                    aria-label="Search online players"
                    className="h-10 w-full border border-[#3c5472] bg-[#091325] pl-9 pr-3 text-lg text-white placeholder:text-slate-500 outline-none focus:border-cyan-300"
                  />
                </div>
                {captain && search.trim() && (
                  <button type="submit" disabled={busy} className="rk-btn-cyan h-10 px-4">
                    CHALLENGE ▸
                  </button>
                )}
              </form>

              <div className="mt-3 space-y-2">
                {onlinePlayers.length === 0 ? (
                  <p className="border border-dashed border-white/15 py-5 text-center text-base text-slate-400">
                    {search.trim()
                      ? `No online players matching "${search.trim()}".`
                      : "No other captains are in Ranked right now. Stay in queue or invite a friend to open /ranked!"}
                  </p>
                ) : (
                  onlinePlayers.map((p) => (
                    <div key={p.accountId} className="flex flex-wrap items-center gap-3 border border-white/10 bg-white/[.03] px-3 py-2">
                      <CharacterPortrait characterId={p.characterId} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-pixel-display text-lg text-white">{p.username}</span>
                          <RankBadge points={p.rankPoints} />
                        </div>
                        <p className="text-sm text-slate-400">
                          {p.title} · {p.bounty.toLocaleString()} berries
                          {p.winStreak >= 3 ? ` · 🔥 ${p.winStreak} streak` : ""}
                        </p>
                      </div>
                      {p.inMatch ? (
                        <span className="text-sm text-rose-300">In Battle</span>
                      ) : captain ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onChallenge({ targetId: p.accountId })}
                          className="rk-btn-cyan h-9 px-3 text-base"
                        >
                          CHALLENGE ▸
                        </button>
                      ) : (
                        <button type="button" onClick={onAccount} className="rk-btn-muted h-9 px-3 text-sm">
                          Sign in
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {recentMatches.length > 0 && (
              <div className="rk-card px-scan">
                <p className="rk-eyebrow">RECENT DUELS</p>
                <div className="mt-2 space-y-2">
                  {recentMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        onInspectMatch(m);
                      }}
                      className="flex w-full items-center justify-between gap-3 border border-white/10 bg-white/[.03] px-3 py-2 text-left hover:bg-white/[.07]"
                    >
                      <span className="min-w-0 truncate text-base">
                        <span
                          className={
                            m.result?.outcome === "win"
                              ? "text-emerald-300"
                              : m.result?.outcome === "loss"
                                ? "text-rose-300"
                                : "text-amber-200"
                          }
                        >
                          {m.result?.outcome.toUpperCase()}
                        </span>{" "}
                        vs <strong className="font-normal text-white">{m.opponent.username}</strong> ({m.opponent.rankName})
                      </span>
                      <span className="shrink-0 text-base text-cyan-200">
                        {m.result ? `${m.result.you.delta >= 0 ? "+" : ""}${m.result.you.delta} RP` : ""} ▸
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right column: Ranked Leaderboard */}
          <aside className="rk-card px-scan">
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-amber-300" />
              <div>
                <p className="rk-eyebrow">TOP 50 CAPTAINS</p>
                <h2 className="font-pixel-display text-xl text-white">Ranked Leaderboard</h2>
              </div>
            </div>
            {leaderboard.length === 0 ? (
              <p className="border border-dashed border-white/15 py-5 text-center text-base text-slate-400">
                No ranked captains yet. Play the first match!
              </p>
            ) : (
              <ol className="max-h-[540px] space-y-1.5 overflow-y-auto pr-1">
                {leaderboard.map((entry) => (
                  <li
                    key={entry.accountId}
                    className={`flex items-center gap-2 border px-2.5 py-1.5 ${
                      entry.isYou ? "border-amber-300/60 bg-amber-300/10" : "border-white/5 bg-white/[.03]"
                    }`}
                  >
                    <span className="w-7 text-right font-pixel-display text-base text-slate-400">#{entry.rank}</span>
                    <CharacterPortrait characterId={entry.characterId} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-white">
                        {entry.username} {entry.isYou && <span className="text-xs text-amber-300">YOU</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {entry.title} · {entry.bounty.toLocaleString()} berries
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold" style={{ color: rankTierFor(entry.rankPoints).color }}>
                        {entry.rankPoints} RP
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.wins}W-{entry.losses}L
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
