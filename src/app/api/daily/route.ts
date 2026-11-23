import { getDailyRun, msUntilNextDay, tierCounts, todayKey } from "@/lib/daily";
import { QUESTION_SECONDS, MAX_POINTS } from "@/data/tiers";

export const dynamic = "force-dynamic";

// Today's run: the same 7 questions for every player, one run per UTC day.
// Answers are never sent to the browser.
export async function GET() {
  const day = todayKey();
  const questions = getDailyRun(day).map((q, index) => ({
    index,
    id: q.id,
    prompt: q.prompt,
    hint: q.hint,
    counts: tierCounts(q),
  }));
  return Response.json({
    day,
    runId: day,
    questions,
    seconds: QUESTION_SECONDS,
    maxPoints: MAX_POINTS,
    serverNow: Date.now(),
    nextRunInMs: msUntilNextDay(),
  });
}
