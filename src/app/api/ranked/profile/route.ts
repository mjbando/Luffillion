import { NextRequest } from "next/server";
import { failure, privateJson, RequestProblem } from "@/lib/account-server";
import { readRankedPublicProfile } from "@/lib/ranked-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get("accountId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(accountId)) throw new RequestProblem(400, "Invalid captain profile.");
    const profile = await readRankedPublicProfile(accountId);
    return privateJson(profile);
  } catch (err) {
    return failure(err);
  }
}