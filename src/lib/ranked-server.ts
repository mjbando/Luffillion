import { and, desc, eq, gt, gte, ilike, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, achievementUnlocks, adventureProgress, bounties, rankedChallenges, rankedFriends, rankedMatches, rankedProfiles } from "@/db/schema";
import { adventureTitle } from "@/data/adventure/levels";
import { isCharacterId, DEFAULT_CHARACTER, type CharacterId } from "@/data/playable-characters";
import type { Tier } from "@/data/tiers";
import { ORIGINAL_QUESTIONS, type Question } from "@/data/questions";
import { ACHIEVEMENTS } from "./achievements";
import { grantRankedStreakChests } from "./treasure-server";
import { onlineCaptains, touchPresence } from "./presence-server";
import { checkGuess, getQuestionById, parseEntries, suggestGuess } from "./daily";
import { RequestProblem } from "./account-server";
import { COINS_PER_RANKED_WIN } from "./coins";
import { creditCoins } from "./currency-server";
import {
  RANKED_INTRO_MS,
  RANKED_MAX_ROUNDS,
  RANKED_ROUND_CAP,
  RANKED_SHOWDOWN_REVEAL_MS,
  RANKED_SHOWDOWN_STREAK,
  RANKED_REVEAL_MS,
  RANKED_SECONDS,
  RANKED_STARTING_LIVES,
  RANKED_TIER_BONUS_SECONDS,
  RANK_TIERS,
  RANKED_MAX_TIER_GAP,
  computeBotDelta,
  computeSingleDelta,
  rankIndexFor,
  rankTierFor,
} from "./ranked";
import type {
  OnlinePlayerSummary,
  FriendSummary,
  RankedFriendlyInviteView,
  RankedLeaderboardEntry,
  RankedLobbyResponse,
  RankedMatchState,
  RankedMatchView,
  RankedPlayerCard,
  RankedRoundPick,
  RankedPublicProfile,
  RankedRoundReveal,
  RankedRoundState,
} from "./ranked-types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type MatchRow = typeof rankedMatches.$inferSelect;

const ONLINE_MS = 45_000;
const CHALLENGE_TTL_MS = 60_000;
const MATCH_STALE_ABORT_MS = 3 * 60_000;

// ---------- Practice bot (offered when matchmaking takes a while) ----------
const BOT_USERNAME_KEY = "~marine-bot";
const BOT_CREWMATES: readonly [string, CharacterId][] = [
  ["Koby", "koby" as CharacterId],
  ["Helmeppo", "helmeppo" as CharacterId],
  ["Smoker", "smoker" as CharacterId],
  ["Fullbody", "fullbody" as CharacterId],
];
const BOT_TIER_WEIGHTS: Record<Tier, number> = { common: 45, uncommon: 28, rare: 16, epic: 9, luffillion: 2 };

/** The bot is a real (unloginable) account so match foreign keys hold; it never gets a ranked profile. */
async function ensureBotAccount(tx: Tx): Promise<string> {
  const [found] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.usernameKey, BOT_USERNAME_KEY)).limit(1);
  if (found) return found.id;
  await tx.insert(accounts).values({
    username: "Marine Bot",
    usernameKey: BOT_USERNAME_KEY,
    // A well-formed hash that no password derives to, so nobody can sign in as the bot.
    passwordHash: `s1:${"00".repeat(16)}:${"00".repeat(64)}`,
  }).onConflictDoNothing();
  const [made] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.usernameKey, BOT_USERNAME_KEY)).limit(1);
  return made.id;
}

/** Decide the bot's answer for a round: usually right, sometimes misses (which costs it a life). */
function planBotPick(questionId: string, startedAt: number, endsAt: number, showdown: boolean): RankedRoundPick | null {
  const chance = showdown ? 0.7 : 0.78;
  if (Math.random() >= chance) return null;
  const question = getQuestionById(questionId);
  if (!question) return null;
  const entries = parseEntries(question);
  if (!entries.length) return null;
  const tiers = [...new Set(entries.map((e) => e.tier))];
  const total = tiers.reduce((sum, t) => sum + BOT_TIER_WEIGHTS[t], 0);
  let roll = Math.random() * total;
  let tier = tiers[0];
  for (const t of tiers) {
    roll -= BOT_TIER_WEIGHTS[t];
    if (roll < 0) { tier = t; break; }
  }
  const options = entries.filter((e) => e.tier === tier);
  const pick = options[Math.floor(Math.random() * options.length)];
  const latest = Math.max(startedAt + 2500, endsAt - 1200);
  const answeredAt = Math.round(startedAt + 2500 + Math.random() * (latest - startedAt - 2500));
  return { answer: pick.name, tier: pick.tier, answeredAt };
}

async function createBotMatch(tx: Tx, humanId: string): Promise<MatchRow> {
  await lockAccounts(tx, [humanId]);
  const [existing] = await tx
    .select({ id: rankedMatches.id })
    .from(rankedMatches)
    .where(and(eq(rankedMatches.status, "active"), or(eq(rankedMatches.player1Id, humanId), eq(rankedMatches.player2Id, humanId))))
    .limit(1);
  if (existing) throw new RequestProblem(409, "You're already in an active match.");
  const botId = await ensureBotAccount(tx);
  const human = await buildPlayerCard(tx, humanId, RANKED_STARTING_LIVES);
  const [name, characterId] = BOT_CREWMATES[Math.floor(Math.random() * BOT_CREWMATES.length)];
  const bot: RankedPlayerCard = {
    accountId: botId,
    username: `Bot · ${name}`,
    title: "Marine Training Bot",
    bounty: 0,
    rankPoints: human.rankPoints,
    rankTier: human.rankTier,
    rankName: human.rankName,
    winStreak: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    characterId: isCharacterId(characterId) ? characterId : DEFAULT_CHARACTER,
    lives: RANKED_STARTING_LIVES,
  };

  const now = Date.now();
  const roundStartAt = now + RANKED_INTRO_MS;
  const roundEndAt = roundStartAt + RANKED_SECONDS * 1000;
  const questions = pickMatchQuestions();
  const state: RankedMatchState = {
    mode: "bot",
    p1: human,
    p2: bot,
    questionIds: questions.map((q) => q.id),
    roundIndex: 0,
    roundStartAt,
    roundEndAt,
    rounds: {
      0: {
        questionId: questions[0].id,
        startedAt: roundStartAt,
        endsAt: roundEndAt,
        p1EndsAt: roundEndAt,
        p2EndsAt: roundEndAt,
        p1BonusSeconds: 0,
        p2BonusSeconds: 0,
        p1: null,
        p2: null,
        p1Attempts: 0,
        p2Attempts: 0,
        botPick: planBotPick(questions[0].id, roundStartAt, roundEndAt, false),
      },
    },
  };

  await tx.update(rankedProfiles).set({ queuedAt: null, updatedAt: new Date(now) }).where(eq(rankedProfiles.accountId, humanId));
  await tx
    .update(rankedChallenges)
    .set({ status: "cancelled" })
    .where(and(eq(rankedChallenges.status, "pending"), or(eq(rankedChallenges.fromAccountId, humanId), eq(rankedChallenges.toAccountId, humanId))));
  const [created] = await tx.insert(rankedMatches).values({ player1Id: humanId, player2Id: botId, status: "active", state }).returning();
  return created;
}

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

function pickMatchQuestions(): Question[] {
  const pool = [...ORIGINAL_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Prefer questions with plenty of answers so a 10-second duel feels rich and fair.
  const rich = pool.filter((q) => Object.values(q.tiers).flat().length >= 12);
  const rest = pool.filter((q) => Object.values(q.tiers).flat().length < 12);
  return [...rich, ...rest].slice(0, RANKED_MAX_ROUNDS);
}

/** Overtime needs more questions than the regulation set: pick an unused one. */
function extraQuestionId(used: string[]): string {
  const seen = new Set(used);
  const rich = ORIGINAL_QUESTIONS.filter((q) => !seen.has(q.id) && Object.values(q.tiers).flat().length >= 12);
  const pool = rich.length ? rich : ORIGINAL_QUESTIONS.filter((q) => !seen.has(q.id));
  const list = pool.length ? pool : ORIGINAL_QUESTIONS;
  return list[Math.floor(Math.random() * list.length)].id;
}

async function lockAccounts(tx: Tx, ids: string[]) {
  const unique = [...new Set(ids)].sort();
  for (const id of unique) {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).for("update");
  }
}

async function ensureRankedProfile(tx: Tx, accountId: string) {
  await tx.insert(rankedProfiles).values({ accountId }).onConflictDoNothing();
}

async function buildPlayerCard(tx: Tx, accountId: string, lives = RANKED_STARTING_LIVES): Promise<RankedPlayerCard> {
  await ensureRankedProfile(tx, accountId);
  const [row] = await tx
    .select({
      accountId: accounts.id,
      username: accounts.username,
      equippedCharacter: accounts.equippedCharacter,
      points: rankedProfiles.points,
      wins: rankedProfiles.wins,
      losses: rankedProfiles.losses,
      draws: rankedProfiles.draws,
      winStreak: rankedProfiles.winStreak,
      bounty: bounties.total,
      advCompleted: adventureProgress.completed,
    })
    .from(accounts)
    .innerJoin(rankedProfiles, eq(rankedProfiles.accountId, accounts.id))
    .leftJoin(bounties, eq(bounties.accountId, accounts.id))
    .leftJoin(adventureProgress, eq(adventureProgress.accountId, accounts.id))
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!row) throw new RequestProblem(404, "Captain account not found.");
  const tier = rankTierFor(row.points);
  return {
    accountId: row.accountId,
    username: row.username,
    title: adventureTitle(row.advCompleted ?? 0),
    bounty: row.bounty ?? 0,
    rankPoints: row.points,
    rankTier: tier.id,
    rankName: tier.name,
    winStreak: row.winStreak,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    characterId: isCharacterId(row.equippedCharacter) ? row.equippedCharacter : DEFAULT_CHARACTER,
    lives,
  };
}

async function createMatch(tx: Tx, p1Id: string, p2Id: string, mode: "ranked" | "friendly" = "ranked"): Promise<MatchRow> {
  await lockAccounts(tx, [p1Id, p2Id]);
  // Ensure neither captain already entered an active match.
  const [existing] = await tx
    .select({ id: rankedMatches.id })
    .from(rankedMatches)
    .where(
      and(
        eq(rankedMatches.status, "active"),
        or(
          eq(rankedMatches.player1Id, p1Id),
          eq(rankedMatches.player2Id, p1Id),
          eq(rankedMatches.player1Id, p2Id),
          eq(rankedMatches.player2Id, p2Id),
        ),
      ),
    )
    .limit(1);
  if (existing) throw new RequestProblem(409, "One of the captains is already in an active match.");

  const [p1Card, p2Card] = await Promise.all([
    buildPlayerCard(tx, p1Id, RANKED_STARTING_LIVES),
    buildPlayerCard(tx, p2Id, RANKED_STARTING_LIVES),
  ]);

  const now = Date.now();
  const roundStartAt = now + RANKED_INTRO_MS;
  const roundEndAt = roundStartAt + RANKED_SECONDS * 1000;
  const questions = pickMatchQuestions();

  const state: RankedMatchState = {
    mode,
    p1: p1Card,
    p2: p2Card,
    questionIds: questions.map((q) => q.id),
    roundIndex: 0,
    roundStartAt,
    roundEndAt,
    rounds: {
      0: {
        questionId: questions[0].id,
        startedAt: roundStartAt,
        endsAt: roundEndAt,
        p1EndsAt: roundEndAt,
        p2EndsAt: roundEndAt,
        p1BonusSeconds: 0,
        p2BonusSeconds: 0,
        p1: null,
        p2: null,
        p1Attempts: 0,
        p2Attempts: 0,
      },
    },
  };

  await tx
    .update(rankedProfiles)
    .set({ queuedAt: null, updatedAt: new Date(now) })
    .where(inArray(rankedProfiles.accountId, [p1Id, p2Id]));

  await tx
    .update(rankedChallenges)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(rankedChallenges.status, "pending"),
        or(
          inArray(rankedChallenges.fromAccountId, [p1Id, p2Id]),
          inArray(rankedChallenges.toAccountId, [p1Id, p2Id]),
        ),
      ),
    );

  const [created] = await tx
    .insert(rankedMatches)
    .values({
      player1Id: p1Id,
      player2Id: p2Id,
      status: "active",
      state,
    })
    .returning();

  return created;
}

async function finalizeMatch(
  tx: Tx,
  match: MatchRow,
  outcome: "p1" | "p2" | "draw",
  reason: "knockout" | "rounds" | "forfeit",
): Promise<MatchRow> {
  if (match.status !== "active") return match;
  await lockAccounts(tx, [match.player1Id, match.player2Id]);
  const [fresh] = await tx.select().from(rankedMatches).where(eq(rankedMatches.id, match.id)).for("update");
  if (!fresh || fresh.status !== "active") return fresh ?? match;

  const p1Outcome = outcome === "draw" ? "draw" : outcome === "p1" ? "win" : "loss";
  const p2Outcome = outcome === "draw" ? "draw" : outcome === "p2" ? "win" : "loss";
  const friendly = fresh.state.mode === "friendly";
  const vsBot = fresh.state.mode === "bot";

  await ensureRankedProfile(tx, fresh.player1Id);
  if (!vsBot) await ensureRankedProfile(tx, fresh.player2Id);
  const [rp1] = await tx.select().from(rankedProfiles).where(eq(rankedProfiles.accountId, fresh.player1Id)).limit(1);
  const [rp2Row] = vsBot ? [] : await tx.select().from(rankedProfiles).where(eq(rankedProfiles.accountId, fresh.player2Id)).limit(1);
  // The bot has no ranked profile; it mirrors the human's RP for the match.
  const rp2 = rp2Row ?? { ...rp1, accountId: fresh.player2Id, winStreak: 0, bestStreak: 0 };
  const noRankChange = (points: number, streak: number) => {
    const tier = rankTierFor(points);
    return {
      oldPoints: points,
      newPoints: points,
      delta: 0,
      baseDelta: 0,
      streakBonus: 0,
      oldStreak: streak,
      newStreak: streak,
      oldTier: tier.id,
      newTier: tier.id,
    };
  };

  const p1Delta = friendly
    ? noRankChange(rp1.points, rp1.winStreak)
    : vsBot
      ? computeBotDelta(rp1.points, rp1.winStreak, p1Outcome)
      : computeSingleDelta(rp1.points, rp2.points, rp1.winStreak, p1Outcome);
  const p2Delta = friendly || vsBot ? noRankChange(rp2.points, rp2.winStreak) : computeSingleDelta(rp2.points, rp1.points, rp2.winStreak, p2Outcome);

  const nowDate = new Date();
  let p1Rewards: string[] = [];
  let p2Rewards: string[] = [];
  if (vsBot) {
    // Half RP only: W/L record, streaks, coins and achievements are for real opponents.
    await tx.update(rankedProfiles).set({ points: p1Delta.newPoints, updatedAt: nowDate }).where(eq(rankedProfiles.accountId, fresh.player1Id));
  } else if (!friendly) {
    await tx
      .update(rankedProfiles)
      .set({
        points: p1Delta.newPoints,
        wins: rp1.wins + (p1Outcome === "win" ? 1 : 0),
        losses: rp1.losses + (p1Outcome === "loss" ? 1 : 0),
        draws: rp1.draws + (p1Outcome === "draw" ? 1 : 0),
        winStreak: p1Delta.newStreak,
        bestStreak: Math.max(rp1.bestStreak, p1Delta.newStreak),
        updatedAt: nowDate,
      })
      .where(eq(rankedProfiles.accountId, fresh.player1Id));

    await tx
      .update(rankedProfiles)
      .set({
        points: p2Delta.newPoints,
        wins: rp2.wins + (p2Outcome === "win" ? 1 : 0),
        losses: rp2.losses + (p2Outcome === "loss" ? 1 : 0),
        draws: rp2.draws + (p2Outcome === "draw" ? 1 : 0),
        winStreak: p2Delta.newStreak,
        bestStreak: Math.max(rp2.bestStreak, p2Delta.newStreak),
        updatedAt: nowDate,
      })
      .where(eq(rankedProfiles.accountId, fresh.player2Id));

    if (outcome !== "draw") {
      await creditCoins(tx, outcome === "p1" ? fresh.player1Id : fresh.player2Id, { source: "ranked", ref: fresh.id, amount: COINS_PER_RANKED_WIN });
    }
    // Ranked win-streak achievements drop a reward chest into the winner's unopened chests.
    if (p1Outcome === "win") p1Rewards = await grantRankedStreakChests(tx, fresh.player1Id, p1Delta.newStreak);
    if (p2Outcome === "win") p2Rewards = await grantRankedStreakChests(tx, fresh.player2Id, p2Delta.newStreak);
  }

  const nextState: RankedMatchState = {
    ...fresh.state,
    p1: {
      ...fresh.state.p1,
      rankPoints: p1Delta.newPoints,
      rankTier: p1Delta.newTier,
      rankName: rankTierFor(p1Delta.newPoints).name,
      winStreak: p1Delta.newStreak,
    },
    p2: {
      ...fresh.state.p2,
      rankPoints: p2Delta.newPoints,
      rankTier: p2Delta.newTier,
      rankName: rankTierFor(p2Delta.newPoints).name,
      winStreak: p2Delta.newStreak,
    },
    result: {
      outcome,
      reason,
      p1: p1Delta,
      p2: p2Delta,
      rewards: { p1: p1Rewards, p2: p2Rewards },
    },
  };

  const winnerId = outcome === "p1" ? fresh.player1Id : outcome === "p2" ? fresh.player2Id : null;
  const [saved] = await tx
    .update(rankedMatches)
    .set({
      status: "finished",
      winnerId,
      isDraw: outcome === "draw" ? 1 : 0,
      state: nextState,
      updatedAt: nowDate,
    })
    .where(eq(rankedMatches.id, fresh.id))
    .returning();

  return saved;
}

async function advanceMatch(tx: Tx, match: MatchRow): Promise<MatchRow> {
  if (match.status !== "active") return match;

  let current = match;
  const now = Date.now();
  const state: RankedMatchState = structuredClone(current.state);

  // Safety timeout if a match sits stale far beyond all rounds
  if (now - current.updatedAt.getTime() > MATCH_STALE_ABORT_MS && now > state.roundEndAt + MATCH_STALE_ABORT_MS) {
    const p1L = state.p1.lives;
    const p2L = state.p2.lives;
    const outcome = p1L > p2L ? "p1" : p2L > p1L ? "p2" : "draw";
    return finalizeMatch(tx, current, outcome, "rounds");
  }

  let changed = false;
  while (state.roundIndex < RANKED_ROUND_CAP) {
    const r = state.rounds[state.roundIndex];
    if (!r) break;
    if (state.mode === "bot" && r.botPick && !r.p2 && now >= r.botPick.answeredAt) {
      r.p2 = r.botPick;
      changed = true;
    }
    const p1Done = Boolean(r.p1) || now >= (r.p1EndsAt ?? r.endsAt);
    const p2Done = Boolean(r.p2) || now >= (r.p2EndsAt ?? r.endsAt);
    if (!p1Done || !p2Done) break;

    // Resolve this round. A life is only lost for not answering; in a
    // Showdown, when both answered, the less niche pull also loses a life.
    const p1Answered = Boolean(r.p1);
    const p2Answered = Boolean(r.p2);
    let p1Hit = !p1Answered;
    let p2Hit = !p2Answered;
    if (r.showdown && r.p1 && r.p2) {
      const p1Pts = RANKED_TIER_BONUS_SECONDS[r.p1.tier];
      const p2Pts = RANKED_TIER_BONUS_SECONDS[r.p2.tier];
      if (p1Pts < p2Pts) p1Hit = true;
      else if (p2Pts < p1Pts) p2Hit = true;
    }
    const loser: RankedRoundState["loser"] = p1Hit && p2Hit ? "both" : p1Hit ? "p1" : p2Hit ? "p2" : null;
    if (p1Hit) state.p1.lives = Math.max(0, state.p1.lives - 1);
    if (p2Hit) state.p2.lives = Math.max(0, state.p2.lives - 1);

    // Showdown meter: both answering fills it; a miss empties it. A decided
    // Showdown resets it, a tied one (same tier) goes to sudden death.
    const streakBefore = state.bothAnsweredStreak ?? 0;
    state.bothAnsweredStreak = r.showdown
      ? (loser ? 0 : RANKED_SHOWDOWN_STREAK)
      : p1Answered && p2Answered
        ? Math.min(RANKED_SHOWDOWN_STREAK, streakBefore + 1)
        : 0;
    r.resolvedAt = Math.min(now, r.endsAt);
    r.loser = loser;
    changed = true;

    const knockout = state.p1.lives === 0 || state.p2.lives === 0;
    // Matches only end on a knockout; the round cap is a safety stop for endless ties.
    const lastRound = state.roundIndex + 1 >= RANKED_ROUND_CAP;
    if (knockout || lastRound) {
      const outcome = state.p1.lives > state.p2.lives ? "p1" : state.p2.lives > state.p1.lives ? "p2" : "draw";
      const [updated] = await tx
        .update(rankedMatches)
        .set({ state, updatedAt: new Date(now) })
        .where(eq(rankedMatches.id, current.id))
        .returning();
      return finalizeMatch(tx, updated ?? current, outcome, knockout ? "knockout" : "rounds");
    }

    // Prepare next round after a brief reveal pause
    const nextIdx = state.roundIndex + 1;
    // Overtime: past regulation, every round is a Showdown until someone falls.
    const nextShowdown = state.bothAnsweredStreak >= RANKED_SHOWDOWN_STREAK || nextIdx >= RANKED_MAX_ROUNDS;
    if (nextIdx >= state.questionIds.length) state.questionIds.push(extraQuestionId(state.questionIds));
    // Longer pause around Showdowns so the announcement and face-off can play.
    const nextStart = now + (r.showdown || nextShowdown ? RANKED_SHOWDOWN_REVEAL_MS : RANKED_REVEAL_MS);
    const p1BonusSeconds = r.p1 ? RANKED_TIER_BONUS_SECONDS[r.p1.tier] : 0;
    const p2BonusSeconds = r.p2 ? RANKED_TIER_BONUS_SECONDS[r.p2.tier] : 0;
    const p1EndsAt = nextStart + (RANKED_SECONDS + p1BonusSeconds) * 1000;
    const p2EndsAt = nextStart + (RANKED_SECONDS + p2BonusSeconds) * 1000;
    const nextEnd = Math.max(p1EndsAt, p2EndsAt);
    state.roundIndex = nextIdx;
    state.roundStartAt = nextStart;
    state.roundEndAt = nextEnd;
    state.rounds[nextIdx] = {
      questionId: state.questionIds[nextIdx],
      startedAt: nextStart,
      endsAt: nextEnd,
      p1EndsAt,
      p2EndsAt,
      p1BonusSeconds,
      p2BonusSeconds,
      p1: null,
      p2: null,
      p1Attempts: 0,
      p2Attempts: 0,
      showdown: nextShowdown,
      ...(state.mode === "bot" ? { botPick: planBotPick(state.questionIds[nextIdx], nextStart, p2EndsAt, nextShowdown) } : {}),
    };
    break;
  }

  if (changed) {
    const [updated] = await tx
      .update(rankedMatches)
      .set({ state, updatedAt: new Date(now) })
      .where(eq(rankedMatches.id, current.id))
      .returning();
    if (updated) current = updated;
  }
  return current;
}

function toReveal(
  idx: number,
  r: RankedRoundState,
  youRole: "p1" | "p2",
): RankedRoundReveal {
  const q = getQuestionById(r.questionId);
  const yourPick = youRole === "p1" ? r.p1 ?? null : r.p2 ?? null;
  const oppPick = youRole === "p1" ? r.p2 ?? null : r.p1 ?? null;
  const loser = !r.loser ? null : r.loser === "both" ? "both" : r.loser === youRole ? "you" : "opponent";
  return {
    roundNumber: idx + 1,
    prompt: q?.prompt ?? "One Piece Question",
    yourPick,
    opponentPick: oppPick,
    loser,
    showdown: Boolean(r.showdown),
  };
}

function serializeMatch(match: MatchRow, viewerId: string, now: number): RankedMatchView {
  const youRole: "p1" | "p2" = match.player1Id === viewerId ? "p1" : "p2";
  const state = match.state;
  const you = youRole === "p1" ? state.p1 : state.p2;
  const opponent = youRole === "p1" ? state.p2 : state.p1;

  const history: RankedRoundReveal[] = [];
  for (let i = 0; i < state.questionIds.length; i++) {
    const r = state.rounds[i];
    if (r && r.resolvedAt) history.push(toReveal(i, r, youRole));
  }

  let roundView: RankedMatchView["round"] = null;
  if (match.status === "active") {
    const r = state.rounds[state.roundIndex];
    if (r) {
      const q = getQuestionById(r.questionId);
      const yourPick = youRole === "p1" ? r.p1 ?? null : r.p2 ?? null;
      const oppPick = youRole === "p1" ? r.p2 ?? null : r.p1 ?? null;
      const phase: "intro" | "answering" | "reveal" = now < r.startedAt ? (state.roundIndex === 0 ? "intro" : "reveal") : "answering";
      roundView = {
        roundNumber: state.roundIndex + 1,
        prompt: q?.prompt ?? "Name a One Piece answer.",
        hint: q?.hint ?? "A correct answer adds time to your next question.",
        phase,
        startsAt: r.startedAt,
        endsAt: youRole === "p1" ? (r.p1EndsAt ?? r.endsAt) : (r.p2EndsAt ?? r.endsAt),
        bonusSeconds: youRole === "p1" ? (r.p1BonusSeconds ?? 0) : (r.p2BonusSeconds ?? 0),
        yourPick,
        opponentLocked: Boolean(oppPick),
        showdown: Boolean(r.showdown),
      };
    }
  }

  let resultView: RankedMatchView["result"] = null;
  if (state.result) {
    const raw = state.result;
    const outcome = raw.outcome === "draw" ? "draw" : raw.outcome === youRole ? "win" : "loss";
    resultView = {
      outcome,
      reason: raw.reason,
      you: youRole === "p1" ? raw.p1 : raw.p2,
      opponent: youRole === "p1" ? raw.p2 : raw.p1,
      rewards: (youRole === "p1" ? raw.rewards?.p1 : raw.rewards?.p2) ?? [],
    };
  }

  return {
    id: match.id,
    status: match.status as "active" | "finished",
    mode: state.mode ?? "ranked",
    youRole,
    you,
    opponent,
    round: roundView,
    lastReveal: history.length ? history[history.length - 1] : null,
    history,
    showdownMeter: Math.min(RANKED_SHOWDOWN_STREAK, state.bothAnsweredStreak ?? 0),
    result: resultView,
  };
}

async function tryPairFromQueue(tx: Tx, accountId: string): Promise<MatchRow | null> {
  const cutoff = new Date(Date.now() - ONLINE_MS);
  const [self] = await tx
    .select({ points: rankedProfiles.points })
    .from(rankedProfiles)
    .where(eq(rankedProfiles.accountId, accountId))
    .limit(1);
  const selfPoints = self?.points ?? 0;
  const selfTier = rankIndexFor(selfPoints);
  // RP window covering every tier within RANKED_MAX_TIER_GAP of ours.
  const lowTier = RANK_TIERS[Math.max(0, selfTier - RANKED_MAX_TIER_GAP)];
  const highTier = RANK_TIERS[Math.min(RANK_TIERS.length - 1, selfTier + RANKED_MAX_TIER_GAP)];

  const candidates = await tx
    .select({
      accountId: rankedProfiles.accountId,
      points: rankedProfiles.points,
      queuedAt: rankedProfiles.queuedAt,
    })
    .from(rankedProfiles)
    .where(
      and(
        ne(rankedProfiles.accountId, accountId),
        isNotNull(rankedProfiles.queuedAt),
        gt(rankedProfiles.queuedAt, cutoff),
        gt(rankedProfiles.lastSeenAt, cutoff),
        gte(rankedProfiles.points, lowTier.min),
        highTier.nextMin === null ? undefined : lt(rankedProfiles.points, highTier.nextMin),
      ),
    )
    .orderBy(sql`abs(${rankedProfiles.points} - ${selfPoints})`)
    .limit(20);

  if (!candidates.length) return null;

  // Only captains within RANKED_MAX_TIER_GAP ranks. Closest rank first, then
  // closest RP, then whoever has waited longest.
  const eligible = candidates.filter((c) => Math.abs(rankIndexFor(c.points) - selfTier) <= RANKED_MAX_TIER_GAP);
  eligible.sort((a, b) => {
    const ta = Math.abs(rankIndexFor(a.points) - selfTier);
    const tb = Math.abs(rankIndexFor(b.points) - selfTier);
    if (ta !== tb) return ta - tb;
    const da = Math.abs(a.points - selfPoints);
    const dbDiff = Math.abs(b.points - selfPoints);
    if (da !== dbDiff) return da - dbDiff;
    return (a.queuedAt?.getTime() ?? 0) - (b.queuedAt?.getTime() ?? 0);
  });

  for (const peer of eligible) {
    const [busy] = await tx
      .select({ id: rankedMatches.id })
      .from(rankedMatches)
      .where(
        and(
          eq(rankedMatches.status, "active"),
          or(eq(rankedMatches.player1Id, peer.accountId), eq(rankedMatches.player2Id, peer.accountId)),
        ),
      )
      .limit(1);
    if (busy) continue;
    return createMatch(tx, peer.accountId, accountId);
  }
  return null;
}

async function fetchLeaderboard(tx: Tx, viewerId: string | null): Promise<RankedLeaderboardEntry[]> {
  const rows = await tx
    .select({
      accountId: accounts.id,
      username: accounts.username,
      equippedCharacter: accounts.equippedCharacter,
      points: rankedProfiles.points,
      wins: rankedProfiles.wins,
      losses: rankedProfiles.losses,
      draws: rankedProfiles.draws,
      winStreak: rankedProfiles.winStreak,
      bounty: bounties.total,
      advCompleted: adventureProgress.completed,
    })
    .from(rankedProfiles)
    .innerJoin(accounts, eq(accounts.id, rankedProfiles.accountId))
    .leftJoin(bounties, eq(bounties.accountId, accounts.id))
    .leftJoin(adventureProgress, eq(adventureProgress.accountId, accounts.id))
    .orderBy(desc(rankedProfiles.points), desc(rankedProfiles.wins), accounts.username)
    .limit(50);

  return rows.map((row, idx) => {
    const tier = rankTierFor(row.points);
    return {
      rank: idx + 1,
      accountId: row.accountId,
      username: row.username,
      title: adventureTitle(row.advCompleted ?? 0),
      bounty: row.bounty ?? 0,
      rankPoints: row.points,
      rankTier: tier.id,
      rankName: tier.name,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      winStreak: row.winStreak,
      characterId: isCharacterId(row.equippedCharacter) ? row.equippedCharacter : DEFAULT_CHARACTER,
      isYou: row.accountId === viewerId,
    };
  });
}

export async function readRankedPublicProfile(accountId: string): Promise<RankedPublicProfile> {
  const [row] = await db
    .select({
      accountId: accounts.id,
      username: accounts.username,
      equippedCharacter: accounts.equippedCharacter,
      points: rankedProfiles.points,
      wins: rankedProfiles.wins,
      losses: rankedProfiles.losses,
      draws: rankedProfiles.draws,
      winStreak: rankedProfiles.winStreak,
      bestStreak: rankedProfiles.bestStreak,
      bounty: bounties.total,
      advCompleted: adventureProgress.completed,
    })
    .from(accounts)
    .innerJoin(rankedProfiles, eq(rankedProfiles.accountId, accounts.id))
    .leftJoin(bounties, eq(bounties.accountId, accounts.id))
    .leftJoin(adventureProgress, eq(adventureProgress.accountId, accounts.id))
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!row) throw new RequestProblem(404, "Captain profile not found.");

  const unlockedRows = await db
    .select({ id: achievementUnlocks.achievementId, at: achievementUnlocks.unlockedAt })
    .from(achievementUnlocks)
    .where(eq(achievementUnlocks.accountId, accountId));
  const unlockedAt = new Map(unlockedRows.map((achievement) => [achievement.id, achievement.at]));
  const tier = rankTierFor(row.points);

  return {
    accountId: row.accountId,
    username: row.username,
    title: adventureTitle(row.advCompleted ?? 0),
    bounty: row.bounty ?? 0,
    rankPoints: row.points,
    rankTier: tier.id,
    rankName: tier.name,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    winStreak: row.winStreak,
    bestStreak: row.bestStreak,
    characterId: isCharacterId(row.equippedCharacter) ? row.equippedCharacter : DEFAULT_CHARACTER,
    achievements: ACHIEVEMENTS.flatMap((achievement) => {
      const unlocked = unlockedAt.get(achievement.id);
      return unlocked
        ? [{
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            emblem: achievement.emblem,
            unlockedAt: unlocked.toISOString(),
          }]
        : [];
    }),
  };
}

async function buildLobbyData(
  tx: Tx,
  accountId: string | null,
  searchQuery: string,
  activeMatchRow: MatchRow | null,
): Promise<Omit<RankedLobbyResponse, "captain" | "feedback">> {
  const nowDate = new Date();
  const cutoff = new Date(nowDate.getTime() - ONLINE_MS);

  // Expire stale pending challenges
  await tx
    .update(rankedChallenges)
    .set({ status: "expired" })
    .where(and(eq(rankedChallenges.status, "pending"), sql`${rankedChallenges.expiresAt} < ${nowDate}`));

  // Active match IDs for status flags
  const activeMatches = await tx
    .select({ p1: rankedMatches.player1Id, p2: rankedMatches.player2Id })
    .from(rankedMatches)
    .where(eq(rankedMatches.status, "active"));
  const busyIds = new Set<string>();
  for (const m of activeMatches) {
    busyIds.add(m.p1);
    busyIds.add(m.p2);
  }

  const summaryColumns = {
    accountId: accounts.id,
    username: accounts.username,
    equippedCharacter: accounts.equippedCharacter,
    points: rankedProfiles.points,
    winStreak: rankedProfiles.winStreak,
    queuedAt: rankedProfiles.queuedAt,
    lastSeenAt: rankedProfiles.lastSeenAt,
    bounty: bounties.total,
    advCompleted: adventureProgress.completed,
  };
  type SummaryRow = {
    accountId: string;
    username: string;
    equippedCharacter: string;
    points: number | null;
    winStreak: number | null;
    queuedAt: Date | null;
    lastSeenAt?: Date | null;
    bounty: number | null;
    advCompleted: number | null;
  };

  const toOnlineSummary = (row: SummaryRow): OnlinePlayerSummary => {
    const points = row.points ?? 0;
    const tier = rankTierFor(points);
    return {
      accountId: row.accountId,
      username: row.username,
      title: adventureTitle(row.advCompleted ?? 0),
      bounty: row.bounty ?? 0,
      rankPoints: points,
      rankTier: tier.id,
      rankName: tier.name,
      winStreak: row.winStreak ?? 0,
      characterId: isCharacterId(row.equippedCharacter) ? row.equippedCharacter : DEFAULT_CHARACTER,
      inMatch: busyIds.has(row.accountId),
      inQueue: Boolean(row.queuedAt && row.queuedAt > cutoff),
    };
  };

  // Friends only: nobody else is listed. Other captains appear only via an exact username search.
  let friendIds = new Set<string>();
  let friends: FriendSummary[] = [];
  let searchResult: FriendSummary | null = null;
  const toFriend = (row: SummaryRow): FriendSummary => ({
    ...toOnlineSummary(row),
    online: Boolean(row.lastSeenAt && row.lastSeenAt > cutoff),
    isFriend: friendIds.has(row.accountId),
  });
  if (accountId) {
    const friendRows = await tx
      .select(summaryColumns)
      .from(rankedFriends)
      .innerJoin(accounts, eq(accounts.id, rankedFriends.friendId))
      .leftJoin(rankedProfiles, eq(rankedProfiles.accountId, accounts.id))
      .leftJoin(bounties, eq(bounties.accountId, accounts.id))
      .leftJoin(adventureProgress, eq(adventureProgress.accountId, accounts.id))
      .where(eq(rankedFriends.accountId, accountId))
      .orderBy(accounts.usernameKey)
      .limit(100);
    friendIds = new Set(friendRows.map((r) => r.accountId));
    friends = friendRows.map(toFriend).sort((x, y) => Number(y.online) - Number(x.online));

    const key = searchQuery.trim().toLowerCase();
    if (key && key.length <= 24) {
      const [hit] = await tx
        .select(summaryColumns)
        .from(accounts)
        .leftJoin(rankedProfiles, eq(rankedProfiles.accountId, accounts.id))
        .leftJoin(bounties, eq(bounties.accountId, accounts.id))
        .leftJoin(adventureProgress, eq(adventureProgress.accountId, accounts.id))
        .where(and(eq(accounts.usernameKey, key), ne(accounts.id, accountId), ne(accounts.usernameKey, BOT_USERNAME_KEY)))
        .limit(1);
      if (hit) searchResult = toFriend(hit);
    }
  }

  let profile: RankedPlayerCard | null = null;
  let inQueue = false;
  let friendlyInvites: RankedFriendlyInviteView[] = [];
  let recentMatches: RankedMatchView[] = [];

  if (accountId) {
    profile = await buildPlayerCard(tx, accountId);
    const [rp] = await tx
      .select({ queuedAt: rankedProfiles.queuedAt })
      .from(rankedProfiles)
      .where(eq(rankedProfiles.accountId, accountId))
      .limit(1);
    inQueue = Boolean(rp?.queuedAt && rp.queuedAt > cutoff);

    const chRows = await tx
      .select()
      .from(rankedChallenges)
      .where(
        and(
          eq(rankedChallenges.status, "pending"),
          or(eq(rankedChallenges.fromAccountId, accountId), eq(rankedChallenges.toAccountId, accountId)),
        ),
      )
      .orderBy(desc(rankedChallenges.createdAt))
      .limit(10);

    const peerIds = [...new Set(chRows.map((c) => (c.fromAccountId === accountId ? c.toAccountId : c.fromAccountId)))];
    const peerMap = new Map<string, OnlinePlayerSummary>();
    if (peerIds.length) {
      const peerRows = await tx
        .select({
          accountId: accounts.id,
          username: accounts.username,
          equippedCharacter: accounts.equippedCharacter,
          points: rankedProfiles.points,
          winStreak: rankedProfiles.winStreak,
          queuedAt: rankedProfiles.queuedAt,
          bounty: bounties.total,
          advCompleted: adventureProgress.completed,
        })
        .from(accounts)
        .innerJoin(rankedProfiles, eq(rankedProfiles.accountId, accounts.id))
        .leftJoin(bounties, eq(bounties.accountId, accounts.id))
        .leftJoin(adventureProgress, eq(adventureProgress.accountId, accounts.id))
        .where(inArray(accounts.id, peerIds));
      for (const r of peerRows) peerMap.set(r.accountId, toOnlineSummary(r));
    }

    friendlyInvites = chRows
      .map((c) => {
        const peerId = c.fromAccountId === accountId ? c.toAccountId : c.fromAccountId;
        const opponent = peerMap.get(peerId);
        if (!opponent) return null;
        return {
          id: c.id,
          direction: c.fromAccountId === accountId ? ("outgoing" as const) : ("incoming" as const),
          opponent,
          expiresAt: c.expiresAt.getTime(),
        };
      })
      .filter((c): c is RankedFriendlyInviteView => Boolean(c));

    const recentRows = await tx
      .select()
      .from(rankedMatches)
      .where(
        and(
          eq(rankedMatches.status, "finished"),
          or(eq(rankedMatches.player1Id, accountId), eq(rankedMatches.player2Id, accountId)),
        ),
      )
      .orderBy(desc(rankedMatches.updatedAt))
      .limit(5);
    recentMatches = recentRows.map((m) => serializeMatch(m, accountId, nowDate.getTime()));
  }

  const onlineCount = await onlineCaptains(tx);

  const leaderboard = await fetchLeaderboard(tx, accountId);
  const activeMatch = activeMatchRow && accountId ? serializeMatch(activeMatchRow, accountId, nowDate.getTime()) : null;

  return {
    profile,
    inQueue,
    onlineCount,
    friends,
    searchResult,
    friendlyInvites,
    activeMatch,
    recentMatches,
    leaderboard,
    serverNow: nowDate.getTime(),
  };
}

export async function readRankedLobby(
  accountId: string | null,
  searchQuery = "",
  matchId?: string | null,
): Promise<Omit<RankedLobbyResponse, "captain" | "feedback">> {
  return db.transaction(async (tx) => {
    let activeMatch: MatchRow | null = null;
    if (accountId) {
      await ensureRankedProfile(tx, accountId);
      const nowDate = new Date();
      await tx
        .update(rankedProfiles)
        .set({ lastSeenAt: nowDate })
        .where(eq(rankedProfiles.accountId, accountId));
      await touchPresence(tx, `a:${accountId}`);

      if (isUuid(matchId)) {
        const [found] = await tx
          .select()
          .from(rankedMatches)
          .where(
            and(
              eq(rankedMatches.id, matchId),
              or(eq(rankedMatches.player1Id, accountId), eq(rankedMatches.player2Id, accountId)),
            ),
          )
          .for("update")
          .limit(1);
        if (found) activeMatch = found.status === "active" ? await advanceMatch(tx, found) : found;
      }

      if (!activeMatch) {
        const [live] = await tx
          .select()
          .from(rankedMatches)
          .where(
            and(
              eq(rankedMatches.status, "active"),
              or(eq(rankedMatches.player1Id, accountId), eq(rankedMatches.player2Id, accountId)),
            ),
          )
          .orderBy(desc(rankedMatches.createdAt))
          .for("update")
          .limit(1);
        if (live) activeMatch = await advanceMatch(tx, live);
      }

      // If still queued and no active match yet, try pairing on poll too!
      if (!activeMatch || activeMatch.status !== "active") {
        const [self] = await tx
          .select({ queuedAt: rankedProfiles.queuedAt })
          .from(rankedProfiles)
          .where(eq(rankedProfiles.accountId, accountId))
          .limit(1);
        if (self?.queuedAt && self.queuedAt.getTime() > Date.now() - ONLINE_MS) {
          const paired = await tryPairFromQueue(tx, accountId);
          if (paired) activeMatch = paired;
        }
      }
    }

    return buildLobbyData(tx, accountId, searchQuery, activeMatch);
  });
}

export async function rankedAction(
  accountId: string,
  body: Record<string, unknown>,
): Promise<Omit<RankedLobbyResponse, "captain">> {
  const action = typeof body.action === "string" ? body.action : "";
  const searchQuery = typeof body.q === "string" ? body.q : "";

  return db.transaction(async (tx) => {
    await ensureRankedProfile(tx, accountId);
    const nowDate = new Date();
    const now = nowDate.getTime();
    await tx.update(rankedProfiles).set({ lastSeenAt: nowDate }).where(eq(rankedProfiles.accountId, accountId));

    // Helper: check if viewer already has an active match (after advancing expired rounds)
    const getLiveMatch = async (): Promise<MatchRow | null> => {
      const [live] = await tx
        .select()
        .from(rankedMatches)
        .where(
          and(
            eq(rankedMatches.status, "active"),
            or(eq(rankedMatches.player1Id, accountId), eq(rankedMatches.player2Id, accountId)),
          ),
        )
        .for("update")
        .limit(1);
      if (!live) return null;
      const advanced = await advanceMatch(tx, live);
      return advanced.status === "active" ? advanced : null;
    };

    if (action === "queue") {
      const current = await getLiveMatch();
      if (current) {
        return { ...(await buildLobbyData(tx, accountId, searchQuery, current)) };
      }
      await tx
        .update(rankedProfiles)
        .set({ queuedAt: nowDate, updatedAt: nowDate })
        .where(eq(rankedProfiles.accountId, accountId));
      const matched = await tryPairFromQueue(tx, accountId);
      return { ...(await buildLobbyData(tx, accountId, searchQuery, matched)) };
    }

    if (action === "playBot") {
      const current = await getLiveMatch();
      if (current) return { ...(await buildLobbyData(tx, accountId, searchQuery, current)) };
      const match = await createBotMatch(tx, accountId);
      return { ...(await buildLobbyData(tx, accountId, searchQuery, match)) };
    }

    if (action === "unqueue") {
      await tx
        .update(rankedProfiles)
        .set({ queuedAt: null, updatedAt: nowDate })
        .where(eq(rankedProfiles.accountId, accountId));
      const current = await getLiveMatch();
      return { ...(await buildLobbyData(tx, accountId, searchQuery, current)) };
    }

    if (action === "addFriend") {
      let targetId = isUuid(body.targetId) ? body.targetId : null;
      if (!targetId && typeof body.targetUsername === "string" && body.targetUsername.trim()) {
        const [target] = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.usernameKey, body.targetUsername.trim().toLowerCase()))
          .limit(1);
        if (!target || body.targetUsername.trim().toLowerCase() === BOT_USERNAME_KEY) throw new RequestProblem(404, "No captain with that username was found.");
        targetId = target.id;
      }
      if (!targetId) throw new RequestProblem(400, "Search for a captain's exact username to add them.");
      if (targetId === accountId) throw new RequestProblem(400, "You can't add yourself as a friend.");
      const [exists] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, targetId)).limit(1);
      if (!exists) throw new RequestProblem(404, "No captain with that username was found.");
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(rankedFriends)
        .where(eq(rankedFriends.accountId, accountId));
      if (count >= 100) throw new RequestProblem(409, "Your friends list is full (100 captains).");
      await tx.insert(rankedFriends).values({ accountId, friendId: targetId }).onConflictDoNothing();
      return { ...(await buildLobbyData(tx, accountId, searchQuery, await getLiveMatch())) };
    }

    if (action === "removeFriend") {
      if (!isUuid(body.targetId)) throw new RequestProblem(400, "Choose a friend to remove.");
      await tx
        .delete(rankedFriends)
        .where(and(eq(rankedFriends.accountId, accountId), eq(rankedFriends.friendId, body.targetId)));
      return { ...(await buildLobbyData(tx, accountId, searchQuery, await getLiveMatch())) };
    }

    if (action === "friendlyInvite") {
      const current = await getLiveMatch();
      if (current) throw new RequestProblem(409, "Finish your current battle before sending a friendly invite.");

      let targetId = isUuid(body.targetId) ? body.targetId : null;
      if (!targetId && typeof body.targetUsername === "string" && body.targetUsername.trim()) {
        const key = body.targetUsername.trim().toLowerCase();
        const [target] = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.usernameKey, key))
          .limit(1);
        if (!target) throw new RequestProblem(404, "No captain with that username was found.");
        targetId = target.id;
      }
      if (!targetId) throw new RequestProblem(400, "Choose an online captain to invite.");
      if (targetId === accountId) throw new RequestProblem(400, "You cannot invite yourself.");
      const [friendship] = await tx
        .select({ id: rankedFriends.friendId })
        .from(rankedFriends)
        .where(and(eq(rankedFriends.accountId, accountId), eq(rankedFriends.friendId, targetId)))
        .limit(1);
      if (!friendship) throw new RequestProblem(403, "Add this captain as a friend before challenging them.");

      await ensureRankedProfile(tx, targetId);
      const [targetStatus] = await tx
        .select({ lastSeenAt: rankedProfiles.lastSeenAt })
        .from(rankedProfiles)
        .where(eq(rankedProfiles.accountId, targetId))
        .limit(1);
      if (!targetStatus || targetStatus.lastSeenAt.getTime() < now - ONLINE_MS) {
        throw new RequestProblem(409, "That captain is not currently online.");
      }
      const [targetBusy] = await tx
        .select({ id: rankedMatches.id })
        .from(rankedMatches)
        .where(
          and(
            eq(rankedMatches.status, "active"),
            or(eq(rankedMatches.player1Id, targetId), eq(rankedMatches.player2Id, targetId)),
          ),
        )
        .limit(1);
      if (targetBusy) throw new RequestProblem(409, "That captain is already in a battle.");

      // Replace any duplicate pending invite from this sender to this target.
      await tx
        .update(rankedChallenges)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(rankedChallenges.fromAccountId, accountId),
            eq(rankedChallenges.toAccountId, targetId),
            eq(rankedChallenges.status, "pending"),
          ),
        );

      await tx.insert(rankedChallenges).values({
        fromAccountId: accountId,
        toAccountId: targetId,
        status: "pending",
        expiresAt: new Date(now + CHALLENGE_TTL_MS),
      });

      return { ...(await buildLobbyData(tx, accountId, searchQuery, null)) };
    }

    if (action === "acceptInvite") {
      const challengeId = body.challengeId;
      if (!isUuid(challengeId)) throw new RequestProblem(400, "Invalid invite.");
      const [ch] = await tx
        .select()
        .from(rankedChallenges)
        .where(and(eq(rankedChallenges.id, challengeId), eq(rankedChallenges.toAccountId, accountId)))
        .for("update")
        .limit(1);
      if (!ch || ch.status !== "pending" || ch.expiresAt.getTime() < now) {
        throw new RequestProblem(409, "That invite has expired.");
      }
      const match = await createMatch(tx, ch.fromAccountId, ch.toAccountId, "friendly");
      await tx
        .update(rankedChallenges)
        .set({ status: "accepted", matchId: match.id })
        .where(eq(rankedChallenges.id, ch.id));
      return { ...(await buildLobbyData(tx, accountId, searchQuery, match)) };
    }

    if (action === "declineInvite") {
      const challengeId = body.challengeId;
      if (!isUuid(challengeId)) throw new RequestProblem(400, "Invalid invite.");
      await tx
        .update(rankedChallenges)
        .set({ status: "declined" })
        .where(and(eq(rankedChallenges.id, challengeId), eq(rankedChallenges.toAccountId, accountId), eq(rankedChallenges.status, "pending")));
      return { ...(await buildLobbyData(tx, accountId, searchQuery, null)) };
    }

    if (action === "cancelInvite") {
      const challengeId = body.challengeId;
      if (!isUuid(challengeId)) throw new RequestProblem(400, "Invalid invite.");
      await tx
        .update(rankedChallenges)
        .set({ status: "cancelled" })
        .where(and(eq(rankedChallenges.id, challengeId), eq(rankedChallenges.fromAccountId, accountId), eq(rankedChallenges.status, "pending")));
      return { ...(await buildLobbyData(tx, accountId, searchQuery, null)) };
    }

    if (action === "guess") {
      const matchId = body.matchId;
      if (!isUuid(matchId)) throw new RequestProblem(400, "Invalid match.");
      const guess = typeof body.guess === "string" ? body.guess.trim().slice(0, 80) : "";
      if (!guess) throw new RequestProblem(400, "Type an answer.");

      const [rawMatch] = await tx
        .select()
        .from(rankedMatches)
        .where(
          and(
            eq(rankedMatches.id, matchId),
            or(eq(rankedMatches.player1Id, accountId), eq(rankedMatches.player2Id, accountId)),
          ),
        )
        .for("update")
        .limit(1);
      if (!rawMatch) throw new RequestProblem(404, "Match not found.");

      let match = await advanceMatch(tx, rawMatch);
      if (match.status !== "active") {
        return { ...(await buildLobbyData(tx, accountId, searchQuery, match)) };
      }

      const role: "p1" | "p2" = match.player1Id === accountId ? "p1" : "p2";
      const state: RankedMatchState = structuredClone(match.state);
      const r = state.rounds[state.roundIndex];
      if (!r || now < r.startedAt) {
        throw new RequestProblem(409, "Wait for the round timer to start.");
      }
      const personalEndsAt = role === "p1" ? (r.p1EndsAt ?? r.endsAt) : (r.p2EndsAt ?? r.endsAt);
      if (now >= personalEndsAt) {
        match = await advanceMatch(tx, match);
        return { ...(await buildLobbyData(tx, accountId, searchQuery, match)) };
      }

      const alreadyPicked = role === "p1" ? r.p1 : r.p2;
      if (alreadyPicked) {
        return { ...(await buildLobbyData(tx, accountId, searchQuery, match)) };
      }

      const question = getQuestionById(r.questionId);
      if (!question) throw new RequestProblem(500, "Question missing.");

      if (role === "p1") r.p1Attempts++;
      else r.p2Attempts++;

      const hit = checkGuess(question, guess);
      if (!hit) {
        const [saved] = await tx
          .update(rankedMatches)
          .set({ state, updatedAt: nowDate })
          .where(eq(rankedMatches.id, match.id))
          .returning();
        return {
          ...(await buildLobbyData(tx, accountId, searchQuery, saved ?? match)),
          feedback: { kind: "wrong", suggestion: suggestGuess(question, guess) },
        };
      }

      const pick = {
        answer: hit.name,
        tier: hit.tier,
        answeredAt: now,
      };
      if (role === "p1") r.p1 = pick;
      else r.p2 = pick;

      const [saved] = await tx
        .update(rankedMatches)
        .set({ state, updatedAt: nowDate })
        .where(eq(rankedMatches.id, match.id))
        .returning();

      // If both players have now answered, resolve the round immediately!
      const finalMatch = await advanceMatch(tx, saved ?? match);
      return {
        ...(await buildLobbyData(tx, accountId, searchQuery, finalMatch)),
        feedback: { kind: "correct", pick },
      };
    }

    if (action === "forfeit") {
      const matchId = body.matchId;
      if (!isUuid(matchId)) throw new RequestProblem(400, "Invalid match.");
      const [rawMatch] = await tx
        .select()
        .from(rankedMatches)
        .where(
          and(
            eq(rankedMatches.id, matchId),
            or(eq(rankedMatches.player1Id, accountId), eq(rankedMatches.player2Id, accountId)),
          ),
        )
        .for("update")
        .limit(1);
      if (!rawMatch) throw new RequestProblem(404, "Match not found.");
      const settled = await advanceMatch(tx, rawMatch);
      if (settled.status !== "active") {
        return { ...(await buildLobbyData(tx, accountId, searchQuery, settled)) };
      }
      const winnerOutcome = settled.player1Id === accountId ? "p2" : "p1";
      const finalized = await finalizeMatch(tx, settled, winnerOutcome, "forfeit");
      return { ...(await buildLobbyData(tx, accountId, searchQuery, finalized)) };
    }

    throw new RequestProblem(400, "Unknown ranked action.");
  });
}
