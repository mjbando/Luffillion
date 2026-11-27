import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, achievementUnlocks, characterUnlocks } from "@/db/schema";
import { characterById, DEFAULT_CHARACTER, PLAYABLE_CHARACTERS, isCharacterId, isChestCharacter, type CharacterId } from "@/data/playable-characters";
import { isChestCharacterId } from "@/data/chest-characters";
import { ACHIEVEMENTS } from "./achievements";
import { evaluateAchievementsFor } from "./achievements-server";
import { RequestProblem } from "./account-server";
import { UPDATE_LIVE } from "./release";
import { isFormerAchievementCharacter, rosterEntry } from "@/data/roster";

type Reader = Pick<typeof db, "select">;

/**
 * Former achievement recruits: owned through the achievement earned before the treasure update,
 * or (once it is live) by finding them in a Treasure Chest.
 */
async function ownsFormerRecruit(reader: Reader, accountId: string, characterId: CharacterId, achievementId: string) {
  const [earned] = await reader.select({ id: achievementUnlocks.achievementId }).from(achievementUnlocks)
    .where(and(eq(achievementUnlocks.accountId, accountId), eq(achievementUnlocks.achievementId, achievementId))).limit(1);
  if (earned) return true;
  if (!UPDATE_LIVE || !isFormerAchievementCharacter(characterId)) return false;
  const [found] = await reader.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
    .where(and(eq(characterUnlocks.accountId, accountId), eq(characterUnlocks.characterId, characterId))).limit(1);
  return !!found;
}

export async function equippedCharacterFor(accountId: string): Promise<CharacterId> {
  const [account] = await db.select({ equipped: accounts.equippedCharacter, usernameKey: accounts.usernameKey }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const chosen = characterById(account?.equipped);
  if (chosen.id === "gear-6") return account?.usernameKey === "luffy" ? chosen.id : DEFAULT_CHARACTER;
  if (isChestCharacter(chosen)) {
    if (!UPDATE_LIVE) return DEFAULT_CHARACTER;
    const [chestUnlock] = await db.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
      .where(and(eq(characterUnlocks.accountId, accountId), eq(characterUnlocks.characterId, chosen.id))).limit(1);
    return chestUnlock ? chosen.id : DEFAULT_CHARACTER;
  }
  if (!chosen.achievementId) return DEFAULT_CHARACTER;
  return (await ownsFormerRecruit(db, accountId, chosen.id, chosen.achievementId)) ? chosen.id : DEFAULT_CHARACTER;
}

export async function chestUnlockedCharactersFor(accountId: string): Promise<CharacterId[]> {
  if (!UPDATE_LIVE) return [];
  const rows = await db.select({ id: characterUnlocks.characterId }).from(characterUnlocks)
    .where(eq(characterUnlocks.accountId, accountId));
  return rows.map((row) => row.id).filter((id): id is CharacterId => isChestCharacterId(id) || isFormerAchievementCharacter(id));
}

/** Treasure update: every character this captain can equip, decided on the server. */
export async function ownedCharacterIdsFor(accountId: string): Promise<CharacterId[]> {
  const [[account], earned, found] = await Promise.all([
    db.select({ usernameKey: accounts.usernameKey }).from(accounts).where(eq(accounts.id, accountId)).limit(1),
    db.select({ id: achievementUnlocks.achievementId }).from(achievementUnlocks).where(eq(achievementUnlocks.accountId, accountId)),
    db.select({ id: characterUnlocks.characterId }).from(characterUnlocks).where(eq(characterUnlocks.accountId, accountId)),
  ]);
  const earnedIds = new Set(earned.map((row) => row.id));
  const foundIds = new Set(found.map((row) => row.id));
  return [
    ...PLAYABLE_CHARACTERS.filter((c) => c.id === "gear-6" ? account?.usernameKey === "luffy"
      : !c.achievementId || earnedIds.has(c.achievementId) || (UPDATE_LIVE && foundIds.has(c.id))).map((c) => c.id),
    ...(UPDATE_LIVE ? [...foundIds].filter(isChestCharacterId) : []),
  ];
}

export async function equipCharacter(accountId: string, id: unknown) {
  if (!isCharacterId(id)) throw new RequestProblem(400, "Choose a character from the crew collection.");
  if (!UPDATE_LIVE && isChestCharacter(characterById(id))) throw new RequestProblem(400, "Choose a character from the crew collection.");
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
      if (!chestUnlock) throw new RequestProblem(403, `Find ${character.name} in ${/^[AEIOU]/i.test(character.grade) ? "an" : "a"} ${character.grade} treasure chest first.`);
    } else if (character.achievementId && UPDATE_LIVE) {
      // Achievements no longer recruit anyone: earlier recruits are kept, the rest come from chests.
      if (!(await ownsFormerRecruit(tx, accountId, character.id, character.achievementId))) {
        const rarity = rosterEntry(character.id)?.rarity ?? "treasure";
        const label = `${rarity[0].toUpperCase()}${rarity.slice(1)}`;
        throw new RequestProblem(403, `Find ${character.name} in ${/^[AEIOU]/.test(label) ? "an" : "a"} ${label} treasure chest first.`);
      }
    } else if (character.achievementId && !report.achievements.find(a => a.id === character.achievementId)?.unlocked) {
      const title = ACHIEVEMENTS.find(a => a.id === character.achievementId)?.title ?? "the required achievement";
      throw new RequestProblem(403, `Earn ${title} to recruit ${character.name}.`);
    }
    await tx.update(accounts).set({ equippedCharacter: id }).where(eq(accounts.id, accountId));
    return { equippedCharacter: id, accountId, newlyUnlocked: report.newlyUnlocked };
  });
}
