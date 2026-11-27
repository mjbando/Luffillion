// Shared coin economy rules. `scripts/migrate-treasure-shop.sql` mirrors these
// values for the one-time historical backfill — keep the two in sync.
export const COINS_PER_RANKED_WIN = 10;
export const COINS_PER_ADVENTURE_LEVEL = 10;
export const COINS_PER_DAILY_VOYAGE = 10;

/** Each source + reference pair can be paid out at most once per captain. */
/** ("achievement" stays valid for ledger rows paid before achievements switched to bounty.) */
export type CoinSource = "daily" | "adventure" | "ranked" | "achievement";
