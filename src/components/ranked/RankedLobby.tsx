"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Flame, Search, Shield, Swords, Trophy, Volume2, VolumeX, X } from "lucide-react";
import CharacterPortrait from "../CharacterPortrait";
import PixelEmblem from "../pixel-emblems";
import RankedUsername from "./RankedUsername";
import { PLAYABLE_CHARACTERS, characterById, type CharacterId } from "@/data/playable-characters";
import { RANK_TIERS, RANKED_MAX_TIER_GAP, rankTierFor } from "@/lib/ranked";
import type { RankedLobbyResponse, RankedMatchView, RankedPublicProfile } from "@/lib/ranked-types";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick, playQueueHorn, playSonar } from "@/lib/sound";

function RankBadge({ points }: { points: number }) {
  const tier = rankTierFor(points);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-bold tracking-wider ring-1 ${tier.badge}`}>
      {tier.name.toUpperCase()} · {points} RP
    </span>
  );
}

/** Pixel shield in the tier's colour, lettered with the tier initial. */
function RankEmblem({ points, size = 48 }: { points: number; size?: number }) {
  const t = rankTierFor(points);
  return (
    <span
      className={`rk-emblem is-${t.id}`}
      style={{ "--tier": t.color, width: size, height: Math.round(size * 1.14), fontSize: Math.round(size * 0.5) } as CSSProperties}
      aria-label={`${t.name} rank`}
      role="img"
    >
      <span>{t.name[0]}</span>
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
  const [elapsed, setElapsed] = useState(0);
  const [spin, setSpin] = useState(0);
  const { captain, profile, inQueue, onlineCount, onlinePlayers, friendlyInvites, leaderboard, recentMatches, serverNow } = data;
  const tier = rankTierFor(profile?.rankPoints ?? 0);
  const pctToNext = tier.nextMin && profile
    ? Math.min(100, Math.round(((profile.rankPoints - tier.min) / (tier.nextMin - tier.min)) * 100))
    : 100;

  // Searching: run the clock, spin the mystery challenger, ping the sonar.
  useEffect(() => {
    if (!inQueue) return;
    const started = performance.now();
    const frame = requestAnimationFrame(() => setElapsed(0));
    const tick = setInterval(() => {
      setElapsed(Math.floor((performance.now() - started) / 1000));
      setSpin((n) => n + 1);
    }, 160);
    playSonar();
    const sonar = setInterval(playSonar, 2400);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
      clearInterval(sonar);
    };
  }, [inQueue]);

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

  const form = recentMatches.slice(0, 5).map((m) => m.result?.outcome ?? "draw");
  const tierIndex = RANK_TIERS.findIndex((t) => t.id === tier.id);
  const roulette = [...new Set<CharacterId>([
    ...onlinePlayers.map((p) => p.characterId),
    ...leaderboard.map((e) => e.characterId),
    ...PLAYABLE_CHARACTERS.map((c) => c.id),
  ])];
  const spinId = roulette[spin % roulette.length];
  const searchClock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const podium = leaderboard.slice(0, 3);
  const segments = 10;
  const litSegments = Math.round((pctToNext / 100) * segments);

  return (
    <main className="ranked-shell rk-lobby">
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
        {/* ---------- Harbor: your captain waits on the dock for a challenger ---------- */}
        <section className={`rk-port ${inQueue ? "is-searching" : ""}`} aria-label="Matchmaking">
          <div className="rk-port-scene" aria-hidden="true">
            <div className="rk-port-sky" />
            <div className="rk-stars" />
            <div className="rk-stars s2" />
            <div className="rk-moon" />
            <div className="rk-port-ship" />
            <div className="rk-sea" />
            <div className="rk-deck" />
            <div className="rk-lantern l1" />
            <div className="rk-lantern l2" />
            <div className="rk-fighter-slot is-left">
              <div className="rk-flip">
                <div className="rk-body pose-idle">
                  <CharacterPortrait characterId={profile?.characterId ?? "luffy"} size={150} dim={!captain} />
                </div>
                <div className="rk-shadow" />
              </div>
              {captain && profile && (
                <div className="rk-port-plate">
                  <RankedUsername username={profile.username} />
                  <small style={{ color: tier.color }}>{tier.name} · {profile.rankPoints} RP</small>
                </div>
              )}
            </div>
            <div className="rk-fighter-slot is-right">
              {inQueue ? (
                <>
                  <div className="rk-radar" />
                  <div className="rk-flip">
                    <div key={spinId} className="rk-body rk-silhouette">
                      <CharacterPortrait characterId={spinId} size={150} />
                    </div>
                    <div className="rk-shadow" />
                  </div>
                  <div className="rk-port-plate is-unknown">??? <small>SCANNING…</small></div>
                </>
              ) : (
                <div className="rk-wanted">
                  <small>WANTED</small>
                  <span>?</span>
                  <small>CHALLENGER</small>
                </div>
              )}
            </div>
          </div>

          <div className="rk-port-hud">
            <p className="rk-eyebrow">10-SECOND KNOWLEDGE DUELS · 3 LIVES · SHOWDOWNS</p>
            <h1 className="rk-port-title">Ranked Battle Arena</h1>
            <p className="rk-online">
              <span className="rk-live-dot" /> {onlineCount} captain{onlineCount === 1 ? "" : "s"} online
            </p>
            {captain ? (
              inQueue ? (
                <div className="rk-search" role="status">
                  <p className="rk-search-title">
                    SEARCHING THE SEAS<span className="rk-dots3"><i /><i /><i /></span>
                  </p>
                  <p className="rk-search-clock">{searchClock}</p>
                  <button type="button" disabled={busy} onClick={onUnqueue} className="rk-btn-muted h-10 px-5">
                    <X size={16} className="mr-1 inline" /> CANCEL SEARCH
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    playQueueHorn();
                    onQueue();
                  }}
                  className="rk-find-btn"
                >
                  <Swords size={22} /> FIND MATCH
                </button>
              )
            ) : (
              <button type="button" onClick={onAccount} className="rk-find-btn">
                <Shield size={20} /> SIGN IN TO BATTLE
              </button>
            )}
            <p className="rk-port-note">
              {inQueue
                ? `Looking for the closest-ranked captain (up to ${RANKED_MAX_TIER_GAP} ranks away).`
                : `Matchmaking pairs you with the closest-ranked captain, at most ${RANKED_MAX_TIER_GAP} ranks away.`}
            </p>
          </div>
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
                  <div className="rk-challenge-portrait">
                    <CharacterPortrait characterId={ch.opponent.characterId} size={56} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="rk-eyebrow">
                      {ch.direction === "incoming" ? "⚔ CHALLENGE! FRIENDLY BATTLE INVITE" : "INVITE SENT"} · {sec}S
                    </p>
                    <p className="rk-challenge-title">
                      <strong><RankedUsername username={ch.opponent.username} /></strong> · {ch.opponent.title} ·{" "}
                      <span style={{ color: rankTierFor(ch.opponent.rankPoints).color }}>
                        {ch.opponent.rankName} ({ch.opponent.rankPoints} RP)
                      </span>{" "}
                      · {ch.opponent.bounty.toLocaleString()} berries
                    </p>
                    <div className="rk-challenge-timer"><span style={{ width: `${Math.min(100, (sec / 60) * 100)}%` }} /></div>
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
          {/* ---------- Left: captain card + rank ladder ---------- */}
          <aside className="space-y-4">
            <div className="rk-card rk-captain px-scan" style={{ "--tier": tier.color } as CSSProperties}>
              {captain && profile ? (
                <>
                  <div className="flex items-center gap-3">
                    <RankEmblem points={profile.rankPoints} size={60} />
                    <div className="min-w-0 flex-1">
                      <p className="rk-eyebrow">CAPTAIN CARD</p>
                      <h2 className="rk-username"><RankedUsername username={profile.username} /></h2>
                      <p className="text-base text-amber-200">{profile.title}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rk-stat-box">
                      <span className="rk-stat-label">BOUNTY</span>
                      <span className="rk-stat-val text-amber-300">฿ {profile.bounty.toLocaleString()}</span>
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
                    <div className="rk-xp" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctToNext} aria-label="Progress to next rank">
                      {Array.from({ length: segments }, (_, i) => (
                        <i key={i} className={i < litSegments ? "is-on" : ""} style={{ animationDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1 text-center text-sm">
                    <div className="rk-mini-stat">
                      <span>W</span>
                      <b className="text-emerald-300">{profile.wins}</b>
                    </div>
                    <div className="rk-mini-stat">
                      <span>L</span>
                      <b className="text-rose-300">{profile.losses}</b>
                    </div>
                    <div className="rk-mini-stat">
                      <span>D</span>
                      <b className="text-slate-300">{profile.draws}</b>
                    </div>
                    <div className={`rk-mini-stat ${profile.winStreak >= 3 ? "is-hot" : ""}`}>
                      <span>STREAK</span>
                      <b className="text-amber-300">
                        <Flame size={12} className="inline" /> {profile.winStreak}
                      </b>
                    </div>
                  </div>

                  {form.length > 0 && (
                    <div className="rk-form" aria-label="Last five results">
                      <span>FORM</span>
                      {form.map((o, i) => (
                        <i key={i} className={`is-${o}`}>{o === "win" ? "W" : o === "loss" ? "L" : "D"}</i>
                      ))}
                    </div>
                  )}
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
              <p className="rk-eyebrow">RANK LADDER</p>
              <ol className="rk-ladder">
                {[...RANK_TIERS].reverse().map((t) => {
                  const idx = RANK_TIERS.findIndex((x) => x.id === t.id);
                  const state = !profile ? "" : idx === tierIndex ? "is-you" : idx < tierIndex ? "is-cleared" : "is-locked";
                  const reachable = Boolean(profile) && idx !== tierIndex && Math.abs(idx - tierIndex) <= RANKED_MAX_TIER_GAP;
                  return (
                    <li key={t.id} className={`rk-rung ${state}`} style={{ "--tier": t.color } as CSSProperties}>
                      <RankEmblem points={t.min} size={22} />
                      <span className="rk-rung-name">{t.name}</span>
                      {state === "is-you" && <span className="rk-rung-you">YOU ▸</span>}
                      {reachable && <span className="rk-rung-reach" title="You can be matched with this rank">⚔</span>}
                      <span className="rk-rung-rp">{t.min}+</span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 space-y-1 text-sm text-slate-400">
                <p>• Win: +30 RP vs an even captain. Upsets pay big (up to +100); beating lower ranks pays less.</p>
                <p>• Loss: -20 RP vs an even captain. Losing to lower ranks costs more (up to -80); losing to higher ranks costs little.</p>
                <p>• Draw: +10 RP, more vs stronger captains.</p>
                <p>• Rank gap and RP gap both count.</p>
                <p>• Win streaks: +10 (3 wins), +20 (5 wins), +50 (10 wins)</p>
                <p>• Matchmaking: closest rank first, never more than {RANKED_MAX_TIER_GAP} ranks apart.</p>
              </div>
            </div>

            <div className="rk-card rk-rules px-scan">
              <p className="rk-eyebrow">HOW BATTLES WORK</p>
              <ul>
                <li><b>♥</b><span>Miss a question and you lose a life.</span></li>
                <li><b className="text-cyan-300">+</b><span>Rarer answers add bonus seconds to your next round.</span></li>
                <li><b className="text-rose-300">⚡</b><span>Both answer 5 in a row: <strong>SHOWDOWN</strong>. The less niche pull loses a life.</span></li>
                <li><b className="text-amber-300">∞</b><span>After round 12 it&apos;s <strong>OVERTIME</strong>: every round is a Showdown until a K.O.</span></li>
              </ul>
            </div>
          </aside>

          {/* ---------- Center: friendly battles + recent duels ---------- */}
          <section className="space-y-4">
            <div className="rk-card px-scan">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="rk-eyebrow">FRIENDLY BATTLE · NO RANK POINTS</p>
                  <h2 className="font-pixel-display text-xl text-white">Captains in Port</h2>
                </div>
                <span className="rk-online is-small"><span className="rk-live-dot" /> {onlinePlayers.length} nearby</span>
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
                      : "No other captains are in port right now."}
                  </p>
                ) : (
                  onlinePlayers.map((p) => (
                    <div key={p.accountId} className={`rk-crew-row ${p.inMatch ? "is-busy" : ""}`} style={{ "--tier": rankTierFor(p.rankPoints).color } as CSSProperties}>
                      <div className="rk-crew-portrait">
                        <CharacterPortrait characterId={p.characterId} size={46} />
                        <span className={`rk-crew-status ${p.inMatch ? "is-busy" : ""}`} />
                      </div>
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
                        <span className="rk-busy-tag"><Swords size={14} /> IN BATTLE</span>
                      ) : captain ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onInviteFriend({ targetId: p.accountId })}
                          className="rk-btn-cyan h-9 px-3 text-base"
                        >
                          ⚔ CHALLENGE
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
                <p className="rk-eyebrow">RECENT DUELS · TAP TO REPLAY THE RESULT</p>
                <div className="mt-2 space-y-2">
                  {recentMatches.map((m) => {
                    const outcome = m.result?.outcome ?? "draw";
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          playClick();
                          onInspectMatch(m);
                        }}
                        className={`rk-duel-row is-${outcome}`}
                      >
                        <span className="rk-duel-chip">{outcome === "win" ? "WIN" : outcome === "loss" ? "LOSS" : "DRAW"}</span>
                        <CharacterPortrait characterId={m.opponent.characterId} size={30} />
                        <span className="min-w-0 flex-1 truncate text-base">
                          vs <strong className="font-normal text-white"><RankedUsername username={m.opponent.username} /></strong>{" "}
                          <span className="text-slate-400">({m.opponent.rankName}{m.mode === "friendly" ? " · friendly" : ""})</span>
                        </span>
                        <span className="shrink-0 text-base text-cyan-200">
                          {m.result && m.mode !== "friendly" ? `${m.result.you.delta >= 0 ? "+" : ""}${m.result.you.delta} RP` : ""} ▸
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ---------- Right: leaderboard with podium ---------- */}
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
              <>
                <div className="rk-podium">
                  {[podium[1], podium[0], podium[2]].map((entry, slot) =>
                    entry ? (
                      <button
                        key={entry.accountId}
                        type="button"
                        onClick={(event) => void openProfile(entry.accountId, event.currentTarget)}
                        aria-label={`View ${entry.username}'s player card`}
                        className={`rk-podium-spot place-${entry.rank} ${entry.isYou ? "is-you" : ""}`}
                      >
                        <span className="rk-podium-char">
                          <CharacterPortrait characterId={entry.characterId} size={slot === 1 ? 64 : 50} />
                        </span>
                        <span className="rk-podium-name"><RankedUsername username={entry.username} /></span>
                        <span className="rk-podium-rp" style={{ color: rankTierFor(entry.rankPoints).color }}>{entry.rankPoints} RP</span>
                        <span className="rk-podium-block">{entry.rank}</span>
                      </button>
                    ) : (
                      <span key={`empty-${slot}`} className="rk-podium-spot is-empty" />
                    ),
                  )}
                </div>
                {leaderboard.length > 3 && (
                  <ol className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                    {leaderboard.slice(3).map((entry) => (
                      <li key={entry.accountId}>
                        <button
                          type="button"
                          onClick={(event) => void openProfile(entry.accountId, event.currentTarget)}
                          aria-label={`View ${entry.username}'s player card`}
                          className={`rk-board-row ${entry.isYou ? "is-you" : ""}`}
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
              </>
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
