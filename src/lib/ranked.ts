export const RANKED_SECONDS = 10;
export const RANKED_STARTING_LIVES = 3;
// Best-of-3: each ranked match is exactly three questions.
export const RANKED_MAX_ROUNDS = 3;
export const RANKED_INTRO_MS = 2800;
export const RANKED_REVEAL_MS = 3200;

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

export function computeSingleDelta(
  playerPoints: number,
  opponentPoints: number,
  oldStreak: number,
  outcome: "win" | "loss" | "draw",
): PlayerDeltaBreakdown {
  const oldRp = Math.max(0, playerPoints);
  const oppRp = Math.max(0, opponentPoints);
  const gap = oppRp - oldRp; // positive = opponent is higher rated
  const tierGap = rankIndexFor(oppRp) - rankIndexFor(oldRp);

  let baseDelta = 0;
  let streakBonus = 0;
  let newStreak = oldStreak;

  if (outcome === "win") {
    newStreak = oldStreak + 1;
    if (gap >= 0) {
      // Beating same rank = +30; beating higher rank scales smoothly up to +75
      baseDelta = 30 + Math.round(Math.min(45, gap / 40 + Math.max(0, tierGap) * 4));
    } else {
      // Beating a much lower-ranked opponent still awards +12 to +30
      baseDelta = Math.max(12, 30 - Math.round(Math.min(18, Math.abs(gap) / 100)));
    }
    streakBonus = streakBonusFor(newStreak);
  } else if (outcome === "loss") {
    newStreak = 0;
    if (gap <= 0) {
      // Losing to same rank = -15; losing to a lower-ranked opponent loses more (up to -45)
      baseDelta = -15 - Math.round(Math.min(30, Math.abs(gap) / 50 + Math.max(0, -tierGap) * 4));
    } else {
      // Losing to a higher-ranked opponent softens the penalty (down to -5)
      baseDelta = -Math.max(5, 15 - Math.round(Math.min(10, gap / 150)));
    }
  } else {
    // Draw = +10; streak stays intact without triggering a win-streak bonus
    baseDelta = 10;
    streakBonus = 0;
  }

  const rawNext = oldRp + baseDelta + streakBonus;
  const newPoints = Math.max(0, rawNext); // Floor at 0 — players at 0 never go negative
  const delta = newPoints - oldRp;

  return {
    oldPoints: oldRp,
    newPoints,
    delta,
    baseDelta,
    streakBonus,
    oldStreak,
    newStreak,
    oldTier: rankTierFor(oldRp).id,
    newTier: rankTierFor(newPoints).id,
  };
}
