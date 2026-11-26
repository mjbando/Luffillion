import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, achievementUnlocks, characterUnlocks } from "@/db/schema";
import { characterById, DEFAULT_CHARACTER, isCharacterId, isChestCharacter, type CharacterId } from "@/data/playable-characters";
import { isChestCharacterId } from "@/data/chest-characters";
import { ACHIEVEMENTS } from "./achievements";
import { evaluateAchievementsFor } from "./achievements-server";
import { RequestProblem } from "./account-server";

export async function equippedCharacterFor(accountId: string): Promise<CharacterId> {
  const [account] = await db.select({ equipped: accounts.equippedCharacter, usernameKey: accounts.usernameKey }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const chosen = characterById(account?.equipped);
  if (chosen.id === "gear-6") return account?.usernameKey === "luffy" ? chosen.id : DEFAULT_CHARACTER;
  if (isChestCharacter(chosen)) {
    const [chestUnlock] = await db.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
      .where(and(eq(characterUnlocks.accountId, accountId), eq(characterUnlocks.characterId, chosen.id))).limit(1);
    return chestUnlock ? chosen.id : DEFAULT_CHARACTER;
  }
  if (!chosen.achievementId) return DEFAULT_CHARACTER;
  // Achievement recruits are only ever owned through their achievement.
  const [earned] = await db.select({ id: achievementUnlocks.achievementId }).from(achievementUnlocks)
    .where(and(eq(achievementUnlocks.accountId, accountId), eq(achievementUnlocks.achievementId, chosen.achievementId))).limit(1);
  return earned ? chosen.id : DEFAULT_CHARACTER;
}

export async function chestUnlockedCharactersFor(accountId: string): Promise<CharacterId[]> {
  const rows = await db.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
    .where(eq(characterUnlocks.accountId, accountId));
  return rows.map((row) => row.id).filter(isChestCharacterId);
}

export async function equipCharacter(accountId: string, id: unknown) {
  if (!isCharacterId(id)) throw new RequestProblem(400, "Choose a character from the crew collection.");
  return db.transaction(async tx => {
    const [account] = await tx.select({ id: accounts.id, usernameKey: accounts.usernameKey }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    if (!account) throw new RequestProblem(401, "Sign in again to choose your character.");
    if (id === "gear-6" && account.usernameKey !== "luffy") {
      throw new RequestProblem(403, "Gear 6 Luffy is exclusive to the creator account.");
    }
    const report = await evaluateAchievementsFor(tx, accountId);
    const character = characterById(id);
    if (isChestCharacter(character)) {
      const [chestUnlock] = await tx.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
        .where(and(eq(characterUnlocks.accountId, accountId), eq(characterUnlocks.characterId, character.id))).limit(1);
      if (!chestUnlock) throw new RequestProblem(403, `Find ${character.name} in a ${character.grade} treasure chest first.`);
    } else if (character.achievementId && !report.achievements.find(a => a.id === character.achievementId)?.unlocked) {
      const title = ACHIEVEMENTS.find(a => a.id === character.achievementId)?.title ?? "the required achievement";
      throw new RequestProblem(403, `Earn ${title} to recruit ${character.name}.`);
    }
    await tx.update(accounts).set({ equippedCharacter: id }).where(eq(accounts.id, accountId));
    return { equippedCharacter: id, accountId, newlyUnlocked: report.newlyUnlocked };
  });
}
