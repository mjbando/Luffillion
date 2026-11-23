import { and, eq, isNull, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { accounts, checkpoints, runs } from "@/db/schema";
import { DAILY_QUESTION_COUNT } from "@/data/tiers";
import { checkGuess, getDailyRun, todayKey } from "./daily";
import { RequestProblem } from "./account-server";
import { firstOpen, fromQuestions, mergeProgress, type FinishedVoyage, type Progress, type VoyageLeg } from "./voyage";

export interface Owner { accountId: string | null; playerId: string }
export function ownerOf(accountId: string | null, guest: string | null): Owner | null {
  if (accountId) return { accountId, playerId: `account:${accountId}` };
  return guest ? { accountId: null, playerId: guest } : null;
}
export const ownsRun = (owner: Owner) => owner.accountId
  ? eq(runs.accountId, owner.accountId)
  : and(isNull(runs.accountId), eq(runs.playerId, owner.playerId));
export const runFields = { day: runs.dayKey, score: runs.score, solved: runs.solved, legs: runs.legs };

export async function dailySave(day: string, owner: Owner | null) {
  if (!owner) return { finished: null, checkpoint: null };
  const [finished] = await db.select(runFields).from(runs).where(and(eq(runs.dayKey, day), ownsRun(owner))).limit(1);
  if (finished || !owner.accountId) return { finished: finished ?? null, checkpoint: null };
  const [saved] = await db.select({ progress: checkpoints.progress }).from(checkpoints)
    .where(and(eq(checkpoints.accountId, owner.accountId), eq(checkpoints.dayKey, day))).limit(1);
  return { finished: null, checkpoint: saved?.progress ?? null };
}

const obj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

// Accept only the current daily set; never trust incoming points, tiers or positions.
export function readCheckpoint(raw: unknown): Progress {
  const day = todayKey();
  if (!obj(raw) || raw.day !== day || !obj(raw.q)) throw new RequestProblem(400, "That checkpoint is not for today's voyage.");
  const questions = getDailyRun(day), ids = questions.map(q => q.id);
  if (!Array.isArray(raw.ids) || raw.ids.join() !== ids.join()) throw new RequestProblem(409, "The daily questions changed. Reload the game.");
  const q: Progress["q"] = {};
  for (let i = 0; i < questions.length; i++) {
    const item = raw.q[String(i)];
    if (item === undefined) break;
    if (!obj(item)) throw new RequestProblem(400, "Invalid question checkpoint.");
    const attempts = typeof item.attempts === "number" && Number.isInteger(item.attempts) ? Math.max(0, Math.min(100000, item.attempts)) : 0;
    const wrong = Array.isArray(item.wrong) ? item.wrong.filter((w): w is string => typeof w === "string").slice(0, 40).map(w => w.slice(0, 80)) : [];
    const started = typeof item.started === "number" && Number.isFinite(item.started) && item.started > 0 ? Math.min(Date.now(), item.started) : undefined;
    if (item.status === "solved") {
      const match = typeof item.answer === "string" && checkGuess(questions[i], item.answer.slice(0, 256));
      if (!match) throw new RequestProblem(400, "One of the saved answers doesn't match today's question.");
      q[i] = { started, status: "solved", answer: match.name, points: match.points, tier: match.tier, wrong, attempts };
    } else if (item.status === "expired") q[i] = { started, status: "expired", points: 0, attempts, wrong };
    else if (item.status == null) {
      if (started) q[i] = { started, attempts, wrong };
      break;
    } else throw new RequestProblem(400, "Unrecognized question state.");
  }
  return fromQuestions(day, ids, q);
}

export async function saveCheckpoint(accountId: string, incoming: Progress, importing = false) {
  return db.transaction(async tx => {
    // Serialize changes for this captain, including completion, across tabs/devices.
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    const key = and(eq(checkpoints.accountId, accountId), eq(checkpoints.dayKey, incoming.day));
    const [complete] = await tx.select({ id: runs.id }).from(runs).where(and(eq(runs.accountId, accountId), eq(runs.dayKey, incoming.day))).limit(1);
    if (complete) return { complete: true, progress: null };
    const [old] = await tx.select({ p: checkpoints.progress }).from(checkpoints).where(key);
    const progress = old ? (importing ? old.p : mergeProgress(old.p, incoming)) : incoming;
    await tx.insert(checkpoints).values({ accountId, dayKey: progress.day, progress }).onConflictDoUpdate({
      target: [checkpoints.accountId, checkpoints.dayKey], set: { progress },
    });
    return { complete: false, progress };
  });
}

export function validAnswers(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === DAILY_QUESTION_COUNT && value.every(a => typeof a === "string" && a.length <= 256);
}

export async function finishVoyage(owner: Owner, day: string, answers: string[]): Promise<FinishedVoyage | null> {
  return db.transaction(async tx => {
    let checkpoint: Progress | undefined;
    if (owner.accountId) {
      await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, owner.accountId)).for("update");
      const [saved] = await tx.select({ p: checkpoints.progress }).from(checkpoints).where(and(eq(checkpoints.accountId, owner.accountId), eq(checkpoints.dayKey, day)));
      checkpoint = saved?.p;
    }
    const legs: VoyageLeg[] = getDailyRun(day).map((q, i) => {
      const settled = checkpoint?.q[i];
      const answer = settled?.status ? (settled.status === "solved" ? settled.answer : "") : answers[i];
      const match = answer ? checkGuess(q, answer) : null;
      return { questionId: q.id, prompt: q.prompt, answer: match?.name ?? null, tier: match?.tier ?? null, points: match?.points ?? 0 };
    });
    const score = legs.reduce((sum, leg) => sum + leg.points, 0);
    const solved = legs.filter(leg => leg.tier).length;
    const where = and(eq(runs.dayKey, day), ownsRun(owner));
    await tx.insert(runs).values({ ...owner, dayKey: day, score, solved, legs }).onConflictDoNothing();
    // Preserve old score-only records. Add their recap only if re-scoring agrees.
    await tx.update(runs).set({ legs }).where(and(where, isNull(runs.legs), eq(runs.score, score), eq(runs.solved, solved)));
    const [saved] = await tx.select(runFields).from(runs).where(where).limit(1);
    if (saved && owner.accountId) await tx.delete(checkpoints).where(and(eq(checkpoints.accountId, owner.accountId), eq(checkpoints.dayKey, day)));
    return saved ?? null;
  });
}

export async function claimGuestVoyages(accountId: string, guest: string, current: Progress | null) {
  if (current && firstOpen(current) === DAILY_QUESTION_COUNT) {
    await finishVoyage({ playerId: guest, accountId: null }, current.day,
      Array.from({ length: DAILY_QUESTION_COUNT }, (_, i) => current.q[i]?.answer ?? ""));
  }
  const count = await db.transaction(async tx => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");
    const owned = alias(runs, "already_owned");
    // Link in place: no extra scoreboard entry, and an existing account result wins.
    const moved = await tx.update(runs).set({ accountId }).where(and(
      eq(runs.playerId, guest), isNull(runs.accountId),
      notExists(tx.select({ id: owned.id }).from(owned).where(and(eq(owned.accountId, accountId), eq(owned.dayKey, runs.dayKey)))),
      notExists(tx.select({ day: checkpoints.dayKey }).from(checkpoints).where(and(eq(checkpoints.accountId, accountId), eq(checkpoints.dayKey, runs.dayKey)))),
    )).returning({ id: runs.id });
    return moved.length;
  });
  if (current && Object.keys(current.q).length && firstOpen(current) < DAILY_QUESTION_COUNT) await saveCheckpoint(accountId, current, true);
  return count;
}
