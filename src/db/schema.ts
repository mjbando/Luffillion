import { integer, pgTable, serial, timestamp, varchar, index } from "drizzle-orm/pg-core";

// Every correct answer a player submits is recorded here so we can show
// "found by N players" next to each answer in the reveal list.
export const solves = pgTable(
  "solves",
  {
    id: serial("id").primaryKey(),
    dayKey: varchar("day_key", { length: 10 }).notNull(),
    questionId: varchar("question_id", { length: 64 }).notNull(),
    answer: varchar("answer", { length: 160 }).notNull(),
    tier: varchar("tier", { length: 20 }).notNull(),
    points: integer("points").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("solves_day_question_idx").on(table.dayKey, table.questionId)],
);

