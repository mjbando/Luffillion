import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { currentCaptain, failure, privateJson, readMutation, RequestProblem } from "@/lib/account-server";
import { achievementBountyFor, claimLegacyAchievement, loadAchievements } from "@/lib/achievements-server";
import { claimMilestone, claimRankedBerryAchievement, loadMilestones, loadRankedBerryAchievements } from "@/lib/berries-server";
import { chestUnlockedCharactersFor, equippedCharacterFor, ownedCharacterIdsFor } from "@/lib/crew-server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { UPDATE_LIVE } from "@/lib/release";
import { listUnopenedChests, loadRankedAchievements } from "@/lib/treasure-server";

export const dynamic = "force-dynamic";

async function berriesOf(accountId: string) {
  const [row] = await db.select({ coins: accounts.coins }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return row?.coins ?? 0;
}

export async function GET(req: NextRequest) {
  try {
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to view your achievements.");
    const report = await loadAchievements(captain.id);
    return privateJson({
      ...report,
      equippedCharacter: await equippedCharacterFor(captain.id),
      chestUnlockedCharacterIds: await chestUnlockedCharactersFor(captain.id),
      ...(UPDATE_LIVE ? {
        ownedCharacterIds: await ownedCharacterIdsFor(captain.id),
        bounty: await achievementBountyFor(db, captain.id),
        berries: await berriesOf(captain.id),
        ranked: await loadRankedAchievements(db, captain.id),
        rankedBerryAchievements: await loadRankedBerryAchievements(db, captain.id),
        milestones: await loadMilestones(db, captain.id),
        unopenedChests: await listUnopenedChests(db, captain.id),
      } : {}),
    });
  } catch (err) { return failure(err); }
}

/** Claims a berry reward: { claim: "legacy" | "milestone" | "ranked", id }. */
export async function POST(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to claim rewards.");
    const body = await readMutation(req, 1024);
    if (body.claim === "legacy") {
      const report = await claimLegacyAchievement(captain.id, body.id);
      return privateJson({ ...report, bounty: await achievementBountyFor(db, captain.id), milestones: await loadMilestones(db, captain.id) });
    }
    if (body.claim === "milestone") return privateJson(await claimMilestone(captain.id, body.id));
    if (body.claim === "ranked") return privateJson(await claimRankedBerryAchievement(captain.id, body.id));
    throw new RequestProblem(400, "Choose a reward to claim.");
  } catch (err) { return failure(err); }
}
