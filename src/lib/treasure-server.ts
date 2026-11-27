import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { db } from "@/db";
import { accounts, characterUnlocks, rankedProfiles, rewardChests, treasureChestOpenings } from "@/db/schema";
import { chestCharacterById } from "@/data/chest-characters";
import { CHARACTER_POOLS, CHEST_PRICES, TREASURE_CHESTS, rollRarity, type ChestRarity, type TreasureRarity } from "./treasure";
import {
  RANKED_ACHIEVEMENTS,
  RANKED_REWARD_SOURCE,
  rewardChestLabel,
  type RankedAchievementStatus,
  type UnopenedChest,
} from "./ranked-achievements";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

export interface ChestRollResult {
  chestRarity: ChestRarity;
  rewardRarity: TreasureRarity;
  characterId: string;
  characterName: string;
  duplicateCoins: number;
  cost: number;
}

/**
 * Rolls a chest for an account whose captain_accounts row is already locked (FOR UPDATE) in `tx`.
 * Records the opening and unlocks the character; duplicates refund half the chest's shop price.
 * Returns the reward and the coin change caused by the duplicate refund (the caller handles cost).
 */
export async function rollChestFor(tx: Tx, accountId: string, chest: ChestRarity, cost: number): Promise<ChestRollResult> {
  const rewardRarity = rollRarity(chest, randomInt(10_000));
  const pool = CHARACTER_POOLS[rewardRarity];
  const character = chestCharacterById(pool[randomInt(pool.length)])!;
  const [earned] = await tx.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
    .where(and(eq(characterUnlocks.accountId, accountId), eq(characterUnlocks.characterId, character.id))).limit(1);
  const duplicateCoins = earned ? Math.floor(CHEST_PRICES[chest] / 2) : 0;
  if (!earned) {
    await tx.insert(characterUnlocks).values({ accountId, characterId: character.id, source: "chest" }).onConflictDoNothing();
  }
  await tx.insert(treasureChestOpenings).values({ accountId, chestRarity: chest, rewardRarity, characterId: character.id, duplicateCoins, cost });
  return { chestRarity: chest, rewardRarity, characterId: character.id, characterName: character.name, duplicateCoins, cost };
}

/** Grants every ranked streak chest the streak has reached (once each). Returns the newly granted achievement ids. */
export async function grantRankedStreakChests(tx: Executor, accountId: string, streak: number): Promise<string[]> {
  const reached = RANKED_ACHIEVEMENTS.filter((a) => streak >= a.streak);
  if (!reached.length) return [];
  const inserted = await tx.insert(rewardChests)
    .values(reached.map((a) => ({ accountId, chestRarity: a.chest, source: RANKED_REWARD_SOURCE, ref: a.id })))
    .onConflictDoNothing()
    .returning({ ref: rewardChests.ref });
  return inserted.map((row) => row.ref);
}

export async function listUnopenedChests(tx: Executor, accountId: string): Promise<UnopenedChest[]> {
  const rows = await tx.select().from(rewardChests)
    .where(and(eq(rewardChests.accountId, accountId), isNull(rewardChests.openedAt)))
    .orderBy(asc(rewardChests.createdAt));
  return rows
    .filter((row) => TREASURE_CHESTS.includes(row.chestRarity as ChestRarity))
    .map((row) => ({
      id: row.id,
      chestRarity: row.chestRarity as ChestRarity,
      source: row.source,
      ref: row.ref,
      label: rewardChestLabel(row.source, row.ref),
      createdAt: row.createdAt.toISOString(),
    }));
}

/** Ranked achievement progress. Also grants any chest already earned (e.g. a streak reached before this shipped). */
export async function loadRankedAchievements(tx: Executor, accountId: string): Promise<RankedAchievementStatus[]> {
  const [profile] = await tx.select({ winStreak: rankedProfiles.winStreak, bestStreak: rankedProfiles.bestStreak })
    .from(rankedProfiles).where(eq(rankedProfiles.accountId, accountId)).limit(1);
  const best = Math.max(profile?.bestStreak ?? 0, profile?.winStreak ?? 0);
  await grantRankedStreakChests(tx, accountId, best);
  const rows = await tx.select().from(rewardChests).where(and(
    eq(rewardChests.accountId, accountId),
    eq(rewardChests.source, RANKED_REWARD_SOURCE),
    inArray(rewardChests.ref, RANKED_ACHIEVEMENTS.map((a) => a.id)),
  ));
  const byRef = new Map(rows.map((row) => [row.ref, row]));
  return RANKED_ACHIEVEMENTS.map((a) => {
    const row = byRef.get(a.id);
    return {
      ...a,
      unlocked: Boolean(row),
      unlockedAt: row ? row.createdAt.toISOString() : null,
      progress: Math.min(a.streak, row ? a.streak : profile?.winStreak ?? 0),
      unopenedChestId: row && !row.openedAt ? row.id : null,
    };
  });
}

/** Opens one of the account's unopened reward chests (free). */
export async function openRewardChest(tx: Tx, accountId: string, rewardChestId: string) {
  const [account] = await tx.select({ coins: accounts.coins }).from(accounts).where(eq(accounts.id, accountId)).for("update");
  if (!account) return null;
  const [chestRow] = await tx.select().from(rewardChests)
    .where(and(eq(rewardChests.id, rewardChestId), eq(rewardChests.accountId, accountId)))
    .for("update").limit(1);
  if (!chestRow || chestRow.openedAt || !TREASURE_CHESTS.includes(chestRow.chestRarity as ChestRarity)) return { account, chest: null };
  const result = await rollChestFor(tx, accountId, chestRow.chestRarity as ChestRarity, 0);
  await tx.update(rewardChests).set({ openedAt: new Date() }).where(eq(rewardChests.id, chestRow.id));
  const coins = account.coins + result.duplicateCoins;
  if (result.duplicateCoins) await tx.update(accounts).set({ coins }).where(eq(accounts.id, accountId));
  return { account: { coins }, chest: result };
}
