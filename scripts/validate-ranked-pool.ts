// Checks the Ranked question pool: npx tsx scripts/validate-ranked-pool.ts
import { ORIGINAL_QUESTIONS, QUESTION_BANK, type Question } from "../src/data/questions";
import { RANKED_POOL_QUESTIONS } from "../src/data/bank/ranked-pool";
import { UNKNOWN_KEYS } from "../src/data/bank/ranked-pool/build";
import { RANKED_QUESTIONS } from "../src/lib/ranked-questions";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let problems = 0;
const fail = (msg: string) => { problems++; console.log("✗ " + msg); };

const ids = new Map<string, number>();
const prompts = new Map<string, string>();
for (const q of [...ORIGINAL_QUESTIONS, ...RANKED_POOL_QUESTIONS]) {
  ids.set(q.id, (ids.get(q.id) ?? 0) + 1);
  const p = norm(q.prompt);
  if (prompts.has(p) && prompts.get(p) !== q.id && q.id.startsWith("rk-")) fail(`duplicate prompt: ${q.id} = ${prompts.get(p)} (${q.prompt})`);
  prompts.set(p, q.id);
}
for (const [id, n] of ids) if (n > 1) fail(`duplicate id ${id}`);
for (const k of UNKNOWN_KEYS) fail(`unknown name key ${k}`);

// Answers of the shared category questions, to check spellings of fruits, crews, locations, arcs.
const byId = new Map(QUESTION_BANK.map((q) => [q.id, q]));
const known = (cat: string) => new Set(Object.values(byId.get(cat)?.tiers ?? {}).flat().flatMap((a) => a.split("|").map(norm)));
const catalog: Record<string, Set<string>> = {};
for (const q of RANKED_POOL_QUESTIONS) {
  const all = Object.values(q.tiers).flat();
  if (all.length < 5) fail(`${q.id}: only ${all.length} answers`);
  for (const [tier, list] of Object.entries(q.tiers)) if (!list.length) fail(`${q.id}: empty ${tier}`);
  if (q.matchAs && q.matchAs !== "characters") {
    catalog[q.matchAs] ??= known(q.matchAs);
    const missing = all.filter((a) => !a.split("|").some((p) => catalog[q.matchAs!].has(norm(p))));
    if (missing.length && q.matchAs === "devil-fruits") fail(`${q.id}: fruit names not in the Devil Fruit list: ${missing.join("; ")}`);
    else if (missing.length && process.argv.includes("--names")) console.log(`  (${q.id}: not in ${q.matchAs} list: ${missing.join("; ")})`);
  }
}

const left = ORIGINAL_QUESTIONS.filter((q) => !RANKED_QUESTIONS.includes(q) && !RANKED_QUESTIONS.some((r) => r.id === q.id));
console.log(`original: ${ORIGINAL_QUESTIONS.length} (left out of Ranked: ${left.map((q) => q.id).join(", ")})`);
console.log(`new pool: ${RANKED_POOL_QUESTIONS.length}`);
console.log(`ranked total: ${RANKED_QUESTIONS.length}`);
const req = ["q-fought-luffy","q-ate-fruit","q-haki","rk-pirate-crew","q-marines","q-impel-down","q-been-wano","rk-been-marineford","rk-been-sabaody","q-has-bounty","q-scarred","q-uses-sword","q-fought-zoro","rk-fought-sanji","q-east-blue","rk-appeared-grand-line","rk-appeared-new-world","q-warlords-former-current","q-worst-generation","rk-emperor-crew"];
for (const id of req) if (!RANKED_QUESTIONS.some((q: Question) => q.id === id)) fail(`requested question missing from ranked: ${id}`);
console.log(problems ? `${problems} problem(s)` : "all good");
process.exit(problems ? 1 : 0);
