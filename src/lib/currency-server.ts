import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function creditCoins(tx: Tx, accountId: string, amount: number): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) return;
  await tx.update(accounts)
    .set({ coins: sql`${accounts.coins} + ${amount}` })
    .where(eq(accounts.id, accountId));
}