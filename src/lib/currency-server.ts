import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, coinLedger } from "@/db/schema";
import type { CoinSource } from "./coins";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CoinAward {
  source: CoinSource;
  /** Stable id of the thing being rewarded: a day key, level number, match id or achievement id. */
  ref: string;
  amount: number;
}

/**
 * Pays each award at most once. The ledger's primary key (account, source, ref)
 * makes retries, replays and the historical backfill idempotent: only rows that
 * are newly inserted are added to the captain's balance. Returns coins paid.
 */
export async function creditCoins(tx: Tx, accountId: string, awards: CoinAward | CoinAward[]): Promise<number> {
  const rows = (Array.isArray(awards) ? awards : [awards])
    .filter((award) => Number.isSafeInteger(award.amount) && award.amount > 0 && award.ref)
    .map((award) => ({ accountId, source: award.source, ref: award.ref.slice(0, 64), amount: award.amount }));
  if (!rows.length) return 0;

  const inserted = await tx.insert(coinLedger).values(rows).onConflictDoNothing()
    .returning({ amount: coinLedger.amount });
  const total = inserted.reduce((sum, row) => sum + row.amount, 0);
  if (total > 0) {
    await tx.update(accounts)
      .set({ coins: sql`${accounts.coins} + ${total}` })
      .where(eq(accounts.id, accountId));
  }
  return total;
}
