import type { Tier } from "@/data/tiers";

export const RANKED_SECONDS = 10;
export const RANKED_STARTING_LIVES = 3;
/** Regulation rounds. After these, every round is an overtime Showdown until a knockout. */
export const RANKED_MAX_ROUNDS = 12;
/** Safety stop for endless Showdown ties; only then is a match decided on lives. */
export const RANKED_ROUND_CAP = 30;
export const RANKED_INTRO_MS = 5000;
export const RANKED_REVEAL_MS = 3200;
/** Rounds in a row where both players answer before the next round becomes a Showdown. */
export const RANKED_SHOWDOWN_STREAK = 5;
/** Showdown reveals linger a little longer so the face-off can play out. */
export const RANKED_SHOWDOWN_REVEAL_MS = 4200;

export const RANKED_TIER_BONUS_SECONDS: Record<Tier, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  luffillion: 5,
};

export interface RankTierInfo {
  id: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion" | "legend";
  name: string;
  min: number;
  nextMin: number | null;
  color: string;
  badge: string;
  border: string;
}

export const RANK_TIERS: RankTierInfo[] = [
  { id: "bronze", name: "Bronze", min: 0, nextMin: 250, color: "#cd7f32", badge: "bg-amber-900/40 text-amber-200 ring-amber-600/60", border: "border-amber-700/60" },
  { id: "silver", name: "Silver", min: 250, nextMin: 500, color: "#cbd5e1", badge: "bg-slate-400/20 text-slate-100 ring-slate-300/60", border: "border-slate-300/60" },
  { id: "gold", name: "Gold", min: 500, nextMin: 1000, color: "#ffd700", badge: "bg-yellow-400/20 text-yellow-200 ring-yellow-300/70", border: "border-yellow-300/70" },
  { id: "platinum", name: "Platinum", min: 1000, nextMin: 1500, color: "#5eead4", badge: "bg-teal-400/20 text-teal-100 ring-teal-300/70", border: "border-teal-300/70" },
  { id: "diamond", name: "Diamond", min: 1500, nextMin: 2000, color: "#60a5fa", badge: "bg-sky-400/20 text-sky-100 ring-sky-300/70", border: "border-sky-300/70" },
  { id: "champion", name: "Champion", min: 2000, nextMin: 3000, color: "#e879f9", badge: "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-300/70", border: "border-fuchsia-400/70" },
  { id: "legend", name: "Legend", min: 3000, nextMin: null, color: "#fb7185", badge: "bg-gradient-to-r from-amber-300 via-rose-400 to-fuchsia-400 text-slate-950 ring-amber-200", border: "border-rose-400" },
];

export function rankIndexFor(points: number): number {
  const safe = Math.max(0, points);
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (safe >= RANK_TIERS[i].min) idx = i;
  }
  return idx;
}

export function rankTierFor(points: number): RankTierInfo {
  return RANK_TIERS[rankIndexFor(points)];
}

export function streakBonusFor(winStreak: number): number {
  if (winStreak >= 10) return 50;
  if (winStreak >= 5) return 20;
  if (winStreak >= 3) return 10;
  return 0;
}

export interface PlayerDeltaBreakdown {
  oldPoints: number;
  newPoints: number;
  delta: number;
  baseDelta: number;
  streakBonus: number;
  oldStreak: number;
  newStreak: number;
  oldTier: RankTierInfo["id"];
  newTier: RankTierInfo["id"];
}

/** Ranked matchmaking only pairs captains at most this many rank tiers apart. */
export const RANKED_MAX_TIER_GAP = 2;

/** Typical swings against an evenly matched opponent (same rank, same RP). */
export const RP_EVEN_WIN = 30;
export const RP_EVEN_LOSS = 15;
export const RP_EVEN_DRAW = 10;

/**
 * How much stronger the opponent is, in "rank tiers": each tier of difference
 * counts 0.8, and every 400 RP of difference adds another 1.0 on top, so both
 * rank and RP matter. Positive = opponent is stronger. Clamped to +/-3.
 */
export function strengthGap(playerPoints: number, opponentPoints: number): number {
  const self = Math.max(0, playerPoints);
  const opp = Math.max(0, opponentPoints);
  const tierGap = rankIndexFor(opp) - rankIndexFor(self);
  const gap = tierGap * 0.8 + (opp - self) / 400;
  return Math.max(-3, Math.min(3, gap));
}

/**
 * Base RP change before streak bonuses. Everything scales smoothly with the
 * strength gap g:
 *  - Win:  30 * 2^(0.6g)   upsets pay big (2 ranks up is about +70 to +100), easy wins pay little (min +8)
 *  - Loss: 15 * 2^(-0.75g) losing to a weaker captain hurts (up to -60), losing to a stronger one barely (min -3)
 *  - Draw: 10 * 2^(0.5g)   holding a stronger captain to a draw is worth more
 */
export function baseRankDelta(playerPoints: number, opponentPoints: number, outcome: "win" | "loss" | "draw"): number {
  const g = strengthGap(playerPoints, opponentPoints);
  if (outcome === "win") return Math.max(8, Math.min(100, Math.round(RP_EVEN_WIN * 2 ** (0.6 * g))));
  if (outcome === "loss") return -Math.max(3, Math.min(60, Math.round(RP_EVEN_LOSS * 2 ** (-0.75 * g))));
  return Math.max(3, Math.min(25, Math.round(RP_EVEN_DRAW * 2 ** (0.5 * g))));
}

export function computeSingleDelta(
  playerPoints: number,
  opponentPoints: number,
  oldStreak: number,
  outcome: "win" | "loss" | "draw",
): PlayerDeltaBreakdown {
  const oldRp = Math.max(0, playerPoints);
  const baseDelta = baseRankDelta(oldRp, opponentPoints, outcome);
  let streakBonus = 0;
  let newStreak = oldStreak;
  if (outcome === "win") {
    newStreak = oldStreak + 1;
    streakBonus = streakBonusFor(newStreak);
  } else if (outcome === "loss") {
    newStreak = 0;
  }

  const newPoints = Math.max(0, oldRp + baseDelta + streakBonus); // Floor at 0
  return {
    oldPoints: oldRp,
    newPoints,
    delta: newPoints - oldRp,
    baseDelta,
    streakBonus,
    oldStreak,
    newStreak,
    oldTier: rankTierFor(oldRp).id,
    newTier: rankTierFor(newPoints).id,
  };
}
