import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, achievementUnlocks, coinLedger, rankedProfiles } from "@/db/schema";
import { ownedCharacterIdsFor } from "./crew-server";
import { creditCoins } from "./currency-server";
import { RequestProblem } from "./account-server";
import { UPDATE_LIVE } from "./release";
import {
  BOUNTY_MILESTONES,
  RANKED_BERRY_ACHIEVEMENTS,
  STRAW_HAT_CREW,
  type MilestoneReport,
  type RankedBerryAchievementStatus,
} from "./ranked-achievements";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

const MILESTONE_SOURCE = "milestone" as const;
const RANKED_BADGE_SOURCE = "ranked-badge" as const;

async function balanceOf(tx: Executor, accountId: string) {
  const [row] = await tx.select({ coins: accounts.coins }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return row?.coins ?? 0;
}

/** Season bounty: only ranked wins (bots included) raise it. */
export async function rankedBountyFor(tx: Executor, accountId: string): Promise<number> {
  const [row] = await tx.select({ bounty: rankedProfiles.bounty }).from(rankedProfiles).where(eq(rankedProfiles.accountId, accountId)).limit(1);
  return row?.bounty ?? 0;
}

async function claimedRefs(tx: Executor, accountId: string, source: string) {
  const rows = await tx.select({ ref: coinLedger.ref }).from(coinLedger)
    .where(and(eq(coinLedger.accountId, accountId), eq(coinLedger.source, source)));
  return new Set(rows.map((row) => row.ref));
}

// ---------- Bounty milestones ----------

export async function loadMilestones(tx: Executor, accountId: string): Promise<MilestoneReport> {
  const [bounty, claimed] = await Promise.all([rankedBountyFor(tx, accountId), claimedRefs(tx, accountId, MILESTONE_SOURCE)]);
  return {
    bounty,
    milestones: BOUNTY_MILESTONES.map((m) => ({ ...m, reached: bounty >= m.bounty, claimed: claimed.has(String(m.bounty)) })),
  };
}

export async function claimMilestone(accountId: string, bounty: unknown) {
  const milestone = BOUNTY_MILESTONES.find((m) => m.bounty === bounty);
  if (!UPDATE_LIVE || !milestone) throw new RequestProblem(400, "Choose a bounty milestone to claim.");
  return db.transaction(async (tx) => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    const total = await rankedBountyFor(tx, accountId);
    if (total < milestone.bounty) throw new RequestProblem(403, "Raise your bounty to reach this milestone first.");
    const paid = await creditCoins(tx, accountId, { source: MILESTONE_SOURCE, ref: String(milestone.bounty), amount: milestone.berries });
    return { paid, berries: await balanceOf(tx, accountId), milestones: await loadMilestones(tx, accountId) };
  });
}

// ---------- Ranked achievements that pay berries ----------

/** Records a ranked berry achievement as earned (idempotent). Returns true if newly earned. */
export async function unlockRankedBerryAchievement(tx: Executor, accountId: string, id: string): Promise<boolean> {
  if (!UPDATE_LIVE || !RANKED_BERRY_ACHIEVEMENTS.some((a) => a.id === id)) return false;
  const inserted = await tx.insert(achievementUnlocks).values({ accountId, achievementId: id }).onConflictDoNothing()
    .returning({ id: achievementUnlocks.achievementId });
  return inserted.length > 0;
}

/** Characters owned beyond the starting Luffy (the creator-only Gear 6 doesn't count either). */
export async function unlockedCharacterCount(accountId: string): Promise<number> {
  const owned = await ownedCharacterIdsFor(accountId);
  return owned.filter((id) => id !== "luffy" && id !== "gear-6").length;
}

export async function loadRankedBerryAchievements(tx: Executor, accountId: string): Promise<RankedBerryAchievementStatus[]> {
  const owned = new Set<string>(await ownedCharacterIdsFor(accountId));
  const crew = [...owned].filter((id) => id !== "luffy" && id !== "gear-6").length;
  const strawHats = STRAW_HAT_CREW.filter((id) => id === "luffy" || owned.has(id)).length;
  const characterProgress = (goal: string) => goal === "crew" ? crew : goal === "straw-hats" ? strawHats : null;
  // Character goals are re-checked whenever the list is read; owning characters never goes backwards.
  for (const def of RANKED_BERRY_ACHIEVEMENTS) {
    const have = characterProgress(def.goal);
    if (have !== null && have >= def.target) await unlockRankedBerryAchievement(tx, accountId, def.id);
  }
  const ids = RANKED_BERRY_ACHIEVEMENTS.map((a) => a.id);
  const [unlocks, claimed, [profile]] = await Promise.all([
    tx.select({ id: achievementUnlocks.achievementId, at: achievementUnlocks.unlockedAt }).from(achievementUnlocks)
      .where(and(eq(achievementUnlocks.accountId, accountId), inArray(achievementUnlocks.achievementId, ids))),
    claimedRefs(tx, accountId, RANKED_BADGE_SOURCE),
    tx.select({ showdownStreak: rankedProfiles.showdownStreak, wins: rankedProfiles.wins }).from(rankedProfiles).where(eq(rankedProfiles.accountId, accountId)).limit(1),
  ]);
  const unlockedAt = new Map(unlocks.map((row) => [row.id, row.at]));
  // Win milestones also count ranked wins from before they existed; wins never go down.
  for (const def of RANKED_BERRY_ACHIEVEMENTS) {
    if (def.goal !== "wins" || unlockedAt.has(def.id) || (profile?.wins ?? 0) < def.target) continue;
    if (await unlockRankedBerryAchievement(tx, accountId, def.id)) unlockedAt.set(def.id, new Date());
  }
  return RANKED_BERRY_ACHIEVEMENTS.map((def) => {
    const at = unlockedAt.get(def.id);
    const progress = at ? def.target : characterProgress(def.goal)
      ?? (def.goal === "showdowns" ? profile?.showdownStreak ?? 0 : def.goal === "wins" ? profile?.wins ?? 0 : 0);
    return { ...def, unlocked: Boolean(at), unlockedAt: at?.toISOString() ?? null, claimed: claimed.has(def.id), progress: Math.min(progress, def.target) };
  });
}

export async function claimRankedBerryAchievement(accountId: string, id: unknown) {
  const def = RANKED_BERRY_ACHIEVEMENTS.find((a) => a.id === id);
  if (!UPDATE_LIVE || !def) throw new RequestProblem(400, "Choose a ranked achievement to claim.");
  return db.transaction(async (tx) => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    const list = await loadRankedBerryAchievements(tx, accountId);
    if (!list.find((a) => a.id === def.id)?.unlocked) throw new RequestProblem(403, `Earn ${def.title} first.`);
    const paid = await creditCoins(tx, accountId, { source: RANKED_BADGE_SOURCE, ref: def.id, amount: def.berries });
    return { paid, berries: await balanceOf(tx, accountId), rankedBerryAchievements: await loadRankedBerryAchievements(tx, accountId) };
  });
}

/**
 * Showdown streaks for "Win 3 Showdowns in a row". Called when a ranked Showdown is decided:
 * the winner's streak grows, the loser's resets. Returns true if the winner just earned it.
 */
export async function recordShowdownResult(tx: Tx, winnerId: string | null, loserIds: string[]): Promise<boolean> {
  if (!UPDATE_LIVE) return false;
  if (loserIds.length) await tx.update(rankedProfiles).set({ showdownStreak: 0 }).where(inArray(rankedProfiles.accountId, loserIds));
  if (!winnerId) return false;
  const [row] = await tx.update(rankedProfiles).set({ showdownStreak: sql`${rankedProfiles.showdownStreak} + 1` })
    .where(eq(rankedProfiles.accountId, winnerId)).returning({ streak: rankedProfiles.showdownStreak });
  const def = RANKED_BERRY_ACHIEVEMENTS.find((a) => a.goal === "showdowns")!;
  return (row?.streak ?? 0) >= def.target && unlockRankedBerryAchievement(tx, winnerId, def.id);
}

/** Ranked berry achievements this captain earned since `since` (for the battle results screen). */
export async function rankedBerryUnlocksSince(tx: Executor, accountId: string, since: Date): Promise<string[]> {
  if (!UPDATE_LIVE || accountId.startsWith("~")) return [];
  const rows = await tx.select({ id: achievementUnlocks.achievementId }).from(achievementUnlocks).where(and(
    eq(achievementUnlocks.accountId, accountId),
    inArray(achievementUnlocks.achievementId, RANKED_BERRY_ACHIEVEMENTS.filter((a) => !["crew", "straw-hats", "day-most-wanted", "day-top3"].includes(a.goal)).map((a) => a.id)),
    gte(achievementUnlocks.unlockedAt, since),
  ));
  return rows.map((row) => row.id);
}
