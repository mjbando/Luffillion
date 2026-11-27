import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { archiveRuns } from "@/db/schema";
import { currentCaptain, failure, privateJson, RequestProblem } from "@/lib/account-server";
import { archiveDays, ARCHIVE_FIRST_DAY } from "@/lib/archive";
import { UPDATE_LIVE } from "@/lib/release";
import { archiveFields } from "@/lib/voyage-server";

export const dynamic = "force-dynamic";

/** The captain's archive replays plus every day that can still be replayed. */
export async function GET(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to replay past voyages.");
    const replays = await db.select(archiveFields).from(archiveRuns).where(eq(archiveRuns.accountId, captain.id)).orderBy(desc(archiveRuns.dayKey));
    return privateJson({ firstDay: ARCHIVE_FIRST_DAY, days: archiveDays(), replays });
  } catch (err) { return failure(err); }
}
