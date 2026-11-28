"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import BerryMark from "./BerryMark";
import CharacterPortrait from "./CharacterPortrait";
import PixelChest from "./PixelChest";
import { characterById, type CharacterId } from "@/data/playable-characters";
import { CHEST_PRICES, TREASURE_CHESTS, TREASURE_RARITY_COLORS, rarityRank, type ChestRarity, type TreasureRarity } from "@/lib/treasure";
import { playChestBurst, playChestCharge, playChestCrack, playChestReveal, playChestRise, playChestThud, playClick } from "@/lib/sound";

export interface ChestReward {
  chestRarity: ChestRarity;
  rewardRarity: TreasureRarity;
  characterId: CharacterId;
  characterName: string;
  duplicateCoins: number;
  cost: number;
}

/**
 * The opening plays in acts, and rarer pulls get longer, louder versions of each one:
 *   intro    the chest crashes onto the deck (plays while the server rolls)
 *   charging energy is pulled into the chest while the rarity gems light up one at a time
 *   crack    the lid strains and light leaks from every seam, with a heartbeat
 *   burst    the lid blows off: shockwaves, rays, particles and a rarity banner
 *   rise     the recruit's silhouette floats up through the light beam
 *   reveal   the card flips in with the recruit in full colour
 * Tap at any point after the intro to skip straight to the reveal.
 */
type Phase = "intro" | "waiting" | "charging" | "crack" | "burst" | "rise" | "reveal";

const INTRO_MS = 1150;
const STEP_MS = 640;
const crackMs = (rank: number) => 850 + rank * 190;
const burstMs = (rank: number) => 1050 + rank * 210;
const riseMs = (rank: number) => 1150 + rank * 230;

const BANNERS: Partial<Record<TreasureRarity, string>> = {
  rare: "RARE!",
  epic: "EPIC!",
  legendary: "LEGENDARY!",
  mythic: "MYTHIC!!",
};

interface Particle { id: number; dx: number; dy: number; size: number; delay: number; dur: number; color: string; star: boolean }
interface Orb { id: number; angle: number; dist: number; delay: number; dur: number; size: number }
interface Confetti { id: number; left: number; delay: number; dur: number; color: string; drift: number; spin: number }
interface Ember { id: number; left: number; delay: number; dur: number; size: number; drift: number; color: string }
interface Streak { id: number; angle: number; delay: number; len: number; color: string }
interface Meteor { id: number; top: number; left: number; delay: number; dur: number; color: string }
interface Bar { id: number; top: number; height: number; delay: number; color: string }
interface Twinkle { id: number; x: number; y: number; size: number; delay: number }

const RAINBOW = ["#fb7185", "#fbbf24", "#4ade80", "#60a5fa", "#c084fc", "#ffffff"];
const GOLDS = ["#fbbf24", "#fde68a", "#f59e0b", "#ffffff"];

/** Mythic summoning seal: two counter-rotating rune rings around a hexagram, in a rainbow stroke. */
function Seal({ className }: { className: string }) {
  const ticks = Array.from({ length: 36 }, (_, i) => (i * 10 * Math.PI) / 180);
  const hex = (r: number, off: number) => Array.from({ length: 3 }, (_, i) => {
    const a = off + (i * 2 * Math.PI) / 3 - Math.PI / 2;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return (
    <div className={`tc-seal ${className}`} aria-hidden="true">
      <svg viewBox="-100 -100 200 200">
        <defs>
          <linearGradient id="tc-seal-ink" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fb7185" /><stop offset=".3" stopColor="#fbbf24" /><stop offset=".55" stopColor="#4ade80" />
            <stop offset=".8" stopColor="#60a5fa" /><stop offset="1" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <g className="tc-seal-outer" fill="none" stroke="url(#tc-seal-ink)">
          <circle r="94" strokeWidth="2.5" />
          <circle r="86" strokeWidth="1" strokeDasharray="3 5" />
          {ticks.map((a, i) => <line key={i} x1={Math.cos(a) * 72} y1={Math.sin(a) * 72} x2={Math.cos(a) * (i % 3 ? 80 : 84)} y2={Math.sin(a) * (i % 3 ? 80 : 84)} strokeWidth={i % 3 ? 1.2 : 2.4} />)}
        </g>
        <g className="tc-seal-inner" fill="none" stroke="url(#tc-seal-ink)" strokeWidth="2">
          <circle r="66" />
          <polygon points={hex(64, 0)} />
          <polygon points={hex(64, Math.PI)} />
          <circle r="30" strokeWidth="1.5" />
          {Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3 - Math.PI / 2; return <circle key={i} cx={Math.cos(a) * 64} cy={Math.sin(a) * 64} r="5" fill="#0b0618" />; })}
        </g>
      </svg>
    </div>
  );
}

/** Legendary: a pixel-art gold crown with pearls and sapphires and a light glint sweeping across it. */
const CROWN = [
  "......w......",
  "..w..wlw..w..",
  ".wlw..y..wlw.",
  "..y..yly..y..",
  "..yy.yly.yy..",
  "..ylyylyylyy.",
  ".dyyyyyyyyyd.",
  ".dybywybywyd.",
  ".dyyyyyyyyyd.",
  "..ddddddddd..",
];
const CROWN_INK: Record<string, string> = { y: "#fbbf24", l: "#fef3c7", d: "#b45309", w: "#ffffff", b: "#3b82f6" };
function Crown({ className }: { className: string }) {
  const cells = CROWN.flatMap((row, y) => [...row].map((c, x) => ({ c, x, y })).filter((p) => p.c !== "."));
  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="-0.5 -0.5 14 11" shapeRendering="crispEdges">
        <defs>
          <linearGradient id="tc-crown-glint" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="5" y2="10">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-8 0; 18 0; 18 0" keyTimes="0; .45; 1" dur="2.4s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
        {cells.map((p) => <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1.02" height="1.02" fill={CROWN_INK[p.c]} />)}
        {cells.map((p) => <rect key={`g${p.x}-${p.y}`} x={p.x} y={p.y} width="1.02" height="1.02" fill="url(#tc-crown-glint)" />)}
      </svg>
    </div>
  );
}

function label(rarity: string) {
  return rarity[0].toUpperCase() + rarity.slice(1);
}

/** Small deterministic PRNG so the effect layout is stable across re-renders. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function ChestOpening({ chest, reward, coins, onAgain, onClose, free = false }: {
  chest: ChestRarity;
  /** Null while the server is still rolling the chest. */
  reward: ChestReward | null;
  coins: number;
  /** Omit to hide the second button (e.g. the last unopened reward chest). */
  onAgain?: () => void;
  onClose: () => void;
  /** Reward chest: no price; the second button reads OPEN NEXT. */
  free?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [introDone, setIntroDone] = useState(false);
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rank = reward ? rarityRank(reward.rewardRarity) : 0;
  const character = reward ? characterById(reward.characterId) : null;

  // Act 1: the chest drops in immediately, even before the server has answered.
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const thud = window.setTimeout(() => { if (!reduced) playChestThud(); }, 430);
    const done = window.setTimeout(() => setIntroDone(true), reduced ? 0 : INTRO_MS);
    return () => { window.clearTimeout(thud); window.clearTimeout(done); };
  }, []);

  // Acts 2–6 once the roll is known and the chest has landed.
  useEffect(() => {
    if (!introDone || !reward) return;
    const clear = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
    const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
    if (prefersReducedMotion()) {
      later(() => { setStep(rank); setPhase("reveal"); playChestReveal(rank); }, 0);
      return clear;
    }
    later(() => setPhase("charging"), 0);
    for (let s = 0; s <= rank; s++) later(() => { setStep(s); playChestCharge(s); }, s * STEP_MS);
    const crackAt = (rank + 1) * STEP_MS;
    const burstAt = crackAt + crackMs(rank);
    const riseAt = burstAt + burstMs(rank);
    const revealAt = riseAt + riseMs(rank);
    later(() => { setPhase("crack"); playChestCrack(rank); }, crackAt);
    later(() => { setPhase("burst"); playChestBurst(rank); }, burstAt);
    later(() => { setPhase("rise"); playChestRise(rank); }, riseAt);
    later(() => { setPhase("reveal"); playChestReveal(rank); }, revealAt);
    return clear;
  }, [reward, rank, introDone]);

  useEffect(() => {
    if (phase === "reveal") closeRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && phase === "reveal") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  function skip() {
    if (!reward || phase === "reveal" || phase === "intro" || phase === "waiting") return;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    playChestReveal(rank);
    setStep(rank);
    setPhase("reveal");
  }

  const fx = useMemo(() => {
    const random = seeded(reward ? `${reward.chestRarity}:${reward.characterId}:${reward.rewardRarity}` : chest);
    const colors = TREASURE_CHESTS.slice(0, rank + 1).map((r) => TREASURE_RARITY_COLORS[r]).reverse();
    const count = 18 + rank * 16;
    const spread = 130 + rank * 45;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + random() * 0.5;
      const dist = spread * (0.45 + random() * 0.55);
      return {
        id: i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 40,
        size: 4 + random() * (3 + rank * 1.5),
        delay: random() * 0.15 + (rank >= 4 && i % 2 ? 0.45 : 0),
        dur: 0.8 + random() * 0.6 + rank * 0.1,
        color: rank === 4 ? GOLDS[i % GOLDS.length] : colors[i % Math.min(colors.length, 3)], star: rank >= 2 && i % 3 === 0,
      };
    });
    const orbs: Orb[] = Array.from({ length: 28 }, (_, i) => ({
      id: i, angle: random() * 360, dist: 120 + random() * 110, delay: random() * 1.2, dur: 0.7 + random() * 0.6, size: 3 + random() * 4,
    }));
    const confetti: Confetti[] = Array.from({ length: rank >= 3 ? 30 + rank * 12 : 0 }, (_, i) => ({
      id: i, left: random() * 100, delay: random() * 1.6, dur: 2.2 + random() * 1.8,
      color: rank >= 5 ? ["#fb7185", "#fbbf24", "#4ade80", "#60a5fa", "#c084fc", "#ffffff"][i % 6] : [TREASURE_RARITY_COLORS[TREASURE_CHESTS[rank]], "#ffffff", "#fde68a"][i % 3],
      drift: (random() - 0.5) * 120, spin: 360 + random() * 720,
    }));
    // Legendary+: embers drifting up through the whole scene (gold, or rainbow for Mythic).
    const palette = rank >= 5 ? RAINBOW : GOLDS;
    const embers: Ember[] = Array.from({ length: rank >= 5 ? 36 : rank === 4 ? 18 : 0 }, (_, i) => ({
      id: i, left: random() * 100, delay: random() * 3, dur: 2.4 + random() * 2.6, size: 2 + Math.round(random() * (rank >= 5 ? 4 : 3)),
      drift: (random() - 0.5) * 140, color: palette[i % palette.length],
    }));
    // Mythic: warp streaks bursting outward, meteors over the reveal and glitch bars.
    const streaks: Streak[] = Array.from({ length: rank >= 5 ? 36 : 0 }, (_, i) => ({
      id: i, angle: (i / 36) * 360 + random() * 6, delay: random() * 0.9, len: 60 + random() * 120, color: RAINBOW[i % 5],
    }));
    const meteors: Meteor[] = Array.from({ length: rank >= 5 ? 7 : 0 }, (_, i) => ({
      id: i, top: -10 + random() * 55, left: -20 + random() * 70, delay: i * 0.55 + random() * 0.4, dur: 1.1 + random() * 0.7, color: RAINBOW[i % 5],
    }));
    const bars: Bar[] = Array.from({ length: rank >= 5 ? 8 : 0 }, (_, i) => ({
      id: i, top: random() * 92, height: 1 + random() * 5, delay: random() * 0.6, color: RAINBOW[i % 5],
    }));
    // Legendary: still sparkles that twinkle in place around the reveal card.
    const twinkles: Twinkle[] = rank === 4 ? [[-150, -70], [148, -40], [-132, 92], [140, 110], [-60, -150], [72, 158]].map(([x, y], i) => ({
      id: i, x, y, size: 14 + Math.round(random() * 8), delay: i * 0.37 + random() * 0.2,
    })) : [];
    return { particles, orbs, confetti, embers, streaks, meteors, bars, twinkles };
  }, [reward, rank, chest]);

  // Landed but the server hasn't answered yet.
  const shown: Phase = phase === "intro" && introDone ? "waiting" : phase;
  const glowRarity = TREASURE_CHESTS[Math.min(step, rank)];
  const glow = phase === "intro" || phase === "waiting" ? TREASURE_RARITY_COLORS[chest] : TREASURE_RARITY_COLORS[glowRarity];
  const opened = phase === "burst" || phase === "rise" || phase === "reveal";
  const climbing = phase === "charging" || phase === "crack";
  const canAfford = coins >= CHEST_PRICES[chest];
  const orbCount = phase === "charging" ? Math.min(fx.orbs.length, 8 + step * 4) : phase === "crack" ? fx.orbs.length : 0;
  const style = {
    "--tc-glow": glow,
    "--tc-shake": `${1 + step * 1.1}px`,
    "--tc-rank": rank,
    "--tc-crack-ms": `${crackMs(rank)}ms`,
    "--tc-rise-ms": `${riseMs(rank)}ms`,
  } as CSSProperties;

  // Portal to <body> so the menu panel's clip-path can't crop the full-screen overlay.
  return createPortal(
    <div
      className={`tc-overlay tc-phase-${shown} tc-rank-${opened || phase === "crack" ? rank : 0}${opened && reward ? ` tc-reward-${reward.rewardRarity}` : ""}`}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={`Opening ${label(chest)} chest`}
      onClick={skip}
    >
      <div className="tc-backdrop" />
      <div className="tc-stars" aria-hidden="true" />
      {/* Mythic: the lights go out and reality starts to tear before the lid blows. */}
      {rank >= 5 && (phase === "crack" || phase === "burst") && <div className="tc-blackout" aria-hidden="true" />}
      {rank >= 5 && phase === "crack" && <div className="tc-vortex" aria-hidden="true" />}
      {rank >= 5 && (phase === "crack" || phase === "burst") && (
        <div className="tc-glitch" aria-hidden="true">
          {fx.bars.map((b) => <span key={b.id} style={{ top: `${b.top}%`, height: `${b.height}%`, animationDelay: `${b.delay}s`, "--c": b.color } as CSSProperties} />)}
        </div>
      )}
      {rank >= 4 && (phase === "crack" || opened) && fx.embers.length > 0 && (
        <div className="tc-embers" aria-hidden="true">
          {fx.embers.map((e) => <span key={e.id} style={{ left: `${e.left}%`, width: e.size, height: e.size, background: e.color, color: e.color, animationDelay: `${e.delay}s`, animationDuration: `${e.dur}s`, "--drift": `${e.drift}px` } as CSSProperties} />)}
        </div>
      )}
      {/* Legendary: a royal treasure vault — warm gold light floods the room from the chest. */}
      {rank === 4 && (phase === "crack" || opened) && <div className={`tc-royal-glow tc-royal-${phase}`} aria-hidden="true" />}
      {rank >= 5 && (phase === "burst" || phase === "rise") && (
        <div className="tc-warp" aria-hidden="true">
          {fx.streaks.map((w) => <span key={w.id} style={{ "--a": `${w.angle}deg`, width: w.len, animationDelay: `${w.delay}s`, "--c": w.color } as CSSProperties} />)}
        </div>
      )}
      {rank >= 5 && phase === "reveal" && (
        <div className="tc-meteors" aria-hidden="true">
          {fx.meteors.map((m) => <span key={m.id} style={{ top: `${m.top}%`, left: `${m.left}%`, animationDelay: `${m.delay}s`, animationDuration: `${m.dur}s`, "--c": m.color } as CSSProperties} />)}
        </div>
      )}
      {opened && rank >= 2 && <div className="tc-rays" aria-hidden="true" />}
      {opened && rank >= 5 && <div className="tc-rays tc-rays-reverse" aria-hidden="true" />}
      {phase === "crack" && <div className="tc-vignette" aria-hidden="true" />}
      {phase === "burst" && rank >= 2 && <div className="tc-flash" aria-hidden="true" />}
      {phase === "burst" && rank >= 5 && <div className="tc-whiteout" aria-hidden="true" />}
      {phase === "reveal" && fx.confetti.length > 0 && (
        <div className="tc-confetti" aria-hidden="true">
          {fx.confetti.map((c) => (
            <span key={c.id} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, "--drift": `${c.drift}px`, "--spin": `${c.spin}deg` } as CSSProperties} />
          ))}
        </div>
      )}

      <div className="tc-stage">
        <p className="tc-title">{label(chest)} Chest</p>

        <div className="tc-chest-zone">
          {rank >= 5 && (phase === "crack" || phase === "burst" || phase === "rise") && <Seal className="tc-seal-floor" />}
          {opened && phase !== "reveal" && <div className="tc-beam" aria-hidden="true" />}
          {rank === 4 && (phase === "burst" || phase === "rise") && <Crown className={`tc-crown tc-crown-${phase}`} />}

          {orbCount > 0 && (
            <div className="tc-orbs" aria-hidden="true">
              {fx.orbs.slice(0, orbCount).map((o) => (
                <span key={o.id} style={{ "--a": `${o.angle}deg`, "--d": `${o.dist}px`, width: o.size, height: o.size, animationDelay: `${o.delay}s`, animationDuration: `${o.dur}s` } as CSSProperties} />
              ))}
            </div>
          )}

          {phase === "crack" && (
            <div className="tc-leaks" aria-hidden="true">
              {Array.from({ length: 6 + rank * 2 }, (_, i) => <span key={i} style={{ "--r": `${-80 + (i * 160) / (5 + rank * 2)}deg`, animationDelay: `${(i % 4) * 0.08}s` } as CSSProperties} />)}
            </div>
          )}

          {phase === "burst" && (
            <>
              <div className="tc-ring" aria-hidden="true" />
              {rank >= 5 && <div className="tc-nova" aria-hidden="true" />}
              {rank >= 5 && <div className="tc-nova tc-nova-late" aria-hidden="true" />}
              {rank >= 3 && <div className="tc-ring tc-ring-late" aria-hidden="true" />}
              {rank >= 5 && <div className="tc-ring tc-ring-later" aria-hidden="true" />}
              <div className="tc-particles" aria-hidden="true">
                {fx.particles.map((p) => (
                  <span
                    key={p.id}
                    className={p.star ? "tc-particle tc-star" : "tc-particle"}
                    style={{
                      "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, width: p.size, height: p.size,
                      background: p.color, color: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
                    } as CSSProperties}
                  />
                ))}
              </div>
            </>
          )}

          {phase !== "reveal" && (
            <div className={`tc-chest${opened ? " is-open" : ""}`}>
              <PixelChest chest={chest} glow={glow} size={176} />
            </div>
          )}

          {phase === "rise" && reward && (
            <div className="tc-silhouette" aria-hidden="true">
              <CharacterPortrait characterId={reward.characterId} size={140} className="brightness-0" />
              <span className="tc-question">?</span>
            </div>
          )}

          {phase === "reveal" && reward && character && (
            <div className="tc-card" role="status" aria-live="polite">
              {rank === 4 && <Crown className="tc-crown tc-crown-card" />}
              {fx.twinkles.length > 0 && (
                <div className="tc-twinkles" aria-hidden="true">
                  {fx.twinkles.map((tw) => <span key={tw.id} style={{ left: tw.x, top: tw.y, width: tw.size, height: tw.size, animationDelay: `${tw.delay}s` } as CSSProperties} />)}
                </div>
              )}
              <div className="tc-portrait"><CharacterPortrait characterId={reward.characterId} size={140} /></div>
              <p className="tc-rarity">{rank >= 5 ? "✦ Mythic ✦" : label(reward.rewardRarity)}</p>
              <p className="tc-name">{reward.characterName}</p>
              <p className="tc-epithet">{character.epithet}</p>
              <p className={reward.duplicateCoins ? "tc-dupe" : "tc-new"}>
                {reward.duplicateCoins
                  ? <>Already in your crew · <BerryMark size={14} /> +{reward.duplicateCoins} {free ? "berries" : "berries refunded"}</>
                  : "NEW RECRUIT · now playable"}
              </p>
            </div>
          )}
        </div>

        {phase === "burst" && reward && BANNERS[reward.rewardRarity] && (
          <p className="tc-banner">
            {rank >= 5
              ? [...BANNERS[reward.rewardRarity]!].map((ch, i) => <span key={i} className="tc-letter" style={{ animationDelay: `${i * 0.08}s, ${i * 0.08}s`, "--i": i } as CSSProperties}>{ch}</span>)
              : BANNERS[reward.rewardRarity]}
          </p>
        )}

        {(climbing || phase === "burst") && (
          <div className="tc-gems" aria-hidden="true">
            {TREASURE_CHESTS.map((tier, i) => (
              <span key={tier} className={i <= step ? (i === step ? "is-lit is-current" : "is-lit") : ""}
                style={{ "--gem": TREASURE_RARITY_COLORS[tier] } as CSSProperties} />
            ))}
          </div>
        )}

        {(shown === "intro" || shown === "waiting") && <p className="tc-hint">Unlocking…</p>}
        {climbing && (
          <>
            <p className="tc-climb" key={phase === "crack" ? "crack" : glowRarity}>{phase === "crack" ? (rank >= 3 ? "Something powerful stirs…" : "It's opening…") : `${label(glowRarity)}…`}</p>
            <p className="tc-hint">Tap to skip</p>
          </>
        )}
        {phase === "rise" && reward && <p className="tc-climb tc-rise-text">A {label(reward.rewardRarity)} recruit appears…</p>}

        {phase === "reveal" && (
          <div className="tc-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ts-btn ts-btn-muted" ref={closeRef} onClick={() => { playClick(); onClose(); }}>
              COLLECT
            </button>
            {onAgain && (free ? (
              <button type="button" className="ts-btn ts-btn-gold" onClick={onAgain}>OPEN NEXT CHEST ▸</button>
            ) : (
              <button type="button" className="ts-btn ts-btn-gold" disabled={!canAfford} onClick={onAgain}>
                {canAfford ? <>OPEN ANOTHER · <BerryMark size={14} /> {CHEST_PRICES[chest]}</> : `NEED ${CHEST_PRICES[chest] - coins} MORE BERRIES`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
