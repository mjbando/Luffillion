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
  points: number;
  answeredAt: number;
}

export interface RankedRoundState {
  questionId: string;
  startedAt: number;
  endsAt: number;
  p1?: RankedRoundPick | null;
  p2?: RankedRoundPick | null;
  p1Attempts: number;
  p2Attempts: number;
  resolvedAt?: number;
  /** Round score loser (lower points) — for display only. */
  loser?: "p1" | "p2" | null;
  /** True when a player failed to answer the question correctly (loses a life). */
  p1Wrong?: boolean;
  p2Wrong?: boolean;
}

export interface RankedMatchResult {
  outcome: "p1" | "p2" | "draw";
  reason: "knockout" | "rounds" | "forfeit";
  p1: PlayerDeltaBreakdown;
  p2: PlayerDeltaBreakdown;
}

export interface RankedMatchState {
  p1: RankedPlayerCard;
  p2: RankedPlayerCard;
  questionIds: string[];
  roundIndex: number;
  roundStartAt: number;
  roundEndAt: number;
  rounds: Record<number, RankedRoundState>;
  result?: RankedMatchResult;
}

export interface RankedRoundView {
  roundNumber: number;
  prompt: string;
  hint: string;
  phase: "intro" | "answering" | "reveal";
  startsAt: number;
  endsAt: number;
  yourPick: RankedRoundPick | null;
  opponentLocked: boolean;
}

export interface RankedRoundReveal {
  roundNumber: number;
  prompt: string;
  yourPick: RankedRoundPick | null;
  opponentPick: RankedRoundPick | null;
  /** Round score loser (lower points) — for display only. */
  loser: "you" | "opponent" | null;
  /** Whether each player lost a life on this question (got it wrong). */
  youLostLife: boolean;
  opponentLostLife: boolean;
}

export interface RankedMatchView {
  id: string;
  status: "active" | "finished";
  youRole: "p1" | "p2";
  you: RankedPlayerCard;
  opponent: RankedPlayerCard;
  round: RankedRoundView | null;
  lastReveal: RankedRoundReveal | null;
  history: RankedRoundReveal[];
  result: {
    outcome: "win" | "loss" | "draw";
    reason: "knockout" | "rounds" | "forfeit";
    you: PlayerDeltaBreakdown;
    opponent: PlayerDeltaBreakdown;
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

export interface RankedChallengeView {
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

export interface RankedLobbyResponse {
  captain: Captain | null;
  profile: RankedPlayerCard | null;
  inQueue: boolean;
  onlineCount: number;
  onlinePlayers: OnlinePlayerSummary[];
  challenges: RankedChallengeView[];
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
