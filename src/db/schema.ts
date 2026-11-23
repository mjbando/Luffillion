import { index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { Progress, VoyageLeg } from "@/lib/voyage";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("runs_day_player_idx").on(t.dayKey, t.playerId),
  uniqueIndex("runs_account_day_idx").on(t.accountId, t.dayKey),
  index("runs_day_score_idx").on(t.dayKey, t.score),
]);
