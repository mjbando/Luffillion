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
  { id: "platinum", name: "Platinum", min: 1000, nextMin: 2000, color: "#5eead4", badge: "bg-teal-400/20 text-teal-100 ring-teal-300/70", border: "border-teal-300/70" },
  { id: "diamond", name: "Diamond", min: 2000, nextMin: 3000, color: "#60a5fa", badge: "bg-sky-400/20 text-sky-100 ring-sky-300/70", border: "border-sky-300/70" },
  { id: "champion", name: "Champion", min: 3000, nextMin: 5000, color: "#e879f9", badge: "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-300/70", border: "border-fuchsia-400/70" },
  { id: "legend", name: "Legend", min: 5000, nextMin: null, color: "#fb7185", badge: "bg-gradient-to-r from-amber-300 via-rose-400 to-fuchsia-400 text-slate-950 ring-amber-200", border: "border-rose-400" },
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
  /** Bounty earned in this battle (wins only; bounty never goes down). */
  bountyGain?: number;
}

// ---------- Season ----------
/**
 * Ranked Season 1 runs 30 days: Sat Nov 28, 2026 2:00 PM EST to Mon Dec 28, 2026 2:00 PM EST.
 * When it ends the leaderboard freezes and no new ranked (or bot) battles can start; friendly
 * battles still work. Resets and rewards for Season 2 are decided separately.
 */
export const RANKED_SEASON = {
  number: 1,
  startsAt: Date.parse("2026-11-28T19:00:00Z"),
  endsAt: Date.parse("2026-12-28T19:00:00Z"),
} as const;

export function rankedSeasonOver(now: number = Date.now()): boolean {
  return now >= RANKED_SEASON.endsAt;
}

export const RANKED_SEASON_OVER_MESSAGE = `Season ${RANKED_SEASON.number} has ended. Ranked battles are closed until Season ${RANKED_SEASON.number + 1}.`;

// ---------- Bounty (Season 1) ----------
// Bounty only comes from winning ranked battles (bot battles included) and never goes down.
/** How many captains the ranked leaderboard (and the "#N Ranked" tags) covers. */
export const LEADERBOARD_SIZE = 25;

export const BOUNTY_PER_WIN = 10_000;
/** Extra bounty for winning without losing a single life. */
export const BOUNTY_FLAWLESS_BONUS = 5_000;
/** Beating an opponent one rank tier above you. */
export const BOUNTY_UPSET_ONE = 50_000;
/** Beating an opponent two or more rank tiers above you. */
export const BOUNTY_UPSET_TWO = 100_000;

/** Bounty for a ranked win, from both captains' RP when the battle started. */
export function rankedBountyGain(myPoints: number, opponentPoints: number, flawless: boolean): number {
  const gap = rankIndexFor(opponentPoints) - rankIndexFor(myPoints);
  const base = gap >= 2 ? BOUNTY_UPSET_TWO : gap === 1 ? BOUNTY_UPSET_ONE : BOUNTY_PER_WIN;
  return base + (flawless ? BOUNTY_FLAWLESS_BONUS : 0);
}

/** Titles are earned only through bounty, i.e. only in Ranked. */
export const BASE_TITLE = "Aspiring Pirate";
export const BOUNTY_TITLES: readonly { bounty: number; title: string }[] = [
  { bounty: 50_000, title: "Rookie Pirate" },
  { bounty: 250_000, title: "Notorious Pirate" },
  { bounty: 500_000, title: "Supernova" },
  { bounty: 1_000_000, title: "Commander" },
  { bounty: 2_000_000, title: "Warlord" },
  { bounty: 5_000_000, title: "Yonko" },
];
export function bountyTitle(bounty: number): string {
  return [...BOUNTY_TITLES].reverse().find((t) => bounty >= t.bounty)?.title ?? BASE_TITLE;
}
export function nextBountyTitle(bounty: number) {
  return BOUNTY_TITLES.find((t) => t.bounty > bounty) ?? null;
}
/**
 * How prestigious a title is: 0 for the base title, then 1 (Rookie Pirate) up to 6 (Yonko).
 * Titles look flashier the harder they are to earn.
 */
export function titleLevel(title: string | null | undefined): number {
  if (!title) return 0;
  const i = BOUNTY_TITLES.findIndex((t) => t.title === title);
  return i + 1;
}
/** CSS classes (see ranked.css) that style a title by how hard it is to earn. */
export function titleClass(title: string | null | undefined): string {
  return `rk-title rk-title-${titleLevel(title)}`;
}

// ---------- Practice bot difficulty ----------
/**
 * 0 (easiest) to 0.95 (hardest). Climbs with your rank tier and with every win in your
 * current streak: a Bronze captain on a 2-win streak should usually win, while a 10-win
 * streak makes the bot a real fight. Higher ranks start harder.
 */
export function botDifficulty(points: number, winStreak: number): number {
  return Math.max(0, Math.min(0.95, 0.06 + rankIndexFor(points) * 0.1 + Math.max(0, winStreak) * 0.045));
}
/** How a bot of difficulty `d` plays: answer chances, how niche its picks are, and how fast it answers. */
export function botStyle(d: number) {
  const mix = (a: number, b: number) => a + (b - a) * d;
  return {
    answerChance: mix(0.85, 0.99),
    showdownChance: mix(0.74, 0.98),
    weights: {
      common: mix(58, 12), uncommon: mix(27, 22), rare: mix(11, 32), epic: mix(3.5, 26), luffillion: mix(0.5, 8),
    } as Record<Tier, number>,
    /** Earliest answer (ms after the round opens) and how far into the round answers spread. */
    minDelayMs: Math.round(mix(2600, 1300)),
    spread: mix(1, 0.45),
    /** Exponent > 1 skews answers toward the start of the window. */
    skew: mix(1, 2.6),
  };
}

/** Ranked matchmaking only pairs captains at most this many rank tiers apart. */
export const RANKED_MAX_TIER_GAP = 2;

/** Typical swings against an evenly matched opponent (same rank, same RP). */
export const RP_EVEN_WIN = 30;
export const RP_EVEN_LOSS = 20;
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
 *  - Loss: 20 * 2^(-0.75g) losing to a weaker captain hurts (up to -80), losing to a stronger one barely (min -4)
 *          Same rank: stays near -20, nudged by the RP gap (see sameRankLoss).
 *  - Draw: 10 * 2^(0.5g)   holding a stronger captain to a draw is worth more
 */
export function baseRankDelta(playerPoints: number, opponentPoints: number, outcome: "win" | "loss" | "draw"): number {
  if (outcome === "loss" && rankIndexFor(playerPoints) === rankIndexFor(opponentPoints)) return -sameRankLoss(playerPoints, opponentPoints);
  const g = strengthGap(playerPoints, opponentPoints);
  if (outcome === "win") return Math.max(8, Math.min(100, Math.round(RP_EVEN_WIN * 2 ** (0.6 * g))));
  if (outcome === "loss") return -Math.max(4, Math.min(80, Math.round(RP_EVEN_LOSS * 2 ** (-0.75 * g))));
  return Math.max(3, Math.min(25, Math.round(RP_EVEN_DRAW * 2 ** (0.5 * g))));
}

/** Same-rank losses stay close to the even -20: 1 RP more or less per 50 RP of gap, between -12 and -28. */
export const SAME_RANK_LOSS_MIN = 12;
export const SAME_RANK_LOSS_MAX = 28;
export function sameRankLoss(playerPoints: number, opponentPoints: number): number {
  const gap = Math.max(0, playerPoints) - Math.max(0, opponentPoints); // > 0: lost to a lower-RP captain
  return Math.max(SAME_RANK_LOSS_MIN, Math.min(SAME_RANK_LOSS_MAX, Math.round(RP_EVEN_LOSS + gap / 50)));
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

/** Bot battles (offered when matchmaking is slow) pay this share of the normal RP. */
export const BOT_RP_FACTOR = 0.5;

/**
 * Bot battle RP: half of an even-match result (win +15, loss -10, draw +5), with no streak bonus.
 * Bot battles do count for the win streak (wins extend it, losses reset it); the bot gets
 * harder with every win in the streak, so it can't be farmed.
 */
export function computeBotDelta(playerPoints: number, streak: number, outcome: "win" | "loss" | "draw"): PlayerDeltaBreakdown {
  const oldRp = Math.max(0, playerPoints);
  const baseDelta = Math.round(baseRankDelta(oldRp, oldRp, outcome) * BOT_RP_FACTOR);
  const newPoints = Math.max(0, oldRp + baseDelta);
  return {
    oldPoints: oldRp,
    newPoints,
    delta: newPoints - oldRp,
    baseDelta,
    streakBonus: 0,
    oldStreak: streak,
    newStreak: outcome === "win" ? streak + 1 : outcome === "loss" ? 0 : streak,
    oldTier: rankTierFor(oldRp).id,
    newTier: rankTierFor(newPoints).id,
  };
}
