import { NextRequest } from "next/server";
import { getDailyRun, msUntilNextDay, tierCounts, todayKey } from "@/lib/daily";
import { QUESTION_SECONDS, MAX_POINTS } from "@/data/tiers";
import { currentCaptain, ensureGuest, failure, guestId, privateJson, RequestProblem } from "@/lib/account-server";
import { archiveSave, dailySave, ownerOf } from "@/lib/voyage-server";
import { isArchiveDay } from "@/lib/archive";
import { UPDATE_LIVE } from "@/lib/release";

import { loadAchievements } from "@/lib/achievements-server";
import { equippedCharacterFor } from "@/lib/crew-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const captain = await currentCaptain(req);
    const requested = req.nextUrl.searchParams.get("day");
    // Archive replay of a past day: captains only, never touches today's save or leaderboards.
    if (requested) {
      if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
      if (!captain) throw new RequestProblem(401, "Sign in to replay past voyages.");
      if (!isArchiveDay(requested, now)) throw new RequestProblem(400, "That voyage isn't in the archive.");
      const save = await archiveSave(requested, captain.id);
      const questions = getDailyRun(requested).map((q, index) => ({ index, id: q.id, prompt: q.prompt, hint: q.hint, counts: tierCounts(q) }));
      return privateJson({ day: requested, runId: `archive:${requested}`, archive: true, questions, seconds: QUESTION_SECONDS, maxPoints: MAX_POINTS,
        serverNow: now.getTime(), nextRunInMs: msUntilNextDay(now), captain, equippedCharacter: await equippedCharacterFor(captain.id),
        newlyUnlocked: [], finished: save.finished, replayed: save.replayed, checkpoint: null });
    }
    const day = todayKey(now);
    const awards = captain ? await loadAchievements(captain.id) : null;
    const equippedCharacter = captain ? await equippedCharacterFor(captain.id) : "luffy";
    const save = await dailySave(day, ownerOf(captain?.id ?? null, guestId(req)));
    const questions = getDailyRun(day).map((q, index) => ({ index, id: q.id, prompt: q.prompt, hint: q.hint, counts: tierCounts(q) }));
    // Only the current player's submitted answers are included, never the answer bank.
    const res = privateJson({ day, runId: day, questions, seconds: QUESTION_SECONDS, maxPoints: MAX_POINTS,
      serverNow: now.getTime(), nextRunInMs: msUntilNextDay(now), captain, equippedCharacter, newlyUnlocked: awards?.newlyUnlocked ?? [], ...save });
    ensureGuest(req, res);
    return res;
  } catch (err) { return failure(err); }
}
