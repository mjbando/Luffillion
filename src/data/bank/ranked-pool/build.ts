import type { Question } from "../../questions";
import { C, D, ranked } from "../curated/names";

export { C, D, DF, LOC, TECH, SWORD, SHIP, CREW, ARC } from "../curated/names";

/** Single-word character entries that are not dictionary keys (usually a typo'd key); checked by the validator. */
export const UNKNOWN_KEYS: string[] = [];

/**
 * A Ranked-pool question from an answer list ordered from best known to most obscure (the last one
 * is the One in a Luffillion). Names can be keys of the shared name dictionary (D) or written out as
 * "Display Name|alias|alias". Every question gets at least one answer in every tier, so each one
 * has a Common, Uncommon, Rare, Epic and One in a Luffillion answer.
 */
export function rq(id: string, prompt: string, hint: string, list: string, matchAs?: string): Question {
  for (const raw of list.split(/,(?!\s*Model:)/)) {
    const k = raw.trim();
    if (matchAs === C && k && !(k in D) && /^[A-Za-z0-9]+$/.test(k)) UNKNOWN_KEYS.push(`${id}: ${k}`);
  }
  return withEveryTier(ranked(`rk-${id}`, prompt, hint, list, matchAs));
}

/**
 * A copy of a question with at least one answer in every tier (when it has 5+ answers): everything
 * but the four rarest answers is Common, then one answer each for Uncommon, Rare, Epic and Luffillion.
 */
export function withEveryTier(q: Question): Question {
  const t = q.tiers;
  if (t.common.length && t.uncommon.length && t.rare.length && t.epic.length && t.luffillion.length) return q;
  const all = [...t.common, ...t.uncommon, ...t.rare, ...t.epic, ...t.luffillion];
  const n = all.length;
  if (n < 5) return q;
  return {
    ...q,
    tiers: {
      common: all.slice(0, n - 4),
      uncommon: all.slice(n - 4, n - 3),
      rare: all.slice(n - 3, n - 2),
      epic: all.slice(n - 2, n - 1),
      luffillion: all.slice(n - 1),
    },
  };
}
