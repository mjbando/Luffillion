import { lt, gt, sql } from "drizzle-orm";
import type { db } from "@/db";
import { sitePresence } from "@/db/schema";

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/** The counter always starts here; every visitor currently on the site adds one. */
export const ONLINE_BASE = 12;
/** A visitor counts as online for this long after their last heartbeat (pages ping every 30 s). */
export const PRESENCE_WINDOW_MS = 70_000;

export async function touchPresence(tx: Executor, visitorKey: string) {
  const now = new Date();
  await tx.insert(sitePresence).values({ visitorKey, lastSeenAt: now })
    .onConflictDoUpdate({ target: sitePresence.visitorKey, set: { lastSeenAt: now } });
  // Occasionally sweep visitors who left long ago so the table stays small.
  if (Math.random() < 0.02) {
    await tx.delete(sitePresence).where(lt(sitePresence.lastSeenAt, new Date(now.getTime() - 86_400_000)));
  }
}

export async function onlineCaptains(tx: Executor): Promise<number> {
  const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(sitePresence)
    .where(gt(sitePresence.lastSeenAt, new Date(Date.now() - PRESENCE_WINDOW_MS)));
  return ONLINE_BASE + count;
}
