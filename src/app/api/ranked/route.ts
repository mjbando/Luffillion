import { NextRequest } from "next/server";
import { currentCaptain, ensureGuest, failure, privateJson, readMutation, RequestProblem } from "@/lib/account-server";
import { rankedAction, readRankedLobby, settleRankedDailyHonors } from "@/lib/ranked-server";

import { UPDATE_LIVE } from "@/lib/release";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const matchId = req.nextUrl.searchParams.get("match");
    // Award yesterday's end-of-day honors (cheap no-op once today's check has run).
    await settleRankedDailyHonors().catch((err) => console.error("ranked honors", err));
    const lobby = await readRankedLobby(captain?.id ?? null, q, matchId);
    const res = privateJson({ captain, ...lobby });
    ensureGuest(req, res);
    return res;
  } catch (err) {
    return failure(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to battle in Online Ranked mode.");
    const body = await readMutation(req, 4096);
    if (body.accountId && body.accountId !== captain.id) {
      throw new RequestProblem(409, "Your account changed. Reload before continuing.");
    }
    const result = await rankedAction(captain.id, body);
    return privateJson({ captain, ...result });
  } catch (err) {
    return failure(err);
  }
}
