import type { Tier } from "./tiers";
import { ARCS_QUESTION } from "./bank/arcs";
import { CHARACTERS_QUESTION } from "./bank/characters";
import { CREWS_QUESTION } from "./bank/crews";
import { DEVIL_FRUITS_QUESTION } from "./bank/devilFruits";
import { LOCATIONS_QUESTION } from "./bank/locations";
import { SHIPS_QUESTION } from "./bank/ships";
import { SWORDS_QUESTION } from "./bank/swords";
import { TECHNIQUES_QUESTION } from "./bank/techniques";
import { EXTRA_QUESTIONS } from "./bank/extra";
import { buildDerived } from "./derived";
import { ANSWER_ADDITIONS, ANSWER_ALIASES } from "./bank/additions";
import { CURATED_CHARACTERS } from "./bank/curated/characters";
import { CURATED_CHARACTERS_2 } from "./bank/curated/characters2";
import { CURATED_POWERS } from "./bank/curated/powers";
import { CURATED_WORLD } from "./bank/curated/world";
import { CURATED_SAGA_CASTS } from "./bank/curated/sagas";
import { CURATED_FACTIONS } from "./bank/curated/factions";
import { CURATED_TRAITS } from "./bank/curated/traits";
import { CURATED_MOVES_AND_LORE } from "./bank/curated/moves_and_lore";
import { CURATED_SCHEDULE_SWAPS } from "./bank/curated/schedule-swaps";
import { CURATED_NOV_28 } from "./bank/curated/nov28";

// Each entry is "Display Name|alias|alias". The display name is what gets revealed.
// Matching ignores case, accents, punctuation and extra spaces, plus smart category aliases.
export interface Question {
  id: string;
  prompt: string;
  hint: string;
  tiers: Record<Tier, string[]>;
  matchAs?: string; // reuse another category's matching shortcuts (e.g. "characters")
}

// These IDs in EXTRA_QUESTIONS have expanded versions in CURATED_QUESTIONS;
// keep them in QUESTION_BANK for legacy lookups, but omit duplicates from ORIGINAL_QUESTIONS.
const DUPLICATE_EXTRA_IDS = new Set([
  "marines",
  "worst-generation",
  "whitebeard-pirates",
  "billion-bounties",
  "revolutionaries",
  "cipher-pol",
  "baroque-works",
]);

const BASE_QUESTIONS: Question[] = [
  CHARACTERS_QUESTION,
  DEVIL_FRUITS_QUESTION,
  LOCATIONS_QUESTION,
  TECHNIQUES_QUESTION,
  SWORDS_QUESTION,
  SHIPS_QUESTION,
  CREWS_QUESTION,
  ARCS_QUESTION,
  ...EXTRA_QUESTIONS,
];

const CURATED_QUESTIONS: Question[] = [
  ...CURATED_CHARACTERS,
  ...CURATED_CHARACTERS_2,
  ...CURATED_POWERS,
  ...CURATED_WORLD,
  ...CURATED_SAGA_CASTS,
  ...CURATED_FACTIONS,
  ...CURATED_TRAITS,
  ...CURATED_MOVES_AND_LORE,
  ...CURATED_SCHEDULE_SWAPS,
  ...CURATED_NOV_28,
];

// Same rules as answer matching (lib/daily normalize), kept local to avoid an import cycle.
const normalizeName = (input: string) =>
  input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/^the /, "").trim();

/** Applies the hand-reviewed additions: new answers into their stated tier, extra aliases onto existing answers. */
function applyAdditions(questions: Question[]) {
  for (const q of questions) {
    const aliases = ANSWER_ALIASES[q.id], add = ANSWER_ADDITIONS[q.id];
    if (!aliases && !add) continue;
    const tiers = { ...q.tiers };
    if (aliases) {
      for (const tier of Object.keys(tiers) as Tier[]) {
        tiers[tier] = tiers[tier].map((raw) => {
          const extra = aliases[raw.split("|")[0]];
          return extra ? [raw, ...extra].join("|") : raw;
        });
      }
    }
    const taken = new Set(Object.values(tiers).flat().flatMap((raw) => raw.split("|").map(normalizeName)));
    for (const [tier, list] of Object.entries(add ?? {}) as [Tier, string[]][]) {
      for (const listed of list) {
        // "Father's Day" should also match "Fathers Day": add apostrophe-free spellings.
        const parts = listed.split("|");
        const raw = [...new Set([...parts, ...parts.filter((n) => n.includes("'")).map((n) => n.replace(/'/g, ""))])].join("|");
        const keys = raw.split("|").map(normalizeName);
        if (keys.some((k) => taken.has(k))) continue; // already accepted under some spelling
        keys.forEach((k) => taken.add(k));
        tiers[tier] = [...tiers[tier], raw];
      }
    }
    q.tiers = tiers;
  }
}

/**
 * Devil Fruit answers everywhere accept every spelling the main Devil Fruit lists know (Japanese name,
 * English name, model name), and "Name a Devil Fruit that transforms" lists every Zoan.
 * (Model-only / family-only guesses are handled when matching, in lib/daily.)
 */
function completeFruitAnswers(questions: Question[]) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const sources = ["devil-fruits", "zoan"].map((id) => byId.get(id)).filter((q): q is Question => !!q);
  const spellings = new Map<string, string[]>(); // any spelling -> all spellings of that fruit
  for (const src of sources) {
    for (const raw of Object.values(src.tiers).flat()) {
      const parts = raw.split("|");
      const group = parts.map((p) => spellings.get(normalizeName(p))).find(Boolean) ?? [];
      for (const p of parts) if (!group.some((g) => normalizeName(g) === normalizeName(p))) group.push(p);
      for (const p of group) spellings.set(normalizeName(p), group);
    }
  }
  const isFruitQuestion = (q: Question) => (q.matchAs ?? q.id) === "devil-fruits" || q.id === "zoan";
  for (const q of questions) {
    if (!isFruitQuestion(q)) continue;
    const tiers = { ...q.tiers };
    for (const tier of Object.keys(tiers) as Tier[]) {
      tiers[tier] = tiers[tier].map((raw) => {
        const parts = raw.split("|");
        const group = spellings.get(normalizeName(parts[0]));
        if (!group) return raw;
        const have = new Set(parts.map(normalizeName));
        return [...parts, ...group.filter((g) => !have.has(normalizeName(g)))].join("|");
      });
    }
    q.tiers = tiers;
  }
  // Every Zoan transforms its user, so the transform question takes them all.
  const transform = byId.get("q-transform-fruit"), zoan = byId.get("zoan");
  if (transform && zoan) {
    const taken = new Set(Object.values(transform.tiers).flat().flatMap((raw) => raw.split("|").map(normalizeName)));
    const missing = Object.values(zoan.tiers).flat()
      .filter((raw) => !raw.split("|").some((p) => taken.has(normalizeName(p))))
      .map((raw) => spellings.get(normalizeName(raw.split("|")[0]))?.join("|") ?? raw);
    transform.tiers = { ...transform.tiers, epic: [...transform.tiers.epic, ...missing] };
  }
}

// All hand-crafted, non-duplicate, non-generated original One Piece questions.
// Curated questions that repeat another one (same prompt in other words, same answers). They stay in
// QUESTION_BANK so old matches, reveals and levels still resolve, but are never picked again, so a
// question shows up at most once in the Daily Voyage and once in the Ranked pool.
const RETIRED_CURATED_IDS = new Set([
  "q-warlords", // same Warlords question as q-warlords-former-current (the Nov 27 Daily Voyage version)
  "q-former-warlord-bounty", // a narrower copy of the same Warlords question
]);

export const ORIGINAL_QUESTIONS: Question[] = [
  ...BASE_QUESTIONS.filter((q) => !DUPLICATE_EXTRA_IDS.has(q.id)),
  ...CURATED_QUESTIONS.filter((q) => !RETIRED_CURATED_IDS.has(q.id)),
];

// Full bank includes legacy derived questions so existing IDs/reveals still resolve cleanly.
export const QUESTION_BANK: Question[] = [...BASE_QUESTIONS, ...CURATED_QUESTIONS, ...buildDerived(BASE_QUESTIONS)];
// After the legacy derived questions are built, so their (already played) answer sets stay frozen.
applyAdditions([...BASE_QUESTIONS, ...CURATED_QUESTIONS]);
completeFruitAnswers([...BASE_QUESTIONS, ...CURATED_QUESTIONS]);
