import { CHEST_POOLS, type ChestCharacterId } from "@/data/chest-characters";

export const TREASURE_CHESTS = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type ChestRarity = (typeof TREASURE_CHESTS)[number];
export type TreasureRarity = ChestRarity;

export const TREASURE_RARITIES: TreasureRarity[] = ["mythic", "legendary", "epic", "rare", "uncommon", "common"];

export const CHEST_PRICES: Record<ChestRarity, number> = {
  common: 50,
  uncommon: 200,
  rare: 500,
  epic: 1000,
  legendary: 2000,
  mythic: 3000,
};

const CHEST_ODDS_BPS: Record<ChestRarity, Record<TreasureRarity, number>> = {
  common: { mythic: 10, legendary: 50, epic: 300, rare: 500, uncommon: 2000, common: 7000 },
  uncommon: { mythic: 50, legendary: 100, epic: 500, rare: 1000, uncommon: 6000, common: 2000 },
  rare: { mythic: 100, legendary: 300, epic: 1000, rare: 5500, uncommon: 2000, common: 1000 },
  epic: { mythic: 500, legendary: 1000, epic: 5000, rare: 2000, uncommon: 1000, common: 500 },
  legendary: { mythic: 1000, legendary: 5000, epic: 2000, rare: 1000, uncommon: 500, common: 100 },
  mythic: { mythic: 2500, legendary: 7500, epic: 0, rare: 0, uncommon: 0, common: 0 },
};

/** Chest drops come only from the chest-only roster — never from achievement rewards. */
export const CHARACTER_POOLS: Record<TreasureRarity, readonly ChestCharacterId[]> = CHEST_POOLS;

export const TREASURE_RARITY_COLORS: Record<TreasureRarity, string> = {
  common: "#cbd5e1",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#fb7185",
};

/**
 * Odds in basis points (1/100 of a percent), always totalling exactly 10,000.
 * Some published tables add up to less than 100% (e.g. Legendary = 96%), so the
 * leftover chance goes to the chest's own rarity rather than to Common.
 */
export function chestOdds(chest: ChestRarity): Record<TreasureRarity, number> {
  const odds = { ...CHEST_ODDS_BPS[chest] };
  const remainder = 10_000 - Object.values(odds).reduce((sum, value) => sum + value, 0);
  odds[chest] += remainder;
  return odds;
}

/** Maps a ticket in [0, 10000) to a reward rarity, rarest first. */
export function rollRarity(chest: ChestRarity, ticket: number): TreasureRarity {
  const odds = chestOdds(chest);
  let cursor = 0;
  for (const rarity of TREASURE_RARITIES) {
    cursor += odds[rarity];
    if (ticket < cursor) return rarity;
  }
  return chest;
}

/** Ordinal rank used for animation intensity: common = 0 … mythic = 5. */
export function rarityRank(rarity: TreasureRarity): number {
  return TREASURE_CHESTS.indexOf(rarity);
}
