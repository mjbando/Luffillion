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
import { CURATED_CHARACTERS } from "./bank/curated/characters";
import { CURATED_CHARACTERS_2 } from "./bank/curated/characters2";
import { CURATED_POWERS } from "./bank/curated/powers";
import { CURATED_WORLD } from "./bank/curated/world";
import { CURATED_SAGA_CASTS } from "./bank/curated/sagas";
import { CURATED_FACTIONS } from "./bank/curated/factions";
import { CURATED_TRAITS } from "./bank/curated/traits";
import { CURATED_MOVES_AND_LORE } from "./bank/curated/moves_and_lore";

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
];

// All hand-crafted, non-duplicate, non-generated original One Piece questions.
export const ORIGINAL_QUESTIONS: Question[] = [
  ...BASE_QUESTIONS.filter((q) => !DUPLICATE_EXTRA_IDS.has(q.id)),
  ...CURATED_QUESTIONS,
];

// Full bank includes legacy derived questions so existing IDs/reveals still resolve cleanly.
export const QUESTION_BANK: Question[] = [...BASE_QUESTIONS, ...CURATED_QUESTIONS, ...buildDerived(BASE_QUESTIONS)];
