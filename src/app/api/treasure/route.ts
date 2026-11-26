import { randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { PLAYABLE_CHARACTERS } from "@/data/playable-characters";
import { chestCharacterById, isChestCharacterId } from "@/data/chest-characters";
import { db } from "@/db";
import { accounts, achievementUnlocks, characterUnlocks, treasureChestOpenings } from "@/db/schema";
import { currentCaptain, failure, privateJson, readMutation, RequestProblem } from "@/lib/account-server";
import { CHARACTER_POOLS, CHEST_PRICES, TREASURE_CHESTS, rollRarity, type ChestRarity } from "@/lib/treasure";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to open treasure chests.");

    const [account] = await db.select({ coins: accounts.coins, usernameKey: accounts.usernameKey })
      .from(accounts).where(eq(accounts.id, captain.id)).limit(1);
    if (!account) throw new RequestProblem(404, "Captain account not found.");

    const [chestCharacters, achievements, recentOpenings] = await Promise.all([
      db.select({ characterId: characterUnlocks.characterId })
        .from(characterUnlocks).where(eq(characterUnlocks.accountId, captain.id)),
      db.select({ achievementId: achievementUnlocks.achievementId })
        .from(achievementUnlocks).where(eq(achievementUnlocks.accountId, captain.id)),
      db.select({ chestRarity: treasureChestOpenings.chestRarity, rewardRarity: treasureChestOpenings.rewardRarity,
        characterId: treasureChestOpenings.characterId, duplicateCoins: treasureChestOpenings.duplicateCoins,
        cost: treasureChestOpenings.cost, createdAt: treasureChestOpenings.createdAt })
        .from(treasureChestOpenings).where(eq(treasureChestOpenings.accountId, captain.id))
        .orderBy(desc(treasureChestOpenings.createdAt)).limit(8),
    ]);

    const chestIds = new Set(chestCharacters.map((row) => row.characterId));
    const achievementIds = new Set(achievements.map((row) => row.achievementId));
    const unlockedCharacterIds = [
      ...PLAYABLE_CHARACTERS
        .filter((character) => character.id !== "gear-6" || account.usernameKey === "luffy")
        .filter((character) => !character.achievementId || achievementIds.has(character.achievementId))
        .map((character) => character.id),
      ...[...chestIds].filter(isChestCharacterId),
    ];

    return privateJson({ coins: account.coins, unlockedCharacterIds, recentOpenings });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to open treasure chests.");
    const body = await readMutation(req, 2048);
    if (typeof body.chest !== "string" || !TREASURE_CHESTS.includes(body.chest as ChestRarity)) {
      throw new RequestProblem(400, "Choose a treasure chest.");
    }
    const chest = body.chest as ChestRarity;
    const cost = CHEST_PRICES[chest];

    const result = await db.transaction(async (tx) => {
      const [account] = await tx.select({ coins: accounts.coins, usernameKey: accounts.usernameKey })
        .from(accounts).where(eq(accounts.id, captain.id)).for("update");
      if (!account) throw new RequestProblem(404, "Captain account not found.");
      if (account.coins < cost) throw new RequestProblem(409, `You need ${cost} coins to open this chest.`);

      const rewardRarity = rollRarity(chest, randomInt(10_000));

      const pool = CHARACTER_POOLS[rewardRarity];
      const characterId = pool[randomInt(pool.length)];
      const character = chestCharacterById(characterId)!;
      const [earnedFromChest] = await tx.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
        .where(and(eq(characterUnlocks.accountId, captain.id), eq(characterUnlocks.characterId, character.id))).limit(1);
      const duplicate = Boolean(earnedFromChest);
      const duplicateCoins = duplicate ? Math.floor(cost / 2) : 0;

      if (!duplicate) {
        await tx.insert(characterUnlocks).values({ accountId: captain.id, characterId: character.id, source: "chest" })
          .onConflictDoNothing();
      }

      const coins = account.coins - cost + duplicateCoins;
      await tx.update(accounts).set({ coins }).where(eq(accounts.id, captain.id));
      await tx.insert(treasureChestOpenings).values({
        accountId: captain.id,
        chestRarity: chest,
        rewardRarity,
        characterId: character.id,
        duplicateCoins,
        cost,
      });

      return {
        coins,
        result: { chestRarity: chest, rewardRarity, characterId: character.id, characterName: character.name, duplicateCoins, cost },
      };
    });

    return privateJson(result);
  } catch (error) {
    return failure(error);
  }
}