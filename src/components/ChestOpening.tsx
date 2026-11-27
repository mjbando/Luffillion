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
interface Bolt { id: number; points: string; delay: number; left: number }

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
        color: colors[i % Math.min(colors.length, 3)], star: rank >= 2 && i % 3 === 0,
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
    const bolts: Bolt[] = Array.from({ length: rank >= 5 ? 5 : rank >= 4 ? 2 : 0 }, (_, i) => {
      let x = 20 + random() * 20;
      const pts = [`${x},0`];
      for (let y = 12; y <= 100; y += 12) { x += (random() - 0.5) * 22; pts.push(`${x.toFixed(1)},${y}`); }
      return { id: i, points: pts.join(" "), delay: i * 0.22 + random() * 0.1, left: 5 + (i * 90) / Math.max(1, (rank >= 5 ? 5 : 2) - 1) - 25 + random() * 10 };
    });
    return { particles, orbs, confetti, bolts };
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
      {opened && rank >= 2 && <div className="tc-rays" aria-hidden="true" />}
      {opened && rank >= 5 && <div className="tc-rays tc-rays-reverse" aria-hidden="true" />}
      {phase === "crack" && <div className="tc-vignette" aria-hidden="true" />}
      {phase === "burst" && rank >= 2 && <div className="tc-flash" aria-hidden="true" />}
      {(phase === "rise" || phase === "burst") && fx.bolts.map((b) => (
        <svg key={b.id} className="tc-bolt" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true"
          style={{ left: `${b.left}%`, animationDelay: `${b.delay}s` }}>
          <polyline points={b.points} />
        </svg>
      ))}
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
          {opened && phase !== "reveal" && <div className="tc-beam" aria-hidden="true" />}

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
              {rank >= 4 && <div className="tc-card-halo" aria-hidden="true" />}
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
          <p className="tc-banner">{BANNERS[reward.rewardRarity]}</p>
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
