import { index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { Progress, VoyageLeg } from "@/lib/voyage";
import type { AdventureState, AdventureStatus } from "@/lib/adventure-types";
import type { RankedMatchState } from "@/lib/ranked-types";

export const solves = pgTable("solves", {
  id: serial("id").primaryKey(),
  dayKey: varchar("day_key", { length: 10 }).notNull(),
  questionId: varchar("question_id", { length: 64 }).notNull(),
  answer: varchar("answer", { length: 160 }).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("solves_day_question_idx").on(t.dayKey, t.questionId)]);

export const accounts = pgTable("captain_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 24 }).notNull(),
  usernameKey: varchar("username_key", { length: 24 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  equippedCharacter: varchar("equipped_character", { length: 32 }).notNull().default("luffy"),
  coins: integer("coins").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("captain_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("captain_sessions_expiry_idx").on(t.expiresAt)]);

export const authWindows = pgTable("captain_auth_windows", {
  bucket: varchar("bucket", { length: 64 }).primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("captain_auth_window_expiry_idx").on(t.expiresAt)]);

export const checkpoints = pgTable("voyage_checkpoints", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  dayKey: varchar("day_key", { length: 10 }).notNull(),
  progress: jsonb("progress").$type<Progress>().notNull(),
}, (t) => [primaryKey({ columns: [t.accountId, t.dayKey] })]);

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  dayKey: varchar("day_key", { length: 10 }).notNull(),
  playerId: varchar("player_id", { length: 64 }).notNull(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  legs: jsonb("legs").$type<VoyageLeg[]>(),
  score: integer("score").notNull(),
  solved: integer("solved").notNull(),
  niche: integer("niche"),
  mistakes: integer("mistakes"),
  beat: integer("beat"),
  rank: integer("rank"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("runs_day_player_idx").on(t.dayKey, t.playerId),
  uniqueIndex("runs_account_day_idx").on(t.accountId, t.dayKey),
  index("runs_day_score_idx").on(t.dayKey, t.score),
]);

// Cumulative bounty ledger. One row per account, plus one gain row per day, so a
// daily voyage can never be re-awarded by a repeated or backfilled completion.
export const bounties = pgTable("bounties", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  total: integer("total").notNull().default(0),
  lastDay: varchar("last_day", { length: 10 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const bountyGains = pgTable("bounty_gains", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  dayKey: varchar("day_key", { length: 10 }).notNull(),
  amount: integer("amount").notNull(),
}, (t) => [primaryKey({ columns: [t.accountId, t.dayKey] })]);

export const achievementUnlocks = pgTable("achievement_unlocks", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  achievementId: varchar("achievement_id", { length: 48 }).notNull(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.accountId, t.achievementId] })]);

export const characterUnlocks = pgTable("character_unlocks", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  characterId: varchar("character_id", { length: 32 }).notNull(),
  source: varchar("source", { length: 16 }).notNull().default("chest"),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.accountId, t.characterId] })]);

export const treasureChestOpenings = pgTable("treasure_chest_openings", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  chestRarity: varchar("chest_rarity", { length: 16 }).notNull(),
  rewardRarity: varchar("reward_rarity", { length: 16 }).notNull(),
  characterId: varchar("character_id", { length: 32 }).notNull(),
  duplicateCoins: integer("duplicate_coins").notNull().default(0),
  cost: integer("cost").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("treasure_chest_openings_account_created_idx").on(t.accountId, t.createdAt)]);

// Chests earned as rewards (e.g. ranked win-streak achievements). Each (account, source, ref)
// is granted once; the chest waits here until the player opens it.
export const rewardChests = pgTable("reward_chests", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  chestRarity: varchar("chest_rarity", { length: 16 }).notNull(),
  source: varchar("source", { length: 16 }).notNull(),
  ref: varchar("ref", { length: 48 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("reward_chests_account_source_ref_idx").on(t.accountId, t.source, t.ref),
  index("reward_chests_account_opened_idx").on(t.accountId, t.openedAt),
]);

// One row per coin payout. The primary key guarantees a daily voyage, adventure
// level, ranked win or achievement is never paid twice — live or via backfill.
export const coinLedger = pgTable("coin_ledger", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 16 }).notNull(),
  ref: varchar("ref", { length: 64 }).notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.accountId, t.source, t.ref] })]);

// Records one-time data migrations (e.g. the historical coin backfill).
export const coinBackfillMigrations = pgTable("coin_backfill_migrations", {
  migrationKey: varchar("migration_key", { length: 64 }).primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});

// Adventure is independent of daily runs, daily ranks, and daily streaks.
export const adventureProgress = pgTable("adventure_progress", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  completed: integer("completed").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const adventureClears = pgTable("adventure_clears", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  bestScore: integer("best_score").notNull(),
  clearedAt: timestamp("cleared_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.accountId, t.level] })]);
export const adventureAttempts = pgTable("adventure_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  status: varchar("status", { length: 16 }).$type<AdventureStatus>().notNull().default("active"),
  state: jsonb("state").$type<AdventureState>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("adventure_attempt_owner_status_idx").on(t.accountId, t.status)]);

export const rankedProfiles = pgTable("ranked_profiles", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ranked_profiles_points_idx").on(t.points),
  index("ranked_profiles_queue_idx").on(t.queuedAt),
  index("ranked_profiles_seen_idx").on(t.lastSeenAt),
]);

export const rankedChallenges = pgTable("ranked_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromAccountId: uuid("from_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: uuid("to_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  matchId: uuid("match_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("ranked_challenges_to_idx").on(t.toAccountId, t.status),
  index("ranked_challenges_from_idx").on(t.fromAccountId, t.status),
]);

export const rankedMatches = pgTable("ranked_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  player1Id: uuid("player1_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  player2Id: uuid("player2_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  winnerId: uuid("winner_id"),
  isDraw: integer("is_draw").notNull().default(0),
  state: jsonb("state").$type<RankedMatchState>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ranked_matches_p1_idx").on(t.player1Id, t.status),
  index("ranked_matches_p2_idx").on(t.player2Id, t.status),
]);

// Friends list for friendly battles. One row per direction: (account adds friend).
export const rankedFriends = pgTable("ranked_friends", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  friendId: uuid("friend_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.accountId, t.friendId] }), index("ranked_friends_friend_idx").on(t.friendId)]);

// Who is on the website right now (signed-in account id or guest cookie id), for the online counter.
export const sitePresence = pgTable("site_presence", {
  visitorKey: varchar("visitor_key", { length: 64 }).primaryKey(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("site_presence_seen_idx").on(t.lastSeenAt)]);
