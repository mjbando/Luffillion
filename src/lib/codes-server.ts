import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, characterUnlocks, codeRedemptions, redeemCodes, rewardChests } from "@/db/schema";
import { rosterEntry } from "@/data/roster";
import { RequestProblem } from "./account-server";
import { creditCoins } from "./currency-server";
import { listUnopenedChests } from "./treasure-server";
import {
  CODE_MAX_BERRIES, CODE_MAX_CHESTS, CODE_MAX_DAYS, describeReward, isChestRarity, normalizeCode,
  type CodeReward, type CodeSummary,
} from "./codes";

/** Only the game's creator can make or switch off codes. */
export const CODE_CREATOR_KEY = "luffy";

export async function isCodeCreator(accountId: string): Promise<boolean> {
  const [row] = await db.select({ key: accounts.usernameKey }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return row?.key === CODE_CREATOR_KEY;
}

function rewardOf(row: typeof redeemCodes.$inferSelect): CodeReward {
  return {
    berries: row.berries,
    chestRarity: isChestRarity(row.chestRarity) ? row.chestRarity : null,
    chestCount: row.chestCount,
    characterId: row.characterId,
  };
}

/** Redeems a code for a captain: once per captain, while the code is live and has uses left. */
export async function redeemCode(accountId: string, raw: unknown) {
  const code = normalizeCode(raw);
  if (!code) throw new RequestProblem(400, "Codes are 3 to 24 letters, numbers or dashes.");
  return db.transaction(async (tx) => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    const [row] = await tx.select().from(redeemCodes).where(eq(redeemCodes.code, code)).for("update").limit(1);
    if (!row || row.disabledAt || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) {
      throw new RequestProblem(404, "That code doesn't exist or has expired.");
    }
    const [already] = await tx.select({ code: codeRedemptions.code }).from(codeRedemptions)
      .where(and(eq(codeRedemptions.accountId, accountId), eq(codeRedemptions.code, code))).limit(1);
    if (already) throw new RequestProblem(409, "You already redeemed this code.");
    if (row.maxUses != null && row.uses >= row.maxUses) throw new RequestProblem(410, "This code has been used up.");

    await tx.insert(codeRedemptions).values({ accountId, code });
    await tx.update(redeemCodes).set({ uses: sql`${redeemCodes.uses} + 1` }).where(eq(redeemCodes.code, code));

    const reward = rewardOf(row);
    await creditCoins(tx, accountId, { source: "code", ref: code, amount: reward.berries });
    if (reward.chestRarity && reward.chestCount > 0) {
      await tx.insert(rewardChests).values(Array.from({ length: reward.chestCount }, (_, i) => ({
        accountId, chestRarity: reward.chestRarity!, source: "code", ref: `${code}:${i + 1}`,
      }))).onConflictDoNothing();
    }
    let characterName: string | null = null, characterNew = false;
    const character = reward.characterId ? rosterEntry(reward.characterId) : undefined;
    if (character) {
      characterName = character.name;
      const added = await tx.insert(characterUnlocks).values({ accountId, characterId: character.id, source: "code" })
        .onConflictDoNothing().returning({ id: characterUnlocks.characterId });
      characterNew = added.length > 0;
    }

    const [account] = await tx.select({ coins: accounts.coins }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
    const unopenedChests = await listUnopenedChests(tx, accountId);
    return {
      code,
      reward,
      characterName,
      characterNew,
      message: `Code ${code} redeemed: ${describeReward(reward, characterName)}${character && !characterNew ? ` (you already had ${character.name})` : ""}.`,
      coins: account?.coins ?? 0,
      unopenedChests,
    };
  });
}

function bounded(value: unknown, min: number, max: number, label: string): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new RequestProblem(400, `${label} must be a whole number from ${min} to ${max.toLocaleString()}.`);
  return n;
}

/** Creates a code. Validates everything server-side; a code needs at least one reward. */
export async function createCode(creatorId: string, body: Record<string, unknown>): Promise<CodeSummary> {
  const code = normalizeCode(body.code);
  if (!code) throw new RequestProblem(400, "Codes are 3 to 24 letters, numbers or dashes.");
  const berries = bounded(body.berries, 0, CODE_MAX_BERRIES, "Berries") ?? 0;
  const chestCount = bounded(body.chestCount, 0, CODE_MAX_CHESTS, "Chests") ?? 0;
  const chestRarity = chestCount > 0 ? body.chestRarity : null;
  if (chestCount > 0 && !isChestRarity(chestRarity)) throw new RequestProblem(400, "Pick a chest rarity.");
  const characterId = typeof body.characterId === "string" && body.characterId ? body.characterId : null;
  if (characterId && !rosterEntry(characterId)) throw new RequestProblem(400, "That character can't be given out by a code.");
  const maxUses = bounded(body.maxUses, 1, 1_000_000, "Max uses");
  const days = bounded(body.expiresInDays, 1, CODE_MAX_DAYS, "Days");
  if (!berries && !chestCount && !characterId) throw new RequestProblem(400, "Give the code at least one reward.");
  const [row] = await db.insert(redeemCodes).values({
    code, berries, chestRarity: chestCount > 0 ? (chestRarity as string) : null, chestCount, characterId, maxUses,
    expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null, createdBy: creatorId,
  }).onConflictDoNothing().returning();
  if (!row) throw new RequestProblem(409, `The code ${code} already exists.`);
  return summary(row);
}

export async function setCodeDisabled(raw: unknown, disabled: boolean): Promise<CodeSummary> {
  const code = normalizeCode(raw);
  if (!code) throw new RequestProblem(400, "Unknown code.");
  const [row] = await db.update(redeemCodes).set({ disabledAt: disabled ? new Date() : null }).where(eq(redeemCodes.code, code)).returning();
  if (!row) throw new RequestProblem(404, "Unknown code.");
  return summary(row);
}

export async function listCodes(): Promise<CodeSummary[]> {
  const rows = await db.select().from(redeemCodes).orderBy(desc(redeemCodes.createdAt)).limit(100);
  return rows.map(summary);
}

function summary(row: typeof redeemCodes.$inferSelect): CodeSummary {
  return {
    code: row.code,
    ...rewardOf(row),
    maxUses: row.maxUses,
    uses: row.uses,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    state: row.disabledAt ? "off"
      : row.expiresAt && row.expiresAt.getTime() <= Date.now() ? "expired"
      : row.maxUses != null && row.uses >= row.maxUses ? "used-up" : "live",
  };
}
