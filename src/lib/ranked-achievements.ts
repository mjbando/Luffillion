import type { ChestRarity } from "./treasure";

import type { RankTierInfo } from "./ranked";

/**
 * Rank chests: reaching each rank pays out a reward chest once, kept unopened until the player
 * opens it. Bronze is free for every captain.
 */
export interface RankedAchievementDef {
  id: `rank-${RankTierInfo["id"]}`;
  tier: RankTierInfo["id"];
  title: string;
  description: string;
  detail: string;
  chest: ChestRarity;
}

const rankChest = (tier: RankTierInfo["id"], name: string, chest: ChestRarity, detail: string): RankedAchievementDef => ({
  id: `rank-${tier}`,
  tier,
  title: `${name} Rank`,
  description: tier === "bronze" ? "Every captain starts in Bronze: this chest is on the house." : `Reach ${name} rank in Ranked.`,
  detail,
  chest,
});

export const RANKED_ACHIEVEMENTS: readonly RankedAchievementDef[] = [
  rankChest("bronze", "Bronze", "uncommon", "A free welcome chest for every captain."),
  rankChest("silver", "Silver", "uncommon", "Reach 250 RP. Ranked and bot battles both count."),
  rankChest("gold", "Gold", "rare", "Reach 500 RP. Ranked and bot battles both count."),
  rankChest("platinum", "Platinum", "epic", "Reach 1,000 RP. Ranked and bot battles both count."),
  rankChest("diamond", "Diamond", "epic", "Reach 2,000 RP. Ranked and bot battles both count."),
  rankChest("champion", "Champion", "legendary", "Reach 3,000 RP. Ranked and bot battles both count."),
  rankChest("legend", "Legend", "mythic", "Reach 5,000 RP. Ranked and bot battles both count."),
];

/** reward_chests.source for rank chests (ref = rank tier id). */
export const RANK_CHEST_SOURCE = "ranked-rank";
/** reward_chests.source for the retired win-streak chests (ref = old achievement id). */
export const RANKED_REWARD_SOURCE = "ranked-ach";
const LEGACY_STREAK_CHEST_TITLES: Record<string, string> = {
  "ranked-streak-3": "Winning Streak",
  "ranked-streak-5": "Unbeatable Crew",
  "ranked-streak-10": "Conqueror's Haki",
};

export interface RankedAchievementStatus extends RankedAchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  /** RP needed to reach this rank. */
  minPoints: number;
  /** The captain's current RP, capped at minPoints. */
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
  if (source === RANK_CHEST_SOURCE) {
    const def = RANKED_ACHIEVEMENTS.find((a) => a.tier === ref);
    if (def) return `Ranked · ${def.title}`;
  }
  if (source === RANKED_REWARD_SOURCE && LEGACY_STREAK_CHEST_TITLES[ref]) return `Ranked · ${LEGACY_STREAK_CHEST_TITLES[ref]}`;
  if (source === "code") return `Code · ${ref.split(":")[0]}`;
  return "Reward";
}

/**
 * Ranked achievements that pay berries (the chest currency). Unlocks are recorded in
 * achievement_unlocks under these ids; the reward is claimed into the berry ledger
 * (source "ranked-badge", ref = id), so it can only ever be paid once.
 */
export type RankedBerryGoal = "wins" | "streak" | "comeback" | "day-most-wanted" | "day-top3" | "luffillion" | "giant-slayer" | "showdowns" | "crew" | "straw-hats";

/** The base version of every Straw Hat: owning all of them earns "Straw Hat Crew". */
export const STRAW_HAT_CREW = ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe-warlord"] as const;
export interface RankedBerryAchievementDef {
  id: string;
  title: string;
  description: string;
  detail: string;
  berries: number;
  goal: RankedBerryGoal;
  target: number;
}

export const RANKED_BERRY_ACHIEVEMENTS: readonly RankedBerryAchievementDef[] = [
  { id: "ranked-wins-1", goal: "wins", target: 1, berries: 50, title: "First Blood",
    description: "Win a ranked battle.",
    detail: "Any ranked win counts, including bot battles. Friendly battles don't." },
  { id: "ranked-wins-10", goal: "wins", target: 10, berries: 100, title: "Rising Rookie",
    description: "Win 10 ranked battles.",
    detail: "Total ranked wins, not in a row. Bot battles count; friendly battles don't." },
  { id: "ranked-wins-50", goal: "wins", target: 50, berries: 250, title: "Supernova",
    description: "Win 50 ranked battles.",
    detail: "Total ranked wins, not in a row. Bot battles count; friendly battles don't." },
  { id: "ranked-wins-100", goal: "wins", target: 100, berries: 1_000, title: "Pirate Emperor",
    description: "Win 100 ranked battles.",
    detail: "Total ranked wins, not in a row. Bot battles count; friendly battles don't." },
  { id: "ranked-streak-3", goal: "streak", target: 3, berries: 100, title: "Winning Streak",
    description: "Win 3 ranked battles in a row.",
    detail: "Three ranked wins without a loss in between. Bot battles count; draws don't break the streak; friendly battles don't count." },
  { id: "ranked-streak-5", goal: "streak", target: 5, berries: 200, title: "Unbeatable Crew",
    description: "Win 5 ranked battles in a row.",
    detail: "Five ranked wins without a loss in between. Bot battles count; draws don't break the streak; friendly battles don't count." },
  { id: "ranked-streak-10", goal: "streak", target: 10, berries: 500, title: "Conqueror's Haki",
    description: "Win 10 ranked battles in a row.",
    detail: "Ten ranked wins without a loss in between. Bot battles count; draws don't break the streak; friendly battles don't count." },
  { id: "ranked-comeback", goal: "comeback", target: 1, berries: 100, title: "Never Give Up",
    description: "Win a ranked battle after being down to 1 life while your opponent had all 3.",
    detail: "Fall to your last life while your opponent still has 3, then come back and win. Ranked battles only." },
  { id: "ranked-day-most-wanted", goal: "day-most-wanted", target: 1, berries: 1_000, title: "Most Wanted at Dawn",
    description: "End the day as the Most Wanted captain (#1 on the ranked leaderboard).",
    detail: "Be #1 on the ranked leaderboard when the day ends at midnight Eastern. It's awarded the next time you open your achievements." },
  { id: "ranked-day-top3", goal: "day-top3", target: 1, berries: 500, title: "Podium Finish",
    description: "End the day in the top 3 of the ranked leaderboard.",
    detail: "Be in the top 3 of the ranked leaderboard when the day ends at midnight Eastern. It's awarded the next time you open your achievements." },
  { id: "ranked-luffillion", goal: "luffillion", target: 1, berries: 300, title: "One in a Luffillion",
    description: "Land a One in a Luffillion answer in a ranked battle.",
    detail: "Any 100-point pull in a ranked or bot battle counts. Friendly battles don't." },
  { id: "ranked-giant-slayer", goal: "giant-slayer", target: 1, berries: 250, title: "Giant Slayer",
    description: "Win a ranked battle against an opponent in a higher rank.",
    detail: "Your opponent's rank must be above yours when the battle starts." },
  { id: "ranked-showdowns-3", goal: "showdowns", target: 3, berries: 100, title: "Showdown King",
    description: "Win 3 Showdowns in a row.",
    detail: "Ranked Showdowns only. Losing a Showdown resets the count; a standoff doesn't." },
  { id: "crew-5", goal: "crew", target: 5, berries: 100, title: "Crew Assembled",
    description: "Unlock 5 characters.",
    detail: "Every character you own counts, from chests or old achievements. Your starting Luffy doesn't." },
  { id: "crew-10", goal: "crew", target: 10, berries: 250, title: "Growing Fleet",
    description: "Unlock 10 characters.",
    detail: "Every character you own counts, from chests or old achievements. Your starting Luffy doesn't." },
  { id: "crew-25", goal: "crew", target: 25, berries: 500, title: "Grand Fleet",
    description: "Unlock 25 characters.",
    detail: "Every character you own counts, from chests or old achievements. Your starting Luffy doesn't." },
  { id: "straw-hat-crew", goal: "straw-hats", target: STRAW_HAT_CREW.length, berries: 1_000, title: "Straw Hat Crew",
    description: "Recruit the whole Straw Hat crew.",
    detail: "The base version of every Straw Hat: Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook and Jinbe. Other forms don't count." },
];

export interface RankedBerryAchievementStatus extends RankedBerryAchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  claimed: boolean;
  progress: number;
}

/** Bounty milestones: reaching each bounty total pays berries once (claimed in the Ranked menu). */
export const BOUNTY_MILESTONES: readonly { bounty: number; berries: number }[] = [
  { bounty: 50_000, berries: 50 },
  { bounty: 100_000, berries: 50 },
  { bounty: 250_000, berries: 100 },
  { bounty: 500_000, berries: 100 },
  { bounty: 1_000_000, berries: 250 },
  { bounty: 1_500_000, berries: 250 },
  { bounty: 2_000_000, berries: 500 },
  { bounty: 3_000_000, berries: 500 },
  { bounty: 5_000_000, berries: 1_000 },
];

export interface MilestoneStatus { bounty: number; berries: number; reached: boolean; claimed: boolean }
export interface MilestoneReport { bounty: number; milestones: MilestoneStatus[] }
