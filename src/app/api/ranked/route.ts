import { NextRequest } from "next/server";
import { currentCaptain, ensureGuest, failure, privateJson, readMutation, RequestProblem } from "@/lib/account-server";
import { rankedAction, readRankedLobby } from "@/lib/ranked-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const captain = await currentCaptain(req);
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const matchId = req.nextUrl.searchParams.get("match");
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
