// Berry economy rules. Berries are the chest currency; they are stored in the
// legacy `coins` column / `coin_ledger` table. Every captain starts with 0.
export const COINS_PER_RANKED_WIN = 5;
export const COINS_PER_ADVENTURE_LEVEL = 10;
export const COINS_PER_DAILY_VOYAGE = 10;

/**
 * Each source + reference pair can be paid out at most once per captain.
 * ("achievement" stays valid for ledger rows written before achievements switched to bounty.)
 */
export type CoinSource = "daily" | "adventure" | "ranked" | "achievement" | "milestone" | "ranked-badge";

/** Display helper for the chest currency: berriesLabel(120) = "120 berries". */
export const berriesLabel = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "berry" : "berries"}`;
