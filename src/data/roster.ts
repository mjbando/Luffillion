import { CHEST_CHARACTERS, CHEST_POOLS, CHEST_RARITIES, type ChestCharacterRarity } from "./chest-characters";
import { PLAYABLE_CHARACTERS, type AchievementCharacterId, type CharacterId } from "./playable-characters";

/**
 * With the treasure update, achievements pay bounty instead of characters, and the former
 * achievement recruits join the chest prize pool at the rarity matching their old grade.
 * Captains who already earned one through an achievement keep it.
 */
export const FORMER_ACHIEVEMENT_RARITY: Partial<Record<AchievementCharacterId, ChestCharacterRarity>> = {
  chopper: "rare",
  zoro: "rare",
  nami: "rare",
  usopp: "rare",
  sanji: "epic",
  robin: "epic",
  jinbe: "epic",
  ace: "epic",
  kaido: "mythic",
  roger: "mythic",
  "gear-5": "mythic",
};

/**
 * Former achievement recruits taken out of the game (they repeated a Mythic or another Legendary):
 * they never drop from chests or codes and aren't listed, but captains who already earned one keep it.
 */
export const RETIRED_RECRUITS: ReadonlySet<string> = new Set(["law", "rayleigh", "whitebeard", "shanks"]);

export interface RosterEntry {
  id: CharacterId;
  name: string;
  shortName: string;
  color: string;
  rarity: ChestCharacterRarity;
  /** The achievement that used to award this character (old unlocks still grant ownership). */
  legacyAchievementId: string | null;
}

const FORMER: RosterEntry[] = PLAYABLE_CHARACTERS.flatMap((c) => {
  const rarity = FORMER_ACHIEVEMENT_RARITY[c.id];
  return rarity ? [{ id: c.id, name: c.name, shortName: c.shortName, color: c.color, rarity, legacyAchievementId: c.achievementId }] : [];
});

/** Everything a Treasure Chest can drop: the chest-only crew plus the former achievement recruits. */
export const TREASURE_ROSTER: readonly RosterEntry[] = CHEST_RARITIES.flatMap((rarity) => [
  ...FORMER.filter((c) => c.rarity === rarity),
  ...CHEST_CHARACTERS.filter((c) => c.rarity === rarity).map((c) => ({
    id: c.id, name: c.name, shortName: c.shortName, color: c.color, rarity, legacyAchievementId: null,
  })),
]);

export const TREASURE_POOLS: Record<ChestCharacterRarity, readonly CharacterId[]> = Object.fromEntries(
  CHEST_RARITIES.map((rarity) => [rarity, [...FORMER.filter((c) => c.rarity === rarity).map((c) => c.id), ...CHEST_POOLS[rarity]]]),
) as unknown as Record<ChestCharacterRarity, readonly CharacterId[]>;

export function rosterEntry(id: string): RosterEntry | undefined {
  return TREASURE_ROSTER.find((c) => c.id === id);
}

/** Former achievement recruits (retired ones included): ownership still counts for these. */
export function isFormerAchievementCharacter(id: string): boolean {
  return id in FORMER_ACHIEVEMENT_RARITY || RETIRED_RECRUITS.has(id);
}
