"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Flag, Heart, Swords, Volume2, VolumeX } from "lucide-react";
import CharacterPortrait from "../CharacterPortrait";
import RankedUsername from "./RankedUsername";
import { TIER_CONFIG, type Tier } from "@/data/tiers";
import { RANKED_SECONDS, RANKED_STARTING_LIVES, RANKED_TIER_BONUS_SECONDS, rankTierFor } from "@/lib/ranked";
import type { RankedLobbyResponse, RankedMatchView, RankedPlayerCard } from "@/lib/ranked-types";
import { playAchievement, playClick, playPull, playSetSail, playSuggest, playTick, playTimeout, playWrong } from "@/lib/sound";

const RANKED_TIER_COLORS: Record<Tier, string> = {
  common: "#cbd5e1",
  uncommon: "#34d399",
  rare: "#60a5fa",
  epic: "#e879f9",
  luffillion: "#fbbf24",
};

function FighterCard({
  player,
  label,
  locked,
  align = "left",
}: {
  player: RankedPlayerCard;
  label: string;
  locked?: boolean;
  align?: "left" | "right";
}) {
  const tier = rankTierFor(player.rankPoints);
  return (
    <div
      className={`rk-fighter px-scan ${align === "right" ? "is-right" : ""}`}
      style={{ borderTopColor: tier.color }}
    >
      <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
        <div className="rk-portrait-box flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-0.5" aria-label={`${player.lives} of ${RANKED_STARTING_LIVES} lives`}>
            {Array.from({ length: RANKED_STARTING_LIVES }, (_, i) => (
              <Heart
                key={i}
                size={13}
                className={i < player.lives ? "fill-rose-500 text-rose-400" : "fill-slate-800 text-slate-700"}
              />
            ))}
            <span className="ml-1 text-[10px] text-slate-400">
              {player.lives}/{RANKED_STARTING_LIVES}
            </span>
          </div>
          <CharacterPortrait characterId={player.characterId} size={60} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="rk-eyebrow">
            {label} {locked ? "· LOCKED IN ✓" : ""}
          </p>
          <h2 className="truncate font-pixel-display text-xl text-white"><RankedUsername username={player.username} /></h2>
          <p className="truncate text-sm text-amber-200">{player.title}</p>
          <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm ${align === "right" ? "justify-end" : ""}`}>
            <span style={{ color: tier.color }}>
              RANK {tier.name} ({player.rankPoints} RP)
            </span>
            <span className="text-slate-300">BOUNTY {player.bounty.toLocaleString()} berries</span>
          </div>
          <div className={`mt-1 flex flex-wrap gap-x-3 text-sm text-slate-400 ${align === "right" ? "justify-end" : ""}`}>
            <span>W {player.wins}</span>
            <span>L {player.losses}</span>
            <span>D {player.draws}</span>
            <span>STREAK {player.winStreak}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RankedBattle({
  match,
  feedback,
  serverNow,
  busy,
  error,
  muted,
  onMute,
  onGuess,
  onForfeit,
  onDone,
  onPlayAgain,
}: {
  match: RankedMatchView;
  feedback?: RankedLobbyResponse["feedback"];
  serverNow: number;
  busy: boolean;
  error: string;
  muted: boolean;
  onMute: () => void;
  onGuess: (guess: string) => void;
  onForfeit: () => void;
  onDone: () => void;
  onPlayAgain: () => void;
}) {
  const [guess, setGuess] = useState("");
  const [now, setNow] = useState(0);
  const [fx, setFx] = useState<{ id: number; tier: Tier } | null>(null);
  const [clock, setClock] = useState({ server: serverNow, perf: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRoundRef = useRef(-1);
  const lastTickRef = useRef("");
  const lastRevealRef = useRef(-1);
  const finishedSoundRef = useRef("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const perf = performance.now();
      setClock({ server: serverNow, perf });
      setNow(perf);
    });
    return () => cancelAnimationFrame(frame);
  }, [serverNow]);

  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 50);
    return () => clearInterval(id);
  }, []);

  const currentServerMs = clock.server + (now - clock.perf);
  const round = match.round;
  const phase = !round
    ? "finished"
    : currentServerMs < round.startsAt
      ? round.roundNumber === 1
        ? "intro"
        : "reveal"
      : "answering";

  const remainingMs =
    round && phase === "answering"
      ? Math.max(0, round.endsAt - currentServerMs)
      : (RANKED_SECONDS + (round?.bonusSeconds ?? 0)) * 1000;
  const roundDurationMs = (RANKED_SECONDS + (round?.bonusSeconds ?? 0)) * 1000;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const prepSec = round && phase !== "answering" ? Math.max(1, Math.ceil((round.startsAt - currentServerMs) / 1000)) : 0;

  // Focus input & play sound when a new round transitions into answering
  useEffect(() => {
    if (!round || phase !== "answering") return;
    if (lastRoundRef.current !== round.roundNumber) {
      lastRoundRef.current = round.roundNumber;
      setGuess("");
      playSetSail();
      inputRef.current?.focus();
    }
  }, [round, phase]);

  // Countdown tick in the final 4 seconds
  useEffect(() => {
    if (!round || phase !== "answering" || round.yourPick || remainingSec > 4 || remainingSec < 1) return;
    const key = `${round.roundNumber}:${remainingSec}`;
    if (lastTickRef.current === key) return;
    lastTickRef.current = key;
    playTick(remainingSec <= 2);
  }, [round, phase, remainingSec]);

  // Show the earned time bonus instead of the standard rarity banner.
  useEffect(() => {
    if (feedback?.kind === "correct" && feedback.pick) {
      const tier = feedback.pick.tier;
      playPull(tier);
      const frame = requestAnimationFrame(() => setFx({ id: Date.now(), tier }));
      return () => cancelAnimationFrame(frame);
    } else if (feedback?.kind === "wrong") {
      playWrong();
    }
  }, [feedback]);

  // Sound on round reveal
  useEffect(() => {
    if (!match.lastReveal) return;
    if (lastRevealRef.current === match.lastReveal.roundNumber) return;
    lastRevealRef.current = match.lastReveal.roundNumber;
    if (match.lastReveal.loser === "you") playTimeout();
  }, [match.lastReveal]);

  // Victory sound
  useEffect(() => {
    if (match.status !== "finished" || !match.result) return;
    if (finishedSoundRef.current === match.id) return;
    finishedSoundRef.current = match.id;
    if (match.result.outcome === "win") playAchievement();
  }, [match.status, match.id, match.result]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!guess.trim() || busy || phase !== "answering" || remainingMs <= 0 || round?.yourPick) return;
    playClick();
    onGuess(guess.trim());
    setGuess("");
  }

  return (
    <main className="ranked-shell">
      {fx && (
        <div
          key={fx.id}
          className="rk-tier-bonus-effect"
          role="status"
          style={{ color: RANKED_TIER_COLORS[fx.tier], borderColor: RANKED_TIER_COLORS[fx.tier] }}
        >
          +{RANKED_TIER_BONUS_SECONDS[fx.tier]} Second{RANKED_TIER_BONUS_SECONDS[fx.tier] === 1 ? "" : "s"}
        </div>
      )}

      <header className="rk-topbar">
        <div className="flex items-center gap-3">
          {match.status === "active" ? (
            <button type="button" onClick={onForfeit} disabled={busy} className="rk-btn-muted h-8 px-3 text-sm text-rose-200">
              <Flag size={14} className="mr-1 inline" /> Forfeit
            </button>
          ) : (
            <button type="button" onClick={onDone} className="rk-link">
              ← Back to Ranked Lobby
            </button>
          )}
        </div>
        <div className="rk-brand">
          <Swords size={20} />
          <span>
            {match.mode === "friendly" ? "FRIENDLY BATTLE" : "RANKED DUEL"} <small>{round ? `ROUND ${round.roundNumber}` : "FINISHED"}</small>
          </span>
        </div>
        <button
          type="button"
          onClick={onMute}
          aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
          className="rk-icon-btn"
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </header>

      <div className="rk-battle-page">
        {/* Player vs Opponent Stat Cards */}
        <section className="rk-vs-row" aria-label="Battle combatants">
          <FighterCard player={match.you} label="YOU" locked={Boolean(round?.yourPick)} />
          <div className="rk-vs-badge">VS</div>
          <FighterCard player={match.opponent} label="OPPONENT" locked={round?.opponentLocked} align="right" />
        </section>

        {error && (
          <p role="alert" className="rk-error mx-auto max-w-2xl">
            {error}
          </p>
        )}

        {/* Center Arena */}
        <section className="rk-arena px-box px-scan">
          {match.status === "finished" && match.result ? (
            <div className="text-center">
              <p className="rk-eyebrow">
                {match.mode === "friendly"
                  ? "FRIENDLY BATTLE · NO RANK POINTS"
                  : match.result.reason === "forfeit"
                  ? "MATCH FORFEITED"
                  : match.result.reason === "knockout"
                    ? "KNOCKOUT"
                    : "FINAL DECISION"}
              </p>
              <h1
                className={`mt-1 font-pixel-display text-4xl font-bold ${
                  match.result.outcome === "win"
                    ? "text-amber-300"
                    : match.result.outcome === "loss"
                      ? "text-rose-300"
                      : "text-cyan-200"
                }`}
              >
                {match.result.outcome === "win" ? "VICTORY!" : match.result.outcome === "loss" ? "DEFEAT" : "DRAW!"}
              </h1>

              {match.mode === "ranked" && <div className="mx-auto mt-4 max-w-md border border-white/15 bg-white/[.04] p-4">
                <p className="text-sm tracking-[0.25em] text-slate-400">RANKED POINTS</p>
                <p
                  className={`font-pixel-display text-4xl font-bold ${
                    match.result.you.delta > 0
                      ? "text-emerald-300"
                      : match.result.you.delta < 0
                        ? "text-rose-300"
                        : "text-slate-200"
                  }`}
                >
                  {match.result.you.delta >= 0 ? `+${match.result.you.delta}` : match.result.you.delta} RP
                </p>
                <p className="mt-1 text-base text-slate-300">
                  {match.result.you.oldPoints} RP →{" "}
                  <strong className="font-normal text-white">{match.result.you.newPoints} RP</strong> (
                  <span style={{ color: rankTierFor(match.result.you.newPoints).color }}>
                    {rankTierFor(match.result.you.newPoints).name}
                  </span>
                  )
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm text-slate-400">
                  <span>
                    Base: {match.result.you.baseDelta >= 0 ? `+${match.result.you.baseDelta}` : match.result.you.baseDelta}
                  </span>
                  {match.result.you.streakBonus > 0 && (
                    <span className="text-amber-300">
                      🔥 {match.result.you.newStreak}-Win Streak: +{match.result.you.streakBonus}
                    </span>
                  )}
                  {match.result.you.newPoints === 0 && match.result.you.oldPoints === 0 && match.result.outcome === "loss" && (
                    <span className="text-cyan-200">Bronze 0 RP floor protected</span>
                  )}
                </div>
              </div>}

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={onPlayAgain} className="rk-btn-gold h-11 px-6">
                  FIND NEW MATCH ▸
                </button>
                <button type="button" onClick={onDone} className="rk-btn-muted h-11 px-5">
                  BACK TO LOBBY
                </button>
              </div>

              {match.history.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-4 text-left">
                  <p className="rk-eyebrow mb-2">ROUND BREAKDOWN</p>
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {match.history.map((h) => (
                      <div key={h.roundNumber} className="border border-white/10 bg-white/[.03] px-3 py-2 text-sm">
                        <p className="text-slate-400">
                          R{h.roundNumber} · {h.prompt}
                        </p>
                        <div className="mt-1 flex flex-wrap justify-between gap-2 text-base">
                          <span>
                            You:{" "}
                            {h.yourPick ? (
                              <span className={TIER_CONFIG[h.yourPick.tier].text}>
                                {h.yourPick.answer} (+{RANKED_TIER_BONUS_SECONDS[h.yourPick.tier]}s)
                              </span>
                            ) : (
                              <span className="text-rose-300">No answer (0)</span>
                            )}
                          </span>
                          <span>
                            <RankedUsername username={match.opponent.username} />:{" "}
                            {h.opponentPick ? (
                              <span className={TIER_CONFIG[h.opponentPick.tier].text}>
                                {h.opponentPick.answer} (+{RANKED_TIER_BONUS_SECONDS[h.opponentPick.tier]}s)
                              </span>
                            ) : (
                              <span className="text-rose-300">No answer (0)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : phase === "intro" ? (
            <div className="py-6 text-center">
              <p className="rk-eyebrow">PLAYER VS PLAYER · {match.mode === "friendly" ? "FRIENDLY" : "RANKED"}</p>
              <h1 className="mt-1 font-pixel-display text-3xl text-white">
                <RankedUsername username={match.you.username} /> vs <RankedUsername username={match.opponent.username} />
              </h1>
              <p className="mt-2 text-lg text-slate-300">
                First question begins in
              </p>
              <p className="mt-1 font-pixel-display text-5xl text-amber-300">{prepSec}</p>
              <p className="mt-2 text-sm text-slate-400">
                {RANKED_SECONDS} seconds per question · Correct answers boost your next timer.
              </p>
            </div>
          ) : phase === "reveal" && match.lastReveal ? (
            <div className="py-3 text-center">
              <p className="rk-eyebrow">ROUND {match.lastReveal.roundNumber} RESULT</p>
              <h2
                className={`mt-1 font-pixel-display text-3xl ${
                  match.lastReveal.loser === "opponent"
                    ? "text-emerald-300"
                    : match.lastReveal.loser === "you"
                      ? "text-rose-300"
                      : "text-amber-200"
                }`}
              >
                {match.lastReveal.loser === "opponent"
                  ? <><RankedUsername username={match.opponent.username} /> loses a life!</>
                  : match.lastReveal.loser === "you"
                    ? "You lost a life!"
                    : "Round Tied — No life lost!"}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="border border-white/10 bg-white/[.04] p-3">
                  <p className="text-xs tracking-widest text-slate-400">YOUR PULL</p>
                  {match.lastReveal.yourPick ? (
                    <>
                      <p className="mt-1 text-xl text-white">{match.lastReveal.yourPick.answer}</p>
                      <p className={`text-base ${TIER_CONFIG[match.lastReveal.yourPick.tier].text}`}>
                        +{RANKED_TIER_BONUS_SECONDS[match.lastReveal.yourPick.tier]} Seconds next round
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-lg text-rose-300">No answer · 0 pts</p>
                  )}
                </div>
                <div className="border border-white/10 bg-white/[.04] p-3">
                  <p className="text-xs tracking-widest text-slate-400"><RankedUsername username={match.opponent.username.toUpperCase()} />&apos;S PULL</p>
                  {match.lastReveal.opponentPick ? (
                    <>
                      <p className="mt-1 text-xl text-white">{match.lastReveal.opponentPick.answer}</p>
                      <p className={`text-base ${TIER_CONFIG[match.lastReveal.opponentPick.tier].text}`}>
                        +{RANKED_TIER_BONUS_SECONDS[match.lastReveal.opponentPick.tier]} Seconds next round
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-lg text-rose-300">No answer · 0 pts</p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-base text-cyan-200">Next round in {prepSec}…</p>
            </div>
          ) : round ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="rk-eyebrow">ROUND {round.roundNumber} · {RANKED_SECONDS}{round.bonusSeconds ? ` + ${round.bonusSeconds}` : ""}S BLITZ</span>
                <span className={`font-mono text-3xl font-bold tabular-nums ${remainingSec <= 3 ? "text-rose-400" : "text-cyan-300"}`}>
                  0:{String(remainingSec).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-2 h-2 bg-slate-800">
                <div
                  className={`h-full transition-[width] duration-75 ${remainingSec <= 3 ? "bg-rose-400" : "bg-cyan-400"}`}
                  style={{ width: `${(remainingMs / roundDurationMs) * 100}%` }}
                />
              </div>
              <h1 className="mt-4 font-pixel-display text-2xl font-bold text-white sm:text-3xl">{round.prompt}</h1>
              <p className="mt-1 text-base text-slate-400">{round.hint}</p>

              {round.yourPick ? (
                <div className="mt-5 border-l-4 border-emerald-400 bg-emerald-400/10 p-4">
                  <p className="text-sm tracking-widest text-emerald-300">LOCKED IN!</p>
                  <p className="mt-1 text-2xl text-white">
                    {round.yourPick.answer}{" "}
                      <span className={TIER_CONFIG[round.yourPick.tier].text}>
                      (+{RANKED_TIER_BONUS_SECONDS[round.yourPick.tier]} seconds next round)
                    </span>
                  </p>
                  <p className="mt-1 text-base text-slate-300">
                    {round.opponentLocked ? "Resolving round…" : <>Waiting for <RankedUsername username={match.opponent.username} />…</>}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  {feedback?.kind === "wrong" && (
                    <div className="mb-3 text-center text-base text-rose-300">
                      {feedback.suggestion ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            playSuggest();
                            onGuess(feedback.suggestion!);
                          }}
                          className="border border-amber-300/70 bg-[#1a2540] px-3 py-1 text-amber-200 hover:bg-[#24335a]"
                        >
                          Did you mean <strong>{feedback.suggestion}</strong>? Use this ▸
                        </button>
                      ) : (
                        "Not an answer — keep guessing fast!"
                      )}
                    </div>
                  )}
                  <form onSubmit={submit} className="flex gap-2">
                    <input
                      ref={inputRef}
                      autoFocus
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      maxLength={80}
                      placeholder="Type an answer before time runs out…"
                      aria-label="Ranked answer"
                      className="h-12 flex-1 border-2 border-cyan-400/70 bg-[#091326] px-3 text-xl text-white placeholder:text-slate-500 outline-none focus:border-cyan-300"
                    />
                    <button
                      type="submit"
                      disabled={busy || !guess.trim() || remainingMs <= 0}
                      className="rk-btn-gold h-12 px-6"
                    >
                      {busy ? "…" : "SEND ▸"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
