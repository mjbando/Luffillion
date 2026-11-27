"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Flag, Swords, Volume2, VolumeX } from "lucide-react";
import CharacterPortrait from "../CharacterPortrait";
import RankedUsername from "./RankedUsername";
import { TIER_CONFIG, type Tier } from "@/data/tiers";
import { RANKED_MAX_ROUNDS, RANKED_SECONDS, RANKED_STARTING_LIVES, RANKED_TIER_BONUS_SECONDS, rankTierFor } from "@/lib/ranked";
import type { RankedLobbyResponse, RankedMatchView, RankedPlayerCard, RankedRoundPick } from "@/lib/ranked-types";
import {
  playAchievement, playClash, playClick, playFight, playHit, playKO, playPull, playSetSail, playSuggest, playTick, playWrong,
} from "@/lib/sound";

const RANKED_TIER_COLORS: Record<Tier, string> = {
  common: "#cbd5e1",
  uncommon: "#34d399",
  rare: "#60a5fa",
  epic: "#e879f9",
  luffillion: "#fbbf24",
};
const TIER_SHOUT: Record<Tier, string> = {
  common: "COMMON",
  uncommon: "UNCOMMON",
  rare: "RARE!",
  epic: "EPIC!!",
  luffillion: "LUFFILLION!!!",
};

type Pose = "enter" | "idle" | "charged" | "attack" | "hit" | "clash" | "ko" | "winner";

/** Fighting-game life bar: one segment per life, the newest loss shatters. */
function HudSide({ player, side, breakingKey }: { player: RankedPlayerCard; side: "left" | "right"; breakingKey: string | null }) {
  const tier = rankTierFor(player.rankPoints);
  return (
    <div className={`rk-hud-side is-${side}`}>
      <div className="rk-hud-name">
        <span className="rk-hud-tag">{side === "left" ? "1P" : "2P"}</span>
        <span className="truncate"><RankedUsername username={player.username} /></span>
      </div>
      <div className="rk-lifebar" role="img" aria-label={`${player.username}: ${player.lives} of ${RANKED_STARTING_LIVES} lives`}>
        {Array.from({ length: RANKED_STARTING_LIVES }, (_, i) => {
          const alive = i < player.lives;
          const breaking = breakingKey && i === player.lives;
          return <span key={breaking ? `${i}:${breakingKey}` : i} className={`rk-life ${alive ? "is-alive" : ""} ${breaking ? "is-breaking" : ""}`} />;
        })}
      </div>
      <div className="rk-hud-meta">
        <span style={{ color: tier.color }}>{tier.name} · {player.rankPoints} RP</span>
        {player.winStreak > 1 && <span className="text-amber-300">🔥{player.winStreak}</span>}
      </div>
    </div>
  );
}

function Fighter({
  player, side, pose, poseKey, aura, bubble, shout, damage,
}: {
  player: RankedPlayerCard;
  side: "left" | "right";
  pose: Pose;
  poseKey: string;
  aura?: string;
  bubble?: "thinking" | "locked" | null;
  shout?: { text: string; color: string; key: string } | null;
  damage?: string | null;
}) {
  return (
    <div className={`rk-fighter-slot is-${side}`} style={{ "--aura": aura ?? "#e2e8f0" } as CSSProperties}>
      {bubble && (
        <div className={`rk-bubble is-${bubble}`} aria-hidden="true">
          {bubble === "locked" ? "!" : <><i /><i /><i /></>}
        </div>
      )}
      {shout && <div key={shout.key} className="rk-shout" style={{ color: shout.color }}>{shout.text}</div>}
      {damage && <div key={damage} className="rk-damage" aria-hidden="true">-1 ♥</div>}
      <div className="rk-flip">
        <div key={poseKey} className={`rk-body pose-${pose}`}>
          {pose === "charged" && <span className="rk-aura" aria-hidden="true" />}
          <CharacterPortrait characterId={player.characterId} size={150} />
        </div>
        <div className="rk-shadow" />
      </div>
      {pose === "hit" && <div key={`spark:${poseKey}`} className="rk-impact" aria-hidden="true" />}
    </div>
  );
}

function PullCard({ who, pick, side, won }: { who: ReactNode; pick: RankedRoundPick | null; side: "left" | "right"; won: boolean | null }) {
  const color = pick ? RANKED_TIER_COLORS[pick.tier] : "#fb7185";
  return (
    <div className={`rk-pull is-${side} ${won ? "is-winner" : won === false ? "is-loser" : ""}`} style={{ "--pull": color } as CSSProperties}>
      <p className="rk-pull-who">{who}</p>
      {pick ? (
        <>
          <p className="rk-pull-answer">{pick.answer}</p>
          <p className="rk-pull-tier">{TIER_SHOUT[pick.tier]} · +{RANKED_TIER_BONUS_SECONDS[pick.tier]}s next round</p>
        </>
      ) : (
        <p className="rk-pull-answer text-rose-300">No answer</p>
      )}
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
  const danger = phase === "answering" && !round?.yourPick && remainingSec <= 3;

  // New round goes live: focus the input, sound the gong on round 1.
  useEffect(() => {
    if (!round || phase !== "answering") return;
    if (lastRoundRef.current !== round.roundNumber) {
      lastRoundRef.current = round.roundNumber;
      setGuess("");
      if (round.roundNumber === 1) playFight();
      else playSetSail();
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

  // Correct answer: tier sound + floating bonus over your fighter.
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

  // Reveal: the punch lands a beat after the lunge starts.
  useEffect(() => {
    const reveal = match.lastReveal;
    if (!reveal || lastRevealRef.current === reveal.roundNumber) return;
    lastRevealRef.current = reveal.roundNumber;
    const knockedOut = reveal.loser === "you" ? match.you.lives === 0 : reveal.loser === "opponent" ? match.opponent.lives === 0 : false;
    const id = setTimeout(() => {
      if (!reveal.loser) playClash();
      else if (knockedOut) playKO();
      else playHit(reveal.loser === "opponent");
    }, 320);
    return () => clearTimeout(id);
  }, [match.lastReveal, match.you.lives, match.opponent.lives]);

  // Victory fanfare after the dust settles.
  useEffect(() => {
    if (match.status !== "finished" || !match.result) return;
    if (finishedSoundRef.current === match.id) return;
    finishedSoundRef.current = match.id;
    if (match.result.outcome === "win") {
      const id = setTimeout(playAchievement, 900);
      return () => clearTimeout(id);
    }
  }, [match.status, match.id, match.result]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!guess.trim() || busy || phase !== "answering" || remainingMs <= 0 || round?.yourPick) return;
    playClick();
    onGuess(guess.trim());
    setGuess("");
  }

  // ---------- Stage choreography ----------
  const reveal = match.lastReveal;
  const showReveal = (phase === "reveal" || phase === "finished") && reveal;
  const revealKey = showReveal ? `r${reveal.roundNumber}` : null;
  const loser = showReveal ? reveal.loser : undefined;
  const result = match.status === "finished" ? match.result : null;
  const finalBlow = result?.reason === "knockout";

  function poseFor(who: "you" | "opponent"): Pose {
    const other = who === "you" ? "opponent" : "you";
    if (result) {
      if (result.outcome === "draw") return "idle";
      const won = (result.outcome === "win") === (who === "you");
      if (won) return "winner";
      return result.reason === "forfeit" ? "idle" : "ko";
    }
    if (phase === "intro") return "enter";
    if (phase === "reveal" && showReveal) {
      if (loser === who) return "hit";
      if (loser === other) return "attack";
      return "clash";
    }
    if (phase === "answering") {
      const locked = who === "you" ? Boolean(round?.yourPick) : Boolean(round?.opponentLocked);
      return locked ? "charged" : "idle";
    }
    return "idle";
  }
  const youPose = poseFor("you");
  const oppPose = poseFor("opponent");
  const yourTierColor = round?.yourPick ? RANKED_TIER_COLORS[round.yourPick.tier] : undefined;

  let callout: { text: string; kind: string } | null = null;
  if (result) {
    callout = result.reason === "knockout"
      ? { text: "K.O.!", kind: "ko" }
      : result.reason === "forfeit"
        ? { text: "FORFEIT", kind: "time" }
        : { text: "TIME!", kind: "time" };
  } else if (phase === "intro") {
    callout = prepSec >= 3 ? null : prepSec === 2 ? { text: "ROUND 1", kind: "round" } : { text: "FIGHT!", kind: "fight" };
  } else if (phase === "reveal" && showReveal && round) {
    if (prepSec <= 1) callout = { text: `ROUND ${round.roundNumber}`, kind: "round" };
    else callout = loser === "opponent" ? { text: "DIRECT HIT!", kind: "hit" } : loser === "you" ? { text: "OUCH!", kind: "ouch" } : { text: "CLASH!", kind: "clash" };
  }

  const timerText = phase === "answering" ? String(remainingSec) : phase === "finished" ? "END" : String(prepSec);
  const finishedTitle = result ? (result.outcome === "win" ? "VICTORY!" : result.outcome === "loss" ? "DEFEAT" : "DRAW!") : "";

  return (
    <main className={`ranked-shell rk-battle ${match.mode === "friendly" ? "is-friendly" : ""}`}>
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
        <button type="button" onClick={onMute} aria-label={muted ? "Unmute sound effects" : "Mute sound effects"} className="rk-icon-btn">
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </header>

      <div className="rk-battle-page">
        {/* ---------- HUD ---------- */}
        <section className="rk-hud" aria-label="Battle status">
          <HudSide player={match.you} side="left" breakingKey={loser === "you" ? revealKey : null} />
          <div className={`rk-medallion ${danger ? "is-danger" : ""} ${phase === "answering" ? "is-live" : ""}`} aria-live="off">
            <small>{round ? `RND ${round.roundNumber}` : "MATCH"}</small>
            <strong>{timerText}</strong>
          </div>
          <HudSide player={match.opponent} side="right" breakingKey={loser === "opponent" ? revealKey : null} />
        </section>
        <div className="rk-track" aria-label="Round results">
          {Array.from({ length: Math.min(RANKED_MAX_ROUNDS, Math.max(match.history.length + (round ? 1 : 0), 1)) }, (_, i) => {
            const h = match.history.find((x) => x.roundNumber === i + 1);
            const cls = h ? (h.loser === "opponent" ? "is-won" : h.loser === "you" ? "is-lost" : "is-tie") : round?.roundNumber === i + 1 ? "is-current" : "";
            return <span key={i} className={`rk-pip ${cls}`} title={h ? `Round ${i + 1}` : undefined} />;
          })}
        </div>

        {/* ---------- Stage ---------- */}
        <section className={`rk-stage ${danger ? "is-danger" : ""} ${result ? "is-over" : ""}`} aria-hidden="true">
          <div key={revealKey && loser ? `shake:${revealKey}` : "still"} className={`rk-stage-inner ${revealKey && loser ? (finalBlow && result ? "is-quake" : "is-shake") : ""}`}>
            <div className="rk-sky" />
            <div className="rk-sun" />
            <div className="rk-cloud c1" /><div className="rk-cloud c2" /><div className="rk-cloud c3" />
            <div className="rk-sea" />
            <div className="rk-deck" />
            {phase === "reveal" && loser === null && <div key={`clash:${revealKey}`} className="rk-clash-spark" />}
            <Fighter
              player={match.you}
              side="left"
              pose={youPose}
              poseKey={`${youPose}:${revealKey ?? round?.roundNumber ?? "end"}`}
              aura={yourTierColor}
              shout={fx && phase === "answering" ? { text: `${TIER_SHOUT[fx.tier]} +${RANKED_TIER_BONUS_SECONDS[fx.tier]}s`, color: RANKED_TIER_COLORS[fx.tier], key: String(fx.id) } : null}
              damage={loser === "you" && phase === "reveal" ? revealKey : null}
            />
            <Fighter
              player={match.opponent}
              side="right"
              pose={oppPose}
              poseKey={`${oppPose}:${revealKey ?? round?.roundNumber ?? "end"}`}
              bubble={phase === "answering" ? (round?.opponentLocked ? "locked" : "thinking") : null}
              damage={loser === "opponent" && phase === "reveal" ? revealKey : null}
            />
            {phase === "intro" && prepSec >= 3 && (
              <div className="rk-vs-splash">
                <div className="rk-vs-plate is-left"><RankedUsername username={match.you.username} /><small>{match.you.title}</small></div>
                <div className="rk-vs-big">VS</div>
                <div className="rk-vs-plate is-right"><RankedUsername username={match.opponent.username} /><small>{match.opponent.title}</small></div>
              </div>
            )}
            {callout && <div key={`${callout.text}:${revealKey ?? ""}`} className={`rk-callout is-${callout.kind}`}>{callout.text}</div>}
            {result && <div className={`rk-result-banner is-${result.outcome}`}><span>{finishedTitle}</span></div>}
          </div>
        </section>

        {error && (
          <p role="alert" className="rk-error mx-auto max-w-2xl">
            {error}
          </p>
        )}

        {/* ---------- Panel under the stage ---------- */}
        <section className="rk-arena px-box px-scan">
          {result ? (
            <div className="text-center">
              <p className="rk-eyebrow">
                {match.mode === "friendly"
                  ? "FRIENDLY BATTLE · NO RANK POINTS"
                  : result.reason === "forfeit"
                    ? "MATCH FORFEITED"
                    : result.reason === "knockout"
                      ? "KNOCKOUT"
                      : "FINAL DECISION"}
              </p>
              <h1 className={`rk-final-title is-${result.outcome}`}>{finishedTitle}</h1>

              {match.mode === "ranked" && (
                <div className="mx-auto mt-4 max-w-md border border-white/15 bg-white/[.04] p-4">
                  <p className="text-sm tracking-[0.25em] text-slate-400">RANKED POINTS</p>
                  <p className={`rk-rp-delta font-pixel-display text-4xl font-bold ${result.you.delta > 0 ? "text-emerald-300" : result.you.delta < 0 ? "text-rose-300" : "text-slate-200"}`}>
                    {result.you.delta >= 0 ? `+${result.you.delta}` : result.you.delta} RP
                  </p>
                  <p className="mt-1 text-base text-slate-300">
                    {result.you.oldPoints} RP → <strong className="font-normal text-white">{result.you.newPoints} RP</strong> (
                    <span style={{ color: rankTierFor(result.you.newPoints).color }}>{rankTierFor(result.you.newPoints).name}</span>)
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm text-slate-400">
                    <span>Base: {result.you.baseDelta >= 0 ? `+${result.you.baseDelta}` : result.you.baseDelta}</span>
                    {result.you.streakBonus > 0 && (
                      <span className="text-amber-300">🔥 {result.you.newStreak}-Win Streak: +{result.you.streakBonus}</span>
                    )}
                    {result.you.newPoints === 0 && result.you.oldPoints === 0 && result.outcome === "loss" && (
                      <span className="text-cyan-200">Bronze 0 RP floor protected</span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={onPlayAgain} className="rk-btn-gold h-11 px-6">FIND NEW MATCH ▸</button>
                <button type="button" onClick={onDone} className="rk-btn-muted h-11 px-5">BACK TO LOBBY</button>
              </div>

              {match.history.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-4 text-left">
                  <p className="rk-eyebrow mb-2">ROUND BREAKDOWN</p>
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {match.history.map((h) => (
                      <div key={h.roundNumber} className={`rk-history-row ${h.loser === "opponent" ? "is-won" : h.loser === "you" ? "is-lost" : ""}`}>
                        <p className="text-slate-400">R{h.roundNumber} · {h.prompt}</p>
                        <div className="mt-1 flex flex-wrap justify-between gap-2 text-base">
                          <span>
                            You:{" "}
                            {h.yourPick ? (
                              <span className={TIER_CONFIG[h.yourPick.tier].text}>{h.yourPick.answer} (+{RANKED_TIER_BONUS_SECONDS[h.yourPick.tier]}s)</span>
                            ) : (
                              <span className="text-rose-300">No answer</span>
                            )}
                          </span>
                          <span>
                            <RankedUsername username={match.opponent.username} />:{" "}
                            {h.opponentPick ? (
                              <span className={TIER_CONFIG[h.opponentPick.tier].text}>{h.opponentPick.answer} (+{RANKED_TIER_BONUS_SECONDS[h.opponentPick.tier]}s)</span>
                            ) : (
                              <span className="text-rose-300">No answer</span>
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
            <div className="py-2 text-center">
              <p className="rk-eyebrow">PLAYER VS PLAYER · {match.mode === "friendly" ? "FRIENDLY" : "RANKED"}</p>
              <p className="mt-2 font-pixel-display text-2xl text-white">Get ready to battle!</p>
              <p className="mt-2 text-base text-slate-300">
                {RANKED_SECONDS} seconds per question. Rarer answers add bonus time to your next round. No answer = you take a hit.
              </p>
            </div>
          ) : phase === "reveal" && reveal ? (
            <div className="text-center">
              <p className="rk-eyebrow">ROUND {reveal.roundNumber} RESULT</p>
              <h2 className={`rk-reveal-title ${loser === "opponent" ? "is-good" : loser === "you" ? "is-bad" : ""}`}>
                {loser === "opponent" ? <><RankedUsername username={match.opponent.username} /> takes a hit!</> : loser === "you" ? "You took a hit!" : "Clash! No life lost."}
              </h2>
              <div key={revealKey} className="rk-pulls">
                <PullCard who="YOUR ATTACK" pick={reveal.yourPick} side="left" won={loser === "opponent" ? true : loser === "you" ? false : null} />
                <span className="rk-pulls-vs">VS</span>
                <PullCard who={<><RankedUsername username={match.opponent.username.toUpperCase()} />&apos;S ATTACK</>} pick={reveal.opponentPick} side="right" won={loser === "you" ? true : loser === "opponent" ? false : null} />
              </div>
              <p className="mt-3 text-base text-cyan-200">Next round in {prepSec}…</p>
            </div>
          ) : round ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="rk-eyebrow">ROUND {round.roundNumber} · {RANKED_SECONDS}{round.bonusSeconds ? ` + ${round.bonusSeconds}` : ""}S BLITZ</span>
                {round.opponentLocked && !round.yourPick && <span className="rk-pressure">⚡ OPPONENT LOCKED IN</span>}
              </div>
              <div className={`rk-fuse ${danger ? "is-danger" : ""}`}>
                <div className="rk-fuse-fill" style={{ width: `${(remainingMs / roundDurationMs) * 100}%` }}>
                  <span className="rk-fuse-spark" />
                </div>
              </div>
              <h1 key={round.roundNumber} className="rk-prompt">{round.prompt}</h1>
              <p className="mt-1 text-base text-slate-400">{round.hint}</p>

              {round.yourPick ? (
                <div className="rk-locked" style={{ "--pull": RANKED_TIER_COLORS[round.yourPick.tier] } as CSSProperties}>
                  <p className="text-sm tracking-widest text-emerald-300">LOCKED IN! POWERING UP…</p>
                  <p className="mt-1 text-2xl text-white">
                    {round.yourPick.answer}{" "}
                    <span className={TIER_CONFIG[round.yourPick.tier].text}>(+{RANKED_TIER_BONUS_SECONDS[round.yourPick.tier]}s next round)</span>
                  </p>
                  <p className="mt-1 text-base text-slate-300">
                    {round.opponentLocked ? "Both locked. Here it comes…" : <>Waiting for <RankedUsername username={match.opponent.username} />…</>}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  {feedback?.kind === "wrong" && (
                    <div className="rk-miss mb-3 text-center text-base text-rose-300">
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
                        "Missed! Keep swinging!"
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
                      placeholder="Type an answer to attack…"
                      aria-label="Ranked answer"
                      className={`rk-answer-input h-12 flex-1 px-3 text-xl ${feedback?.kind === "wrong" ? "is-miss" : ""}`}
                    />
                    <button type="submit" disabled={busy || !guess.trim() || remainingMs <= 0} className="rk-btn-gold rk-attack-btn h-12 px-6">
                      {busy ? "…" : "ATTACK ▸"}
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
