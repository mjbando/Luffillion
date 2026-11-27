// Reward codes: shared rules and types, safe for the browser.
import { TREASURE_CHESTS, type ChestRarity } from "./treasure";

/** Codes are 3-24 letters, digits or dashes, matched without caring about case or spaces. */
export const CODE_PATTERN = /^[A-Z0-9-]{3,24}$/;
export const CODE_MAX_BERRIES = 100_000;
export const CODE_MAX_CHESTS = 5;
export const CODE_MAX_DAYS = 365;

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

export function isChestRarity(value: unknown): value is ChestRarity {
  return typeof value === "string" && (TREASURE_CHESTS as readonly string[]).includes(value);
}

export interface CodeReward {
  berries: number;
  chestRarity: ChestRarity | null;
  chestCount: number;
  characterId: string | null;
}

/** Everything the creator sees about one code. */
export interface CodeSummary extends CodeReward {
  code: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  /** Worked out on the server when the list was loaded. */
  state: "live" | "off" | "expired" | "used-up";
}

/** "฿500 berries, 2 Legendary chests and Marco"-style text for a reward. */
export function describeReward(reward: CodeReward, characterName?: string | null): string {
  const parts: string[] = [];
  if (reward.berries > 0) parts.push(`${reward.berries.toLocaleString()} berries`);
  if (reward.chestRarity && reward.chestCount > 0) {
    const rarity = reward.chestRarity[0].toUpperCase() + reward.chestRarity.slice(1);
    parts.push(reward.chestCount === 1 ? `a ${rarity} chest` : `${reward.chestCount} ${rarity} chests`);
  }
  if (reward.characterId) parts.push(characterName ?? reward.characterId);
  if (parts.length <= 1) return parts[0] ?? "nothing";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}
