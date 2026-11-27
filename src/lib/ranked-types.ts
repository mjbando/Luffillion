import type { Tier } from "@/data/tiers";
import type { CharacterId } from "@/data/playable-characters";
import type { Captain } from "./voyage";
import type { PlayerDeltaBreakdown, RankTierInfo } from "./ranked";

export interface RankedPlayerCard {
  accountId: string;
  username: string;
  title: string;
  bounty: number;
  rankPoints: number;
  rankTier: RankTierInfo["id"];
  rankName: string;
  winStreak: number;
  wins: number;
  losses: number;
  draws: number;
  characterId: CharacterId;
  lives: number;
}

export interface RankedRoundPick {
  answer: string;
  tier: Tier;
  answeredAt: number;
}

export interface RankedRoundState {
  questionId: string;
  startedAt: number;
  endsAt: number;
  p1EndsAt?: number;
  p2EndsAt?: number;
  p1BonusSeconds?: number;
  p2BonusSeconds?: number;
  p1?: RankedRoundPick | null;
  p2?: RankedRoundPick | null;
  p1Attempts: number;
  p2Attempts: number;
  resolvedAt?: number;
  /** Who lost a life this round ("both" when neither player answered). */
  loser?: "p1" | "p2" | "both" | null;
  /** Showdown round: when both answer, the less niche pull loses a life. */
  showdown?: boolean;
  /** Bot battles only: the bot's planned answer (applied at answeredAt), or null if it will miss. Never sent to clients. */
  botPick?: RankedRoundPick | null;
}

export interface RankedMatchResult {
  outcome: "p1" | "p2" | "draw";
  reason: "knockout" | "rounds" | "forfeit";
  p1: PlayerDeltaBreakdown;
  p2: PlayerDeltaBreakdown;
  /** Ranked achievement ids newly earned in this match (each drops a reward chest). */
  rewards?: { p1: string[]; p2: string[] };
}

export interface RankedMatchState {
  mode?: "ranked" | "friendly" | "bot";
  p1: RankedPlayerCard;
  p2: RankedPlayerCard;
  questionIds: string[];
  roundIndex: number;
  roundStartAt: number;
  roundEndAt: number;
  rounds: Record<number, RankedRoundState>;
  /** Consecutive normal rounds where both players answered correctly. */
  bothAnsweredStreak?: number;
  result?: RankedMatchResult;
}

export interface RankedRoundView {
  roundNumber: number;
  prompt: string;
  hint: string;
  phase: "intro" | "answering" | "reveal";
  startsAt: number;
  endsAt: number;
  bonusSeconds: number;
  yourPick: RankedRoundPick | null;
  opponentLocked: boolean;
  showdown: boolean;
}

export interface RankedRoundReveal {
  roundNumber: number;
  prompt: string;
  yourPick: RankedRoundPick | null;
  opponentPick: RankedRoundPick | null;
  loser: "you" | "opponent" | "both" | null;
  showdown: boolean;
}

export interface RankedMatchView {
  id: string;
  status: "active" | "finished";
  mode: "ranked" | "friendly" | "bot";
  youRole: "p1" | "p2";
  you: RankedPlayerCard;
  opponent: RankedPlayerCard;
  round: RankedRoundView | null;
  lastReveal: RankedRoundReveal | null;
  history: RankedRoundReveal[];
  /** Progress toward the next Showdown (0 to RANKED_SHOWDOWN_STREAK). */
  showdownMeter: number;
  result: {
    outcome: "win" | "loss" | "draw";
    reason: "knockout" | "rounds" | "forfeit";
    you: PlayerDeltaBreakdown;
    opponent: PlayerDeltaBreakdown;
    rewards: string[];
  } | null;
}

export interface OnlinePlayerSummary {
  accountId: string;
  username: string;
  title: string;
  bounty: number;
  rankPoints: number;
  rankTier: RankTierInfo["id"];
  rankName: string;
  winStreak: number;
  characterId: CharacterId;
  inMatch: boolean;
  inQueue: boolean;
}

/** A friend (or an exact-username search hit) for friendly battles. */
export interface FriendSummary extends OnlinePlayerSummary {
  online: boolean;
  isFriend: boolean;
}

export interface RankedFriendlyInviteView {
  id: string;
  direction: "incoming" | "outgoing";
  opponent: OnlinePlayerSummary;
  expiresAt: number;
}

export interface RankedLeaderboardEntry {
  rank: number;
  accountId: string;
  username: string;
  title: string;
  bounty: number;
  rankPoints: number;
  rankTier: RankTierInfo["id"];
  rankName: string;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  characterId: CharacterId;
  isYou: boolean;
}

export interface RankedPublicAchievement {
  id: string;
  title: string;
  description: string;
  emblem: import("@/data/achievement-emblems").EmblemKind;
  unlockedAt: string;
}

export interface RankedPublicProfile {
  accountId: string;
  username: string;
  title: string;
  bounty: number;
  rankPoints: number;
  rankTier: RankTierInfo["id"];
  rankName: string;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestStreak: number;
  characterId: CharacterId;
  achievements: RankedPublicAchievement[];
}

export interface RankedLobbyResponse {
  captain: Captain | null;
  profile: RankedPlayerCard | null;
  inQueue: boolean;
  onlineCount: number;
  /** Your friends list (online first). Nobody else is listed. */
  friends: FriendSummary[];
  /** Exact username match for the search box, or null. */
  searchResult: FriendSummary | null;
  friendlyInvites: RankedFriendlyInviteView[];
  activeMatch: RankedMatchView | null;
  recentMatches: RankedMatchView[];
  leaderboard: RankedLeaderboardEntry[];
  serverNow: number;
  feedback?: {
    kind: "correct" | "wrong";
    suggestion?: string | null;
    pick?: RankedRoundPick;
  };
}
