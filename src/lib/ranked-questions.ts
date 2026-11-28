import { ORIGINAL_QUESTIONS, type Question } from "@/data/questions";
import { RANKED_POOL_QUESTIONS } from "@/data/bank/ranked-pool";
import { withEveryTier } from "@/data/bank/ranked-pool/build";

const TIERS = ["common", "uncommon", "rare", "epic", "luffillion"] as const;

/** A Ranked question needs at least 5 answers and at least one answer in every tier. */
export function isRankedReady(q: Question): boolean {
  return TIERS.every((t) => q.tiers[t]?.length > 0) && TIERS.reduce((n, t) => n + q.tiers[t].length, 0) >= 5;
}

const promptKey = (q: Question) => q.prompt.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Everything Ranked can ask: the original categories (short lists rebalanced so every tier has an
 * answer, lists under 5 answers left out, repeated prompts asked once) plus the Ranked-only pool.
 */
export const RANKED_QUESTIONS: Question[] = (() => {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of [...ORIGINAL_QUESTIONS.map(withEveryTier), ...RANKED_POOL_QUESTIONS]) {
    if (!isRankedReady(q) || seen.has(promptKey(q))) continue;
    seen.add(promptKey(q));
    out.push(q);
  }
  return out;
})();

const BY_ID = new Map(RANKED_QUESTIONS.map((q) => [q.id, q]));

/** A question as Ranked asks it (rebalanced tiers for the originals, plus the "rk-" pool). */
export function getRankedQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}
