import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { PLAYABLE_CHARACTERS } from "@/data/playable-characters";
import { isChestCharacterId } from "@/data/chest-characters";
import { db } from "@/db";
import { accounts, achievementUnlocks, characterUnlocks, treasureChestOpenings } from "@/db/schema";
import { currentCaptain, failure, privateJson, readMutation, RequestProblem } from "@/lib/account-server";
import { CHEST_PRICES, TREASURE_CHESTS, type ChestRarity } from "@/lib/treasure";
import { listUnopenedChests, openRewardChest, rollChestFor } from "@/lib/treasure-server";

import { UPDATE_LIVE } from "@/lib/release";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
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

    const unopenedChests = await listUnopenedChests(db, captain.id);
    return privateJson({ coins: account.coins, unlockedCharacterIds, recentOpenings, unopenedChests });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to open treasure chests.");
    const body = await readMutation(req, 2048);

    // Free reward chest (e.g. ranked achievement) waiting in the player's unopened chests.
    if (body.rewardChestId !== undefined) {
      const id = body.rewardChestId;
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new RequestProblem(400, "Choose an unopened chest.");
      const opened = await db.transaction(async (tx) => {
        const out = await openRewardChest(tx, captain.id, id);
        if (!out) throw new RequestProblem(404, "Captain account not found.");
        if (!out.chest) throw new RequestProblem(409, "That chest has already been opened.");
        return { coins: out.account.coins, result: out.chest, unopenedChests: await listUnopenedChests(tx, captain.id) };
      });
      return privateJson(opened);
    }

    if (typeof body.chest !== "string" || !TREASURE_CHESTS.includes(body.chest as ChestRarity)) {
      throw new RequestProblem(400, "Choose a treasure chest.");
    }
    const chest = body.chest as ChestRarity;
    const cost = CHEST_PRICES[chest];

    const result = await db.transaction(async (tx) => {
      const [account] = await tx.select({ coins: accounts.coins }).from(accounts).where(eq(accounts.id, captain.id)).for("update");
      if (!account) throw new RequestProblem(404, "Captain account not found.");
      if (account.coins < cost) throw new RequestProblem(409, `You need ${cost} coins to open this chest.`);
      const rolled = await rollChestFor(tx, captain.id, chest, cost);
      const coins = account.coins - cost + rolled.duplicateCoins;
      await tx.update(accounts).set({ coins }).where(eq(accounts.id, captain.id));
      return { coins, result: rolled };
    });

    return privateJson(result);
  } catch (error) {
    return failure(error);
  }
}