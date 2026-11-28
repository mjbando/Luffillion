import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, achievementUnlocks, archiveRuns, checkpoints, coinLedger, runs } from "@/db/schema";
import { BOUNTY_ACHIEVEMENTS, evaluateAchievements, type AchievementReport, type RunLike } from "./achievements";
import { creditCoins } from "./currency-server";
import { todayKey } from "./daily";
import { RequestProblem } from "./account-server";
import { UPDATE_LIVE } from "./release";

type AchievementDB = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Called with the captain row locked by the caller's transaction. */
export async function evaluateAchievementsFor(tx: AchievementDB, accountId: string): Promise<AchievementReport> {
  const today = todayKey();
  const rows: RunLike[] = await tx.select({ dayKey: runs.dayKey, score: runs.score, solved: runs.solved,
    niche: runs.niche, mistakes: runs.mistakes, legs: runs.legs,
  }).from(runs).where(and(eq(runs.accountId, accountId), lte(runs.dayKey, today)));
  const active = await tx.select({ progress: checkpoints.progress }).from(checkpoints)
    .where(and(eq(checkpoints.accountId, accountId), lte(checkpoints.dayKey, today)));
  // Archive replays exist only once the treasure update (and its migration) is live.
  const archived: RunLike[] = UPDATE_LIVE ? await tx.select({ dayKey: archiveRuns.dayKey, score: archiveRuns.score, solved: archiveRuns.solved,
    niche: archiveRuns.niche, mistakes: archiveRuns.mistakes, legs: archiveRuns.legs,
  }).from(archiveRuns).where(eq(archiveRuns.accountId, accountId)) : [];
  const unlocked = await tx.select({ id: achievementUnlocks.achievementId, at: achievementUnlocks.unlockedAt })
    .from(achievementUnlocks).where(eq(achievementUnlocks.accountId, accountId));
  const existing = new Map(unlocked.map(u => [u.id, u.at]));

  // A rank at submission is provisional. Use the actual scores of ALL players
  // for that daily challenge once its Eastern calendar day has ended.
  const days = [...new Set(rows.map(r => r.dayKey).filter(day => day < today))];
  const scores = days.length ? await tx.select({ day: runs.dayKey, score: runs.score, count: sql<number>`count(*)::int` })
    .from(runs).where(inArray(runs.dayKey, days)).groupBy(runs.dayKey, runs.score) : [];
  const byDay = new Map<string, typeof scores>();
  for (const score of scores) {
    const buckets = byDay.get(score.day) ?? [];
    buckets.push(score);
    byDay.set(score.day, buckets);
  }
  for (const row of rows) {
    const buckets = byDay.get(row.dayKey) ?? [];
    row.standing = {
      finalized: row.dayKey < today,
      others: Math.max(0, buckets.reduce((n, b) => n + b.count, 0) - 1),
      beaten: buckets.reduce((n, b) => n + (b.score < row.score ? b.count : 0), 0),
      rank: 1 + buckets.reduce((n, b) => n + (b.score > row.score ? b.count : 0), 0),
    };
  }

  const report = evaluateAchievements(rows, existing, active.map(a => a.progress), archived);
  const inserted = report.newlyUnlocked.length ? await tx.insert(achievementUnlocks)
    .values(report.newlyUnlocked.map(id => ({ accountId, achievementId: id })))
    .onConflictDoNothing().returning({ id: achievementUnlocks.achievementId, at: achievementUnlocks.unlockedAt }) : [];
  for (const row of inserted) existing.set(row.id, row.at);
  const result = evaluateAchievements(rows, existing, active.map(a => a.progress), archived);
  // Each earned achievement's berries can be claimed once (including ones earned before the update).
  const claimed = UPDATE_LIVE ? new Set((await tx.select({ ref: coinLedger.ref }).from(coinLedger)
    .where(and(eq(coinLedger.accountId, accountId), eq(coinLedger.source, VOYAGE_BADGE_SOURCE)))).map(row => row.ref)) : new Set<string>();
  const achievements = result.achievements.map(a => UPDATE_LIVE
    ? { ...a, claimed: claimed.has(a.id), claimable: a.unlocked && !!a.berries && !claimed.has(a.id) }
    : a);
  return { achievements, newlyUnlocked: inserted.map(row => row.id) };
}

/** coin_ledger source for Daily Voyage achievement rewards (ref = achievement id). */
export const VOYAGE_BADGE_SOURCE = "voyage-badge" as const;

/**
 * Claim a Daily Voyage achievement's berries (once). Works for achievements earned before the
 * update too: the captain keeps the character it gave them and the new id is recorded.
 */
export async function claimVoyageAchievement(accountId: string, id: unknown): Promise<AchievementReport & { paid: number }> {
  const def = BOUNTY_ACHIEVEMENTS.find((a) => a.id === id);
  if (!UPDATE_LIVE || !def?.berries) throw new RequestProblem(400, "There's nothing to claim for that achievement.");
  return db.transaction(async tx => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    const before = await evaluateAchievementsFor(tx, accountId);
    if (!before.achievements.find((a) => a.id === def.id)?.unlocked) throw new RequestProblem(403, "Earn this achievement first.");
    await tx.insert(achievementUnlocks).values({ accountId, achievementId: def.id }).onConflictDoNothing();
    const paid = await creditCoins(tx, accountId, { source: VOYAGE_BADGE_SOURCE, ref: def.id, amount: def.berries! });
    return { ...await evaluateAchievementsFor(tx, accountId), paid };
  });
}

// Opening the collection also backfills eligible old voyages and finalized leaderboards.
export async function loadAchievements(accountId: string): Promise<AchievementReport> {
  return db.transaction(async tx => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    return evaluateAchievementsFor(tx, accountId);
  });
}
