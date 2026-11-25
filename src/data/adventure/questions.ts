import { ARC_NAMES, ADVENTURE_LEVELS, ADVENTURE_QUESTIONS, type AdventureArc, type AdventureLevel } from "./levels";
import { EAST_LORE } from "./lore-east";
import { PARADISE_LORE } from "./lore-paradise";
import { NEW_WORLD_LORE } from "./lore-new-world";
import { ADVENTURE_LORE_EXPANSION } from "./lore-expansion";
import type { LoreSet } from "./lore-types";
import type { Question } from "../questions";
import { checkGuess, suggestGuess } from "@/lib/daily";

// Server-side question bank. Client components import level metadata, never this module.
export interface AdventureFact { id:string; arc:AdventureArc; prompt:string; answers:string; depth:1|3|5 }
const lore: Record<string,LoreSet> = { ...EAST_LORE, ...PARADISE_LORE, ...NEW_WORLD_LORE };
for (const [arc, supplement] of Object.entries(ADVENTURE_LORE_EXPANSION)) {
  const existing = lore[arc];
  if (!existing) throw new Error(`Unknown adventure expansion arc: ${arc}`);
  lore[arc] = {
    core: [existing.core, supplement.core].filter(Boolean).join("\n"),
    lore: [existing.lore, supplement.lore].filter(Boolean).join("\n"),
    deep: [existing.deep, supplement.deep].filter(Boolean).join("\n"),
  };
}
export const ADVENTURE_FACTS: AdventureFact[] = Object.entries(lore).flatMap(([arc,set])=>
  (['core','lore','deep'] as const).flatMap((category,part)=>set[category].trim().split('\n').filter(Boolean).map((line,index)=>{
    const match = line.match(/^\s*(.*?)\s*::\s*(.*?)\s*$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(`Malformed adventure question: ${arc}/${category}/${index}: ${line}`);
    }
    const [, prompt, answers] = match;
    return {id:`adv-${arc}-${category}-${index}`,arc:arc as AdventureArc,prompt:prompt.trim(),answers:answers.trim(),depth:([1,3,5] as const)[part]};
  })),
);
const factIndex = new Map(ADVENTURE_FACTS.map(f=>[f.id,f]));
export function adventureFact(id: string) {
  const found=factIndex.get(id);
  if (!found) throw new Error(`Unknown adventure question ${id}`);
  return found;
}
function buildLevelAssignments(): Map<number, AdventureFact[]> {
  const assignments = new Map<number, AdventureFact[]>();
  const assignedIds = new Set<string>();

  for (const arc of Object.keys(ARC_NAMES) as AdventureArc[]) {
    const levels = ADVENTURE_LEVELS.filter(level => level.arc === arc).sort((a, b) => a.number - b.number);
    const buckets = new Map<AdventureFact["depth"], AdventureFact[]>([1, 3, 5].map(depth => [depth as AdventureFact["depth"], []]));
    for (const fact of ADVENTURE_FACTS) {
      if (fact.arc === arc) buckets.get(fact.depth)!.push(fact);
    }
    if (buckets.get(1)!.length + buckets.get(3)!.length + buckets.get(5)!.length < levels.length * ADVENTURE_QUESTIONS) {
      throw new Error(`Adventure arc ${arc} does not have enough unique questions.`);
    }

    for (const level of levels.filter(item => item.boss)) {
      const deep = buckets.get(5)!;
      if (deep.length < ADVENTURE_QUESTIONS) throw new Error(`Adventure boss level ${level.number} needs seven deep questions from ${arc}.`);
      const bossQuestions = deep.splice(deep.length - ADVENTURE_QUESTIONS);
      bossQuestions.forEach(question => assignedIds.add(question.id));
      assignments.set(level.number, bossQuestions);
    }

    const regularLevels = levels.filter(level => !level.boss);
    if (!regularLevels.length) continue;
    const depthOrder: AdventureFact["depth"][] = levels[0].number < 40
      ? [1, 3, 5]
      : levels[0].number < 80
        ? [3, 5, 1]
        : [5, 3, 1];
    const needed = regularLevels.length * ADVENTURE_QUESTIONS;
    const selected: AdventureFact[] = [];
    for (const depth of depthOrder) {
      selected.push(...buckets.get(depth)!);
    }
    selected.length = needed;

    const perLevel = new Map(regularLevels.map(level => [level.number, [] as AdventureFact[]]));
    let cursor = 0;
    for (const question of selected) {
      while (perLevel.get(regularLevels[cursor].number)!.length >= ADVENTURE_QUESTIONS) {
        cursor = (cursor + 1) % regularLevels.length;
      }
      perLevel.get(regularLevels[cursor].number)!.push(question);
      assignedIds.add(question.id);
      cursor = (cursor + 1) % regularLevels.length;
    }
    for (const [level, questions] of perLevel) assignments.set(level, questions);
  }

  const allAssigned = [...assignments.values()].flat();
  if (assignments.size !== 100 || allAssigned.length !== 100 * ADVENTURE_QUESTIONS || assignedIds.size !== allAssigned.length) {
    throw new Error("Adventure question assignments must contain 700 globally unique questions across 100 levels.");
  }
  for (const level of ADVENTURE_LEVELS) {
    const questions = assignments.get(level.number);
    if (!questions || questions.length !== ADVENTURE_QUESTIONS || questions.some(question => question.arc !== level.arc || !ADVENTURE_FACTS.includes(question))) {
      throw new Error(`Adventure level ${level.number} has an invalid question assignment.`);
    }
  }
  return assignments;
}

const LEVEL_QUESTION_ASSIGNMENTS = buildLevelAssignments();
export function levelQuestions(level: AdventureLevel, _attemptId: string): AdventureFact[] {
  const assigned = LEVEL_QUESTION_ASSIGNMENTS.get(level.number);
  if (!assigned) throw new Error(`No fixed question assignment for adventure level ${level.number}.`);
  return [...assigned];
}
function matchQuestion(fact: AdventureFact): Question {
  return { id:fact.id,prompt:fact.prompt,hint:ARC_NAMES[fact.arc],tiers:{common:[fact.answers],uncommon:[],rare:[],epic:[],luffillion:[]} };
}
export function answerAdventure(fact: AdventureFact, guess: string) { return checkGuess(matchQuestion(fact),guess); }
export function suggestAdventure(fact: AdventureFact, guess: string) { return suggestGuess(matchQuestion(fact),guess); }
