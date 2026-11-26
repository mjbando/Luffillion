import { characterReward } from "@/data/playable-characters";

// Shared coin economy rules. `scripts/migrate-treasure-shop.sql` mirrors these
// values for the one-time historical backfill — keep the two in sync.
export const COINS_PER_RANKED_WIN = 10;
export const COINS_PER_ADVENTURE_LEVEL = 10;
export const COINS_PER_DAILY_VOYAGE = 10;

export const ACHIEVEMENT_GRADE_COINS = {
  Crew: 25,
  Elite: 50,
  Legendary: 100,
  Mythic: 250,
} as const;

/** Each source + reference pair can be paid out at most once per captain. */
export type CoinSource = "daily" | "adventure" | "ranked" | "achievement";

export function coinsForAchievement(achievementId: string): number {
  const grade = characterReward(achievementId)?.grade;
  return grade && grade in ACHIEVEMENT_GRADE_COINS
    ? ACHIEVEMENT_GRADE_COINS[grade as keyof typeof ACHIEVEMENT_GRADE_COINS]
    : 0;
}
