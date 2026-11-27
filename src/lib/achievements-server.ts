import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, achievementUnlocks, checkpoints, runs } from "@/db/schema";
import { achievementBounty, BOUNTY_ACHIEVEMENTS, evaluateAchievements, type AchievementReport, type RunLike } from "./achievements";
import { todayKey } from "./daily";

type AchievementDB = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Called with the captain row locked by the caller's transaction. */
export async function evaluateAchievementsFor(tx: AchievementDB, accountId: string): Promise<AchievementReport> {
  const today = todayKey();
  const rows: RunLike[] = await tx.select({ dayKey: runs.dayKey, score: runs.score, solved: runs.solved,
    niche: runs.niche, mistakes: runs.mistakes, legs: runs.legs,
  }).from(runs).where(and(eq(runs.accountId, accountId), lte(runs.dayKey, today)));
  const active = await tx.select({ progress: checkpoints.progress }).from(checkpoints)
    .where(and(eq(checkpoints.accountId, accountId), lte(checkpoints.dayKey, today)));
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

  const report = evaluateAchievements(rows, existing, active.map(a => a.progress));
  const inserted = report.newlyUnlocked.length ? await tx.insert(achievementUnlocks)
    .values(report.newlyUnlocked.map(id => ({ accountId, achievementId: id })))
    .onConflictDoNothing().returning({ id: achievementUnlocks.achievementId, at: achievementUnlocks.unlockedAt }) : [];
  for (const row of inserted) existing.set(row.id, row.at);
  const result = evaluateAchievements(rows, existing, active.map(a => a.progress));
  return { ...result, newlyUnlocked: inserted.map(row => row.id) };
}

// Opening the collection also backfills eligible old voyages and finalized leaderboards.
export async function loadAchievements(accountId: string): Promise<AchievementReport> {
  return db.transaction(async tx => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    return evaluateAchievementsFor(tx, accountId);
  });
}

type Reader = Pick<typeof db, "select">;

/** Treasure update: a captain's bounty is the sum paid by every achievement they've earned. */
export async function achievementBountyFor(reader: Reader, accountId: string): Promise<number> {
  const rows = await reader.select({ id: achievementUnlocks.achievementId }).from(achievementUnlocks)
    .where(eq(achievementUnlocks.accountId, accountId));
  return achievementBounty(rows.map((row) => row.id));
}

/** Bounty totals for many captains at once (ranked profiles and leaderboards). */
export async function achievementBountiesFor(reader: Reader, accountIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(accountIds)];
  const rows = ids.length ? await reader.select({ accountId: achievementUnlocks.accountId, id: achievementUnlocks.achievementId })
    .from(achievementUnlocks).where(inArray(achievementUnlocks.accountId, ids)) : [];
  const byAccount = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const row of rows) byAccount.get(row.accountId)?.push(row.id);
  return new Map([...byAccount].map(([id, unlocked]) => [id, achievementBounty(unlocked)]));
}

const BOUNTY_VALUES = BOUNTY_ACHIEVEMENTS
  .map((def) => `('${def.id}', ${def.legacyId ? `'${def.legacyId}'` : "NULL"}, ${def.bounty ?? 0})`).join(", ");

/**
 * SQL column: the achievement bounty of the captain in `accounts.id`, for use inside selects
 * (each achievement counts once, whether earned under its new id or its pre-update id).
 */
export function achievementBountySql() {
  return sql<number>`(SELECT COALESCE(SUM(b.bounty), 0)::int FROM (VALUES ${sql.raw(BOUNTY_VALUES)}) AS b(id, legacy_id, bounty)
    WHERE EXISTS (SELECT 1 FROM ${achievementUnlocks} u WHERE u.account_id = ${accounts.id} AND u.achievement_id IN (b.id, b.legacy_id)))`;
}
