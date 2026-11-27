import { NextRequest } from "next/server";
import { db } from "@/db";
import { currentCaptain, ensureGuest, failure, guestId, privateJson, RequestProblem } from "@/lib/account-server";
import { touchPresence } from "@/lib/presence-server";
import { UPDATE_LIVE } from "@/lib/release";

export const dynamic = "force-dynamic";

/** Heartbeat from any open page: marks this visitor (account or guest device) as on the site. */
export async function POST(req: NextRequest) {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    const captain = await currentCaptain(req);
    const key = captain ? `a:${captain.id}` : guestId(req) ? `g:${guestId(req)}` : null;
    if (key) await touchPresence(db, key);
    const res = privateJson({ ok: true });
    if (!captain) ensureGuest(req, res);
    return res;
  } catch (err) {
    return failure(err);
  }
}
