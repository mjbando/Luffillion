import type { ChestRarity } from "./treasure";

/** Ranked achievements: each pays out a reward chest once, kept unopened until the player opens it. */
export interface RankedAchievementDef {
  id: "ranked-streak-3" | "ranked-streak-5" | "ranked-streak-10";
  title: string;
  description: string;
  detail: string;
  streak: number;
  chest: ChestRarity;
}

export const RANKED_ACHIEVEMENTS: readonly RankedAchievementDef[] = [
  {
    id: "ranked-streak-3",
    title: "Winning Streak",
    description: "Win 3 ranked battles in a row.",
    detail: "Three ranked wins without a loss in between. Draws don't break the streak; friendly battles don't count.",
    streak: 3,
    chest: "uncommon",
  },
  {
    id: "ranked-streak-5",
    title: "Unbeatable Crew",
    description: "Win 5 ranked battles in a row.",
    detail: "Five ranked wins without a loss in between. Draws don't break the streak; friendly battles don't count.",
    streak: 5,
    chest: "rare",
  },
  {
    id: "ranked-streak-10",
    title: "Conqueror's Haki",
    description: "Win 10 ranked battles in a row.",
    detail: "Ten ranked wins without a loss in between. Draws don't break the streak; friendly battles don't count.",
    streak: 10,
    chest: "legendary",
  },
];

/** reward_chests.source for ranked achievement chests (ref = achievement id). */
export const RANKED_REWARD_SOURCE = "ranked-ach";

export interface RankedAchievementStatus extends RankedAchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  /** Id of the reward chest if it is still waiting to be opened. */
  unopenedChestId: string | null;
}

export interface UnopenedChest {
  id: string;
  chestRarity: ChestRarity;
  source: string;
  ref: string;
  label: string;
  createdAt: string;
}

export function rewardChestLabel(source: string, ref: string): string {
  if (source === RANKED_REWARD_SOURCE) {
    const def = RANKED_ACHIEVEMENTS.find((a) => a.id === ref);
    if (def) return `Ranked · ${def.title}`;
  }
  return "Reward";
}
