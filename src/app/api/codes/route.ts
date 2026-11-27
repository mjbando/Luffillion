import { NextRequest } from "next/server";
import { currentCaptain, failure, privateJson, readMutation, RequestProblem } from "@/lib/account-server";
import { createCode, isCodeCreator, listCodes, redeemCode, setCodeDisabled } from "@/lib/codes-server";
import { UPDATE_LIVE } from "@/lib/release";

export const dynamic = "force-dynamic";

/** The creator's list of codes (everyone else just gets `creator: false`). */
export async function GET(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to redeem codes.");
    const creator = await isCodeCreator(captain.id);
    return privateJson({ creator, codes: creator ? await listCodes() : [] });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    if (!captain) throw new RequestProblem(401, "Sign in to redeem codes.");
    const body = await readMutation(req, 2048);
    if (body.action === "redeem") return privateJson(await redeemCode(captain.id, body.code));
    if (!(await isCodeCreator(captain.id))) throw new RequestProblem(403, "Only the creator can manage codes.");
    if (body.action === "create") return privateJson({ code: await createCode(captain.id, body), codes: await listCodes() });
    if (body.action === "disable" || body.action === "enable") {
      await setCodeDisabled(body.code, body.action === "disable");
      return privateJson({ codes: await listCodes() });
    }
    throw new RequestProblem(400, "Unknown action.");
  } catch (error) {
    return failure(error);
  }
}
