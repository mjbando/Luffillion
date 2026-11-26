"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Coins } from "lucide-react";
import CharacterPortrait from "./CharacterPortrait";
import PixelChest from "./PixelChest";
import type { CharacterId } from "@/data/playable-characters";
import { CHEST_PRICES, TREASURE_CHESTS, TREASURE_RARITY_COLORS, rarityRank, type ChestRarity, type TreasureRarity } from "@/lib/treasure";
import { playChestBurst, playChestCharge, playClick } from "@/lib/sound";

export interface ChestReward {
  chestRarity: ChestRarity;
  rewardRarity: TreasureRarity;
  characterId: CharacterId;
  characterName: string;
  duplicateCoins: number;
  cost: number;
}

type Phase = "waiting" | "charging" | "burst" | "reveal";

// How long each part of the reveal lasts. Rarer pulls charge longer and burst bigger.
const STEP_MS = 520;
const burstMs = (rank: number) => 650 + rank * 170;

const BANNERS: Partial<Record<TreasureRarity, string>> = {
  epic: "EPIC!",
  legendary: "LEGENDARY!",
  mythic: "MYTHIC!!",
};

interface Particle { id: number; dx: number; dy: number; size: number; delay: number; dur: number; color: string; star: boolean }

function label(rarity: string) {
  return rarity[0].toUpperCase() + rarity.slice(1);
}

/** Small deterministic PRNG so the particle layout is stable across re-renders. */
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

export default function ChestOpening({ chest, reward, coins, onAgain, onClose }: {
  chest: ChestRarity;
  /** Null while the server is still rolling the chest. */
  reward: ChestReward | null;
  coins: number;
  onAgain: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rank = reward ? rarityRank(reward.rewardRarity) : 0;

  // Drive the sequence: climb the glow one rarity at a time, burst, then reveal.
  useEffect(() => {
    if (!reward) return;
    const clear = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
    const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
    if (prefersReducedMotion()) {
      later(() => { setStep(rank); setPhase("reveal"); playChestBurst(rank); }, 0);
      return clear;
    }
    later(() => setPhase("charging"), 0);
    for (let s = 0; s <= rank; s++) {
      later(() => { setStep(s); playChestCharge(s); }, s * STEP_MS);
    }
    const burstAt = (rank + 1) * STEP_MS;
    later(() => { setPhase("burst"); playChestBurst(rank); }, burstAt);
    later(() => setPhase("reveal"), burstAt + burstMs(rank));
    return clear;
  }, [reward, rank]);

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
    if (!reward || phase === "reveal" || phase === "waiting") return;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (phase === "charging") playChestBurst(rank);
    setStep(rank);
    setPhase("reveal");
  }

  const particles = useMemo<Particle[]>(() => {
    if (!reward) return [];
    const random = seeded(`${reward.chestRarity}:${reward.characterId}:${reward.rewardRarity}`);
    const colors = TREASURE_CHESTS.slice(0, rank + 1).map((r) => TREASURE_RARITY_COLORS[r]).reverse();
    const count = 14 + rank * 14;
    const spread = 120 + rank * 45;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + random() * 0.5;
      const dist = spread * (0.45 + random() * 0.55);
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 40,
        size: 4 + random() * (3 + rank * 1.5),
        delay: random() * 0.15 + (rank >= 5 && i % 2 ? 0.45 : 0),
        dur: 0.7 + random() * 0.6 + rank * 0.08,
        color: colors[i % Math.min(colors.length, 3)],
        star: rank >= 3 && i % 3 === 0,
      };
    });
  }, [reward, rank]);

  const glowRarity = TREASURE_CHESTS[Math.min(step, rank)];
  const glow = phase === "waiting" ? TREASURE_RARITY_COLORS[chest] : TREASURE_RARITY_COLORS[glowRarity];
  const opened = phase === "burst" || phase === "reveal";
  const canAfford = coins >= CHEST_PRICES[chest];
  const style = {
    "--tc-glow": glow,
    "--tc-shake": `${1 + step * 1.1}px`,
    "--tc-rank": rank,
    "--tc-burst-ms": `${reward ? burstMs(rank) : 800}ms`,
  } as CSSProperties;

  // Portal to <body> so the menu panel's clip-path can't crop the full-screen overlay.
  return createPortal(
    <div
      className={`tc-overlay tc-phase-${phase} tc-rank-${opened ? rank : 0}${opened && reward ? ` tc-reward-${reward.rewardRarity}` : ""}`}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={`Opening ${label(chest)} chest`}
      onClick={skip}
    >
      <div className="tc-backdrop" />
      {opened && rank >= 2 && <div className="tc-rays" aria-hidden="true" />}
      {phase === "burst" && rank >= 3 && <div className="tc-flash" aria-hidden="true" />}

      <div className="tc-stage">
        <p className="tc-title">{label(chest)} Chest</p>

        <div className="tc-chest-zone">
          {opened && <div className="tc-beam" aria-hidden="true" />}
          {phase === "burst" && (
            <>
              <div className="tc-ring" aria-hidden="true" />
              {rank >= 4 && <div className="tc-ring tc-ring-late" aria-hidden="true" />}
              <div className="tc-particles" aria-hidden="true">
                {particles.map((p) => (
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

          {phase === "reveal" && reward && (
            <div className="tc-card" role="status" aria-live="polite">
              <div className="tc-portrait"><CharacterPortrait characterId={reward.characterId} size={132} /></div>
              <p className="tc-rarity">{label(reward.rewardRarity)}</p>
              <p className="tc-name">{reward.characterName}</p>
              <p className={reward.duplicateCoins ? "tc-dupe" : "tc-new"}>
                {reward.duplicateCoins
                  ? <>Already in your crew · <Coins size={14} aria-hidden="true" /> +{reward.duplicateCoins} refunded</>
                  : "NEW RECRUIT · now playable"}
              </p>
            </div>
          )}
        </div>

        {phase === "burst" && BANNERS[reward?.rewardRarity ?? "common"] && (
          <p className="tc-banner">{BANNERS[reward!.rewardRarity]}</p>
        )}

        {phase === "waiting" && <p className="tc-hint">Unlocking…</p>}
        {phase === "charging" && (
          <>
            <p className="tc-climb" key={glowRarity}>{label(glowRarity)}…</p>
            <p className="tc-hint">Tap to skip</p>
          </>
        )}

        {phase === "reveal" && (
          <div className="tc-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ts-btn ts-btn-muted" ref={closeRef} onClick={() => { playClick(); onClose(); }}>
              COLLECT
            </button>
            <button type="button" className="ts-btn ts-btn-gold" disabled={!canAfford} onClick={onAgain}>
              {canAfford ? <>OPEN ANOTHER · <Coins size={14} aria-hidden="true" /> {CHEST_PRICES[chest]}</> : `NEED ${CHEST_PRICES[chest] - coins} MORE`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
