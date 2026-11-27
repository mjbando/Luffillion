import { failure, privateJson, RequestProblem } from "@/lib/account-server";
import { readMostWanted } from "@/lib/ranked-server";
import { UPDATE_LIVE } from "@/lib/release";

export const dynamic = "force-dynamic";

/** The highest-bounty captain, for the WANTED poster in the Ranked lobby. */
export async function GET() {
  try {
    if (!UPDATE_LIVE) throw new RequestProblem(404, "Coming soon.");
    return privateJson({ mostWanted: await readMostWanted() });
  } catch (err) {
    return failure(err);
  }
}
