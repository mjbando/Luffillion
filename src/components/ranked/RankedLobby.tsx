"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Flame, Search, Shield, Swords, Trophy, Users, Volume2, VolumeX, X } from "lucide-react";
import CharacterPortrait from "../CharacterPortrait";
import PixelEmblem from "../pixel-emblems";
import RankedUsername from "./RankedUsername";
import { characterById } from "@/data/playable-characters";
import { RANK_TIERS, rankTierFor } from "@/lib/ranked";
import type { RankedLobbyResponse, RankedMatchView, RankedPublicProfile } from "@/lib/ranked-types";
import { voyageRequest } from "@/lib/voyage-client";
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
  onInviteFriend,
  onAcceptInvite,
  onDeclineInvite,
  onCancelInvite,
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
  onInviteFriend: (target: { targetId?: string; targetUsername?: string }) => void;
  onAcceptInvite: (id: string) => void;
  onDeclineInvite: (id: string) => void;
  onCancelInvite: (id: string) => void;
  onInspectMatch: (m: RankedMatchView) => void;
}) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<RankedPublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const profileRequest = useRef(0);
  const profileTrigger = useRef<HTMLButtonElement | null>(null);
  const profileCloseButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (selectedProfileId) profileCloseButton.current?.focus();
  }, [selectedProfileId]);
  const { captain, profile, inQueue, onlineCount, onlinePlayers, friendlyInvites, leaderboard, recentMatches, serverNow } = data;
  const tier = rankTierFor(profile?.rankPoints ?? 0);
  const pctToNext = tier.nextMin && profile
    ? Math.min(100, Math.round(((profile.rankPoints - tier.min) / (tier.nextMin - tier.min)) * 100))
    : 100;

  async function openProfile(accountId: string, trigger: HTMLButtonElement) {
    const requestId = ++profileRequest.current;
    profileTrigger.current = trigger;
    setSelectedProfileId(accountId);
    setViewedProfile(null);
    setProfileError("");
    setProfileLoading(true);
    try {
      const result = await voyageRequest<RankedPublicProfile>(
        `/api/ranked/profile?accountId=${encodeURIComponent(accountId)}`,
      );
      if (profileRequest.current === requestId) setViewedProfile(result);
    } catch (error) {
      if (profileRequest.current === requestId) {
        setProfileError(error instanceof Error ? error.message : "Could not load this player card.");
      }
    } finally {
      if (profileRequest.current === requestId) setProfileLoading(false);
    }
  }

  function closeProfile() {
    profileRequest.current++;
    setSelectedProfileId(null);
    setViewedProfile(null);
    setProfileError("");
    setProfileLoading(false);
    profileTrigger.current?.focus();
  }

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
            {captain ? <RankedUsername username={captain.username} /> : "Sign in / Create account"}
          </button>
        </div>
      </header>

      <div className="rk-page">
        <section className="rk-hero">
          <p className="rk-eyebrow">10-SECOND KNOWLEDGE DUELS · 3 LIVES</p>
          <h1>Ranked Battle Arena</h1>
          <p>
            Ranked battles use matchmaking only. Invite an online friend for a friendly match that never changes rank points.
          </p>
        </section>

        {error && (
          <p role="alert" className="rk-error">
            {error}
          </p>
        )}

        {friendlyInvites.length > 0 && (
          <section className="rk-challenges" aria-label="Friendly battle invitations">
            {friendlyInvites.map((ch) => {
              const sec = Math.max(0, Math.ceil((ch.expiresAt - serverNow) / 1000));
              return (
                <div key={ch.id} className={`rk-challenge-card ${ch.direction === "incoming" ? "is-incoming" : ""}`}>
                  <CharacterPortrait characterId={ch.opponent.characterId} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="rk-eyebrow">
                      {ch.direction === "incoming" ? "FRIENDLY BATTLE INVITE" : "INVITE SENT"} · {sec}S
                    </p>
                    <p className="rk-challenge-title">
                      <strong><RankedUsername username={ch.opponent.username} /></strong> · {ch.opponent.title} ·{" "}
                      <span style={{ color: rankTierFor(ch.opponent.rankPoints).color }}>
                        {ch.opponent.rankName} ({ch.opponent.rankPoints} RP)
                      </span>{" "}
                      · {ch.opponent.bounty.toLocaleString()} berries
                    </p>
                  </div>
                  {ch.direction === "incoming" ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => onAcceptInvite(ch.id)} className="rk-btn-gold">
                        ACCEPT ▸
                      </button>
                      <button type="button" disabled={busy} onClick={() => onDeclineInvite(ch.id)} className="rk-btn-muted">
                        DECLINE
                      </button>
                    </div>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => onCancelInvite(ch.id)} className="rk-btn-muted">
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
                      <h2 className="rk-username"><RankedUsername username={profile.username} /></h2>
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
                  <p className="rk-eyebrow">FRIENDLY BATTLE</p>
                  <h2 className="font-pixel-display text-xl text-white">Invite an Online Friend</h2>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (search.trim() && captain) onInviteFriend({ targetUsername: search.trim() });
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
                    INVITE ▸
                  </button>
                )}
              </form>

              <div className="mt-3 space-y-2">
                {onlinePlayers.length === 0 ? (
                  <p className="border border-dashed border-white/15 py-5 text-center text-base text-slate-400">
                    {search.trim()
                      ? `No online players matching "${search.trim()}".`
                      : "No other captains are online right now."}
                  </p>
                ) : (
                  onlinePlayers.map((p) => (
                    <div key={p.accountId} className="flex flex-wrap items-center gap-3 border border-white/10 bg-white/[.03] px-3 py-2">
                      <CharacterPortrait characterId={p.characterId} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <RankedUsername username={p.username} className="font-pixel-display text-lg text-white" />
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
                          onClick={() => onInviteFriend({ targetId: p.accountId })}
                          className="rk-btn-cyan h-9 px-3 text-base"
                        >
                          INVITE ▸
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
                        vs <strong className="font-normal text-white"><RankedUsername username={m.opponent.username} /></strong> ({m.opponent.rankName})
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
                  <li key={entry.accountId}>
                    <button
                      type="button"
                      onClick={(event) => void openProfile(entry.accountId, event.currentTarget)}
                      aria-label={`View ${entry.username}'s player card`}
                      className={`flex w-full items-center gap-2 border px-2.5 py-1.5 text-left hover:border-cyan-300/50 hover:bg-cyan-300/[.06] ${
                        entry.isYou ? "border-amber-300/60 bg-amber-300/10" : "border-white/5 bg-white/[.03]"
                      }`}
                    >
                      <span className="w-7 text-right font-pixel-display text-base text-slate-400">#{entry.rank}</span>
                      <CharacterPortrait characterId={entry.characterId} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base text-white">
                          <RankedUsername username={entry.username} /> {entry.isYou && <span className="text-xs text-amber-300">YOU</span>}
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
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
      {selectedProfileId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranked-profile-title"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeProfile();
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProfile();
          }}
        >
          <section className="w-full max-w-xl border border-[#536783] border-t-4 border-t-amber-300 bg-[#0b1628] p-4 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="rk-eyebrow">RANKED CAPTAIN</p>
                <h2 id="ranked-profile-title" className="font-pixel-display text-2xl text-white">PLAYER CARD</h2>
              </div>
              <button ref={profileCloseButton} type="button" className="rk-icon-btn" aria-label="Close player card" onClick={closeProfile}>
                <X size={18} />
              </button>
            </header>

            {profileLoading && <p role="status" className="py-10 text-center text-cyan-200">Loading player card…</p>}
            {profileError && <p role="alert" className="rk-error mt-4">{profileError}</p>}
            {viewedProfile && (() => {
              const character = characterById(viewedProfile.characterId);
              const rankColor = rankTierFor(viewedProfile.rankPoints).color;
              return (
                <div className="mt-4">
                  <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <CharacterPortrait characterId={viewedProfile.characterId} size={88} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-pixel-display text-2xl text-white"><RankedUsername username={viewedProfile.username} /></h3>
                      <p className="text-base text-amber-200">{viewedProfile.title}</p>
                      <p className="text-base" style={{ color: character.color }}>{character.name} · {character.epithet}</p>
                    </div>
                    <span className="shrink-0 text-right font-pixel-display text-2xl font-bold" style={{ color: rankColor }}>
                      #{leaderboard.find((entry) => entry.accountId === viewedProfile.accountId)?.rank ?? "—"}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["RANK", viewedProfile.rankName],
                      ["RANK POINTS", `${viewedProfile.rankPoints} RP`],
                      ["WINS", viewedProfile.wins],
                      ["LOSSES", viewedProfile.losses],
                      ["DRAWS", viewedProfile.draws],
                      ["WIN STREAK", viewedProfile.winStreak],
                      ["BEST STREAK", viewedProfile.bestStreak],
                      ["BOUNTY", `${viewedProfile.bounty.toLocaleString()} berries`],
                    ].map(([label, value]) => (
                      <div key={label} className="border border-white/10 bg-white/[.03] px-3 py-2">
                        <dt className="text-xs tracking-wider text-slate-400">{label}</dt>
                        <dd className="truncate font-pixel-display text-lg text-white" style={label === "RANK" ? { color: rankColor } : undefined}>
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <section className="mt-5" aria-labelledby="profile-achievements-title">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <h3 id="profile-achievements-title" className="font-pixel-display text-xl text-white">ACHIEVEMENTS</h3>
                      <span className="text-sm text-slate-400">{viewedProfile.achievements.length} earned</span>
                    </div>
                    {viewedProfile.achievements.length ? (
                      <ul className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                        {viewedProfile.achievements.map((achievement) => (
                          <li key={achievement.id} className="flex min-w-0 items-center gap-2 border border-amber-300/20 bg-amber-300/[.04] p-2">
                            <PixelEmblem kind={achievement.emblem} size={38} className="shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate font-pixel-display text-base text-amber-100">{achievement.title}</p>
                              <p className="text-sm leading-tight text-slate-400">{achievement.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="border border-dashed border-white/15 p-4 text-center text-slate-400">No achievements earned yet.</p>
                    )}
                  </section>
                </div>
              );
            })()}
          </section>
        </div>
      )}
    </main>
  );
}
