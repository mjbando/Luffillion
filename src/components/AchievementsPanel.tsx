"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import PixelEmblem from "./pixel-emblems";
import CharacterPortrait from "./CharacterPortrait";
import { ACHIEVEMENTS, formatBerries, type AchievementReport } from "@/lib/achievements";
import { RETIRED_RECRUITS, rosterEntry } from "@/data/roster";
import { PLAYABLE_CHARACTERS, characterById, type CharacterId } from "@/data/playable-characters";
import { CHEST_CHARACTERS, CHEST_RARITIES, type ChestCharacterRarity } from "@/data/chest-characters";
import { TREASURE_RARITY_COLORS } from "@/lib/treasure";
import type { Captain } from "@/lib/voyage";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";
import { UPDATE_LIVE } from "@/lib/release";
import type { MilestoneReport, RankedAchievementStatus, RankedBerryAchievementStatus, UnopenedChest } from "@/lib/ranked-achievements";
import { berriesLabel } from "@/lib/coins";
import BerryMark from "./BerryMark";
import PixelChest from "./PixelChest";
import UnopenedChests, { type RewardOpenResult } from "./UnopenedChests";

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
type Collection = AchievementReport & {
  equippedCharacter: CharacterId;
  chestUnlockedCharacterIds: string[];
  /** Treasure update: everything this captain can equip, and their achievement bounty. */
  ownedCharacterIds?: string[];
  bounty?: number;
  berries?: number;
  ranked?: RankedAchievementStatus[];
  rankedBerryAchievements?: RankedBerryAchievementStatus[];
  milestones?: MilestoneReport;
  unopenedChests?: UnopenedChest[];
};

/**
 * Where the panel is shown once the treasure update is live:
 * "voyage" = daily-voyage achievements (hamburger), "ranked" = ranked achievements,
 * "characters" = the character collection (both in the Ranked menu).
 */
export type AchievementsMode = "voyage" | "ranked" | "characters";

export default function AchievementsPanel({ captain, refreshKey, onUnlock, equippedCharacter, onEquip, mode = "voyage", onBerries }: {
  mode?: AchievementsMode;
  /** Called with the new berry balance after a claim. */
  onBerries?: (berries: number) => void;
  captain: Captain;
  refreshKey: string;
  onUnlock: (ids: string[]) => void;
  equippedCharacter: CharacterId;
  onEquip: (id: CharacterId, accountId: string) => void;
}) {
  const [report, setReport] = useState<Collection | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");
  const [view, setView] = useState<"badges" | "crew" | "ranked">("badges");
  const [chestTier, setChestTier] = useState<ChestCharacterRarity | "all">("all");
  const [equipping, setEquipping] = useState<CharacterId | null>(null);
  const [showRequirement, setShowRequirement] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);
  const live = useRef(true);
  const selectionVersion = useRef(0);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  useEffect(() => {
    setError("");
    const version = selectionVersion.current;
    const ctrl = new AbortController();
    voyageRequest<Collection>("/api/account/achievements", "GET", undefined, ctrl.signal)
      .then(d => {
        if (ctrl.signal.aborted) return;
        setReport(d); onUnlock(d.newlyUnlocked);
        if (version === selectionVersion.current) onEquip(d.equippedCharacter, captain.id);
      }).catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Couldn't load achievements."); });
    return () => ctrl.abort();
  }, [captain.id, retry, refreshKey, onUnlock, onEquip]);

  useEffect(() => {
    if (view !== "badges" || !showRequirement) return;
    const el = section.current?.querySelector<HTMLDetailsElement>(`[data-achievement="${showRequirement}"]`);
    if (el) { el.open = true; el.scrollIntoView({ block: "nearest" }); el.querySelector<HTMLElement>("summary")?.focus(); }
    setShowRequirement(null);
  }, [view, showRequirement]);

  async function claim(kind: "legacy" | "ranked", id: string) {
    if (claiming) return;
    playClick(); setClaiming(id); setError(""); setNotice("");
    try {
      if (kind === "legacy") {
        const data = await voyageRequest<AchievementReport & { bounty: number; milestones: MilestoneReport }>("/api/account/achievements", "POST", { claim: "legacy", id });
        if (!live.current) return;
        const def = data.achievements.find(a => a.id === id);
        setReport(r => r ? { ...r, achievements: data.achievements, bounty: data.bounty, milestones: data.milestones } : r);
        setNotice(`Redeemed ${formatBerries(def?.bounty ?? 0)} berries. Your bounty is now ${formatBerries(data.bounty)}.`);
      } else {
        const data = await voyageRequest<{ paid: number; berries: number; rankedBerryAchievements: RankedBerryAchievementStatus[] }>("/api/account/achievements", "POST", { claim: "ranked", id });
        if (!live.current) return;
        setReport(r => r ? { ...r, berries: data.berries, rankedBerryAchievements: data.rankedBerryAchievements } : r);
        setNotice(data.paid ? `+${berriesLabel(data.paid)} added. You have ${berriesLabel(data.berries)}.` : "Already claimed.");
        onBerries?.(data.berries);
      }
    } catch (e) {
      if (live.current) setError(e instanceof Error ? e.message : "Couldn't claim this reward. Try again.");
    } finally { if (live.current) setClaiming(null); }
  }

  async function equip(id: CharacterId) {
    if (equipping || id === equippedCharacter) return;
    playClick(); setEquipping(id); setError(""); setNotice("");
    selectionVersion.current++;
    try {
      const data = await voyageRequest<{ equippedCharacter: CharacterId; accountId: string; newlyUnlocked: string[] }>("/api/account/character", "PUT", { accountId: captain.id, characterId: id });
      if (!live.current) return;
      selectionVersion.current++;
      onEquip(data.equippedCharacter, data.accountId); onUnlock(data.newlyUnlocked);
      setNotice(`Now sailing as ${characterById(data.equippedCharacter).shortName}. Saved to your account.`);
    } catch (e) {
      if (live.current) setError(e instanceof Error ? e.message : "Couldn't equip this character. Try again.");
    } finally { if (live.current) setEquipping(null); }
  }

  const earnedIds = new Set(report?.achievements.filter(a => a.unlocked).map(a => a.id) ?? []);
  const earned = earnedIds.size;
  const total = report?.achievements.length ?? 15;
  const badges = report?.achievements.filter(a => filter === "all" || (filter === "earned" ? a.unlocked : !a.unlocked)) ?? [];
  const current = characterById(equippedCharacter);
  const creatorAccount = captain.username.trim().toLowerCase() === "luffy";
  const chestUnlockedIds = new Set(report?.chestUnlockedCharacterIds ?? []);
  const achievementCharacterIds = report?.achievements.filter(a => a.unlocked && a.rewardCharacter).map(a => a.rewardCharacter as string) ?? [];
  const ownedCharacterIds = new Set(UPDATE_LIVE
    ? ["luffy", ...(report?.ownedCharacterIds ?? []), ...chestUnlockedIds]
    : ["luffy", ...achievementCharacterIds, ...(creatorAccount ? ["gear-6"] : [])]);
  // Retired recruits only show for captains who already have them.
  const crewCharacters = PLAYABLE_CHARACTERS.filter(character => (character.id !== "gear-6" || creatorAccount)
    && (!UPDATE_LIVE || !RETIRED_RECRUITS.has(character.id) || ownedCharacterIds.has(character.id)));
  const achievementRecruits = crewCharacters.filter(character => ownedCharacterIds.has(character.id)).length;
  const chestRecruits = UPDATE_LIVE ? CHEST_CHARACTERS.filter(character => chestUnlockedIds.has(character.id)).length : 0;
  const recruitCount = achievementRecruits + chestRecruits;
  const totalCharacters = crewCharacters.length + (UPDATE_LIVE ? CHEST_CHARACTERS.length : 0);
  const tiers = [...CHEST_RARITIES].reverse().filter(tier => chestTier === "all" || chestTier === tier);
  const ranked = report?.ranked ?? [];
  const rankedBerry = report?.rankedBerryAchievements ?? [];
  const rankedEarned = ranked.filter(a => a.unlocked).length + rankedBerry.filter(a => a.unlocked).length;
  const rankedTotal = (ranked.length || 3) + (rankedBerry.length || 6);
  // Live: each place shows one fixed view. Before launch the original Badges/Characters toggle stays.
  const shown = UPDATE_LIVE ? (mode === "voyage" ? "badges" : mode === "ranked" ? "ranked" : "crew") : view;
  const heading = !UPDATE_LIVE || mode === "voyage" ? "Achievements" : mode === "ranked" ? "Ranked Achievements" : "Characters";
  const unopened = report?.unopenedChests ?? [];
  function rewardOpened(data: RewardOpenResult) {
    const waiting = new Set(data.unopenedChests.map(c => c.id));
    setReport(r => r ? {
      ...r,
      unopenedChests: data.unopenedChests,
      ranked: r.ranked?.map(a => a.unopenedChestId && !waiting.has(a.unopenedChestId) ? { ...a, unopenedChestId: null } : a),
      chestUnlockedCharacterIds: data.result.duplicateCoins ? r.chestUnlockedCharacterIds : [...new Set([...r.chestUnlockedCharacterIds, data.result.characterId])],
      ownedCharacterIds: data.result.duplicateCoins ? r.ownedCharacterIds : [...new Set([...(r.ownedCharacterIds ?? []), data.result.characterId])],
    } : r);
  }
  return <section ref={section} className="p-4" aria-labelledby="achievement-title">
    <header className="flex items-center gap-3">
      <div className="grid h-14 w-14 shrink-0 place-items-center border border-amber-300/25 bg-amber-300/[.06]"><PixelEmblem kind="seal" size={40}/></div>
      <div className="flex-1"><p className="text-xs tracking-[.25em] text-amber-300">CAPTAIN&apos;S COLLECTION</p><h2 id="achievement-title" className="font-pixel-display text-xl text-white">{heading}</h2><p className="text-base text-slate-400">{!UPDATE_LIVE ? "Earn emblems. Recruit legends." : mode === "voyage" ? "Earn emblems. Raise your bounty." : mode === "ranked" ? "Battle for berries and treasure chests." : "Equip any captain you've recruited."}</p></div>
      {shown === "badges" && <span className="text-2xl text-amber-200" aria-label={`${earned} of ${total} achievements earned`}>{earned}<small className="text-base text-slate-500">/{total}</small></span>}
      {shown === "ranked" && <span className="text-2xl text-amber-200" aria-label={`${rankedEarned} of ${rankedTotal} ranked achievements earned`}>{rankedEarned}<small className="text-base text-slate-500">/{rankedTotal}</small></span>}
    </header>
    {UPDATE_LIVE && mode === "voyage" && <p className="mt-2 flex items-baseline justify-between border border-amber-300/25 bg-amber-300/[.06] px-2.5 py-1" aria-label="Achievement bounty">
      <span className="text-xs tracking-[.25em] text-amber-300">BOUNTY</span>
      <span className="text-2xl tabular-nums text-amber-100">{formatBerries(report?.bounty ?? 0)}</span>
    </p>}
    {UPDATE_LIVE && mode === "ranked" && <p className="mt-2 flex items-baseline justify-between border border-amber-300/25 bg-amber-300/[.06] px-2.5 py-1" aria-label="Your berries">
      <span className="text-xs tracking-[.25em] text-amber-300">YOUR BERRIES</span>
      <span className="flex items-center gap-1.5 text-2xl tabular-nums text-amber-100"><BerryMark size={18}/>{(report?.berries ?? 0).toLocaleString()}</span>
    </p>}
    {shown === "badges" && <div className="my-3 h-1 bg-white/10"><div className="h-full bg-amber-300 transition-[width]" style={{ width: `${earned / total * 100}%` }}/></div>}

    {(!UPDATE_LIVE || mode === "characters") && <div className="crew-equipped mt-3 flex items-center gap-3 border border-white/15 p-2.5" style={{ borderLeftColor: current.color }}>
      <CharacterPortrait characterId={current.id} size={64} className="shrink-0"/>
      <div className="min-w-0 flex-1"><p className="text-xs tracking-[.2em] text-slate-400">SAILING AS</p><p className="font-pixel-display text-base text-white">{current.name}</p><p className="text-sm" style={{ color: current.color }}>{current.epithet}</p></div>
      <span className="self-start text-sm text-emerald-300">✓ Equipped</span>
    </div>}
    {!UPDATE_LIVE && <div className="mb-3 mt-3 grid grid-cols-2 border border-[#34445e] bg-[#0b1628] p-1" aria-label="Collection view">
      <button type="button" aria-pressed={view === "badges"} onClick={() => { playClick(); setView("badges"); }} className={`h-9 text-lg ${view === "badges" ? "bg-[#24364e] text-amber-200" : "text-slate-400 hover:text-white"}`}>Badges · {earned}/{total}</button>
      <button type="button" aria-pressed={view === "crew"} onClick={() => { playClick(); setView("crew"); }} className={`h-9 text-lg ${view === "crew" ? "bg-[#24364e] text-amber-200" : "text-slate-400 hover:text-white"}`}>Characters · {recruitCount}/{totalCharacters}</button>
    </div>}
    {UPDATE_LIVE && <div className="mt-3"/>}
    {error && <p role="alert" className="mb-3 border-l-2 border-rose-400 px-2 py-1 text-base text-rose-200">{error} <button type="button" onClick={() => { playClick(); setRetry(n => n + 1); }} className="underline">Retry</button></p>}
    {notice && <p role="status" className="mb-3 border-l-2 border-emerald-400 px-2 py-1 text-base text-emerald-200">{notice}</p>}
    {!report && !error && <p role="status" className="py-6 text-center text-cyan-200">Reading your achievements and crew…</p>}

    {shown === "ranked" && UPDATE_LIVE ? <>
      <h3 className="mb-1 font-pixel-display text-base text-amber-100">Berry Bounties</h3>
      <p className="mb-3 text-base leading-tight text-slate-400">Ranked battles only (no friendly or bot battles). Claim the berries, then spend them in the Shop.</p>
      {report && <div className="mb-5 space-y-2" aria-label="Ranked berry achievements">
        {rankedBerry.map(a => {
          const claimable = a.unlocked && !a.claimed;
          return <article key={a.id} data-ranked-achievement={a.id} className={`achievement-card flex gap-3 p-3 ${a.unlocked ? "achievement-earned" : ""}`}>
            <div className={`grid h-14 w-14 shrink-0 place-items-center border border-white/10 bg-[#081326] ${a.unlocked ? "" : "grayscale opacity-60"}`}><BerryMark size={34}/></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><h3 className={`font-pixel-display text-base leading-snug ${a.unlocked ? "text-amber-100" : "text-slate-200"}`}>{a.title}</h3><span className={`shrink-0 text-sm ${a.unlocked ? "text-amber-300" : "text-slate-500"}`}>{a.unlocked ? "✓" : "◇"}</span></div>
              <p className="mt-0.5 text-base leading-tight text-slate-400">{a.description}</p>
              <p className="mt-1 text-base leading-tight">Reward: <span className={a.unlocked ? "text-amber-200" : "text-slate-300"}>฿{a.berries.toLocaleString()} berries</span></p>
              {a.unlocked ? <p className="mt-1 text-sm text-emerald-300">Earned{a.unlockedAt ? ` · ${dateLabel(a.unlockedAt)}` : ""}{a.claimed && <span className="text-slate-400"> · berries claimed</span>}</p> : <>
                {a.target > 1 && <p className="mt-1 text-sm leading-tight text-cyan-200/70">{a.goal === "crew" ? `${a.progress}/${a.target} characters unlocked` : `Current run: ${a.progress}/${a.target} Showdowns won`}</p>}
                {a.target > 1 && <div role="progressbar" aria-label={`${a.title} progress`} aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={a.progress} className="mt-1 h-1 bg-[#24334a]">
                  <div className="h-full bg-cyan-400/80 transition-[width]" style={{ width: `${Math.min(100, a.progress / a.target * 100)}%` }}/>
                </div>}
              </>}
              {claimable && <button type="button" disabled={!!claiming} onClick={() => claim("ranked", a.id)} className="px-btn ach-claim mt-2 h-9 w-full bg-amber-400 text-base tracking-wider text-amber-950 hover:bg-amber-300 disabled:opacity-60">
                {claiming === a.id ? "Claiming…" : `CLAIM ฿${a.berries.toLocaleString()} BERRIES ▸`}
              </button>}
              <p className="mt-1.5 text-xs leading-snug text-slate-500">{a.detail}</p>
            </div>
          </article>;
        })}
      </div>}
      <h3 className="mb-1 font-pixel-display text-base text-amber-100">Win Streak Chests</h3>
      <p className="mb-3 text-base leading-tight text-slate-400">Win ranked battles in a row to earn Treasure Chests. Rewards wait in your unopened chests until you open them.</p>
      {report && <UnopenedChests chests={unopened} coins={report.berries ?? 0} onOpened={rewardOpened} compact />}
      {report && <div className="space-y-2" aria-label="Ranked achievements">
        {ranked.map(a => {
          const color = TREASURE_RARITY_COLORS[a.chest];
          return <article key={a.id} data-ranked-achievement={a.id} className={`achievement-card flex gap-3 p-3 ${a.unlocked ? "achievement-earned" : ""}`}>
            <div className={`grid h-14 w-14 shrink-0 place-items-center border border-white/10 bg-[#081326] ${a.unlocked ? "" : "grayscale opacity-60"}`}><PixelChest chest={a.chest} size={44}/></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><h3 className={`font-pixel-display text-base leading-snug ${a.unlocked ? "text-amber-100" : "text-slate-200"}`}>{a.title}</h3><span className={`shrink-0 text-sm ${a.unlocked ? "text-amber-300" : "text-slate-500"}`}>{a.unlocked ? "✓" : "◇"}</span></div>
              <p className="mt-0.5 text-base leading-tight text-slate-400">{a.description}</p>
              <p className="mt-1 text-base leading-tight">Reward: <span className="capitalize" style={{ color }}>{a.chest} Chest</span></p>
              {a.unlocked ? <p className="mt-1 text-sm text-emerald-300">Earned{a.unlockedAt ? ` · ${dateLabel(a.unlockedAt)}` : ""}{a.unopenedChestId ? <span className="text-amber-200"> · chest waiting to be opened</span> : <span className="text-slate-400"> · chest opened</span>}</p> : <>
                <p className="mt-1 text-sm leading-tight text-cyan-200/70">Current streak: {a.progress}/{a.streak} wins</p>
                <div role="progressbar" aria-label={`${a.title} progress`} aria-valuemin={0} aria-valuemax={a.streak} aria-valuenow={a.progress} className="mt-1 h-1 bg-[#24334a]">
                  <div className="h-full bg-cyan-400/80 transition-[width]" style={{ width: `${Math.min(100, a.progress / a.streak * 100)}%` }}/>
                </div>
              </>}
              <p className="mt-1.5 text-xs leading-snug text-slate-500">{a.detail}</p>
            </div>
          </article>;
        })}
      </div>}
    </> : shown === "crew" ? <>
      {UPDATE_LIVE && <h3 className="mb-1 flex items-baseline justify-between font-pixel-display text-base text-amber-100">Straw Hats &amp; Legends <small className="text-sm text-slate-400">{achievementRecruits}/{crewCharacters.length}</small></h3>}
      <p className="mb-3 text-base leading-tight text-slate-400">{UPDATE_LIVE
        ? "These legends now sail in Treasure Chests. Any you recruited through achievements are yours to keep."
        : "One unique recruit per achievement. The toughest challenges unlock Emperors, the Pirate King, and Gear 5."}</p>
      <div className="grid grid-cols-2 gap-2" aria-label="Unlockable characters">
        {crewCharacters.map(character => {
          const available = UPDATE_LIVE ? ownedCharacterIds.has(character.id) : !character.achievementId || earnedIds.has(character.achievementId);
          const chestRarity = UPDATE_LIVE ? rosterEntry(character.id)?.rarity : undefined;
          const selected = character.id === equippedCharacter;
          const requirement = report?.achievements.find(a => a.id === character.achievementId) ?? ACHIEVEMENTS.find(a => a.id === character.achievementId);
          return <article key={character.id} data-crew={character.id} data-unlocked={available} data-equipped={selected}
            className={`crew-card flex flex-col border ${selected ? "border-amber-300/70" : "border-[#2d3d55]"}`}>
            <div className="crew-stage relative grid h-24 place-items-center">
              <CharacterPortrait characterId={character.id} size={88} className={available ? "" : "brightness-0"}/>
              <span className="absolute left-2 top-1 text-xs tracking-wider" style={{ color: chestRarity ? TREASURE_RARITY_COLORS[chestRarity] : available ? character.color : "#8390a4" }}>{(chestRarity ?? character.grade).toUpperCase()}</span>
              {selected && <span className="absolute right-2 top-1 text-amber-300">✓</span>}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <h3 className="font-pixel-display text-sm text-slate-100">{available ? character.shortName : "???"}</h3>
              <p className="mb-2 text-sm leading-tight text-slate-400">{available ? character.epithet : "Unknown recruit"}</p>
              {available ? <button type="button" disabled={selected || !!equipping} onClick={() => equip(character.id)} aria-label={selected ? `${character.shortName} equipped` : `Equip ${character.shortName}`}
                className={`px-btn mt-auto h-8 w-full text-base ${selected ? "bg-amber-300/15 text-amber-200" : "bg-[#25415a] text-cyan-100 hover:bg-[#31566e] disabled:opacity-50"}`}>
                {selected ? "✓ Equipped" : equipping === character.id ? "Equipping…" : "Equip ▸"}
              </button> : chestRarity || UPDATE_LIVE ? <p className="mt-auto min-h-8 text-sm leading-tight" style={{ color: chestRarity ? TREASURE_RARITY_COLORS[chestRarity] : "#fcd34d" }}>
                ◇ Find in {chestRarity === "epic" ? "an" : "a"} <span className="capitalize">{chestRarity ?? "treasure"}</span> chest
              </p> : <button type="button" onClick={() => { playClick(); setFilter("all"); setView("badges"); setShowRequirement(character.achievementId); }}
                className="mt-auto min-h-8 text-left text-sm leading-tight text-slate-400 underline-offset-2 hover:text-amber-200 hover:underline" aria-label={`View ${requirement?.title} requirement`}>
                ◇ Earn {requirement?.title}
              </button>}
            </div>
          </article>;
        })}
      </div>

      {UPDATE_LIVE && <section className="mt-6 border-t border-white/10 pt-4" aria-labelledby="chest-recruits-title">
        <h3 id="chest-recruits-title" className="mb-1 flex items-baseline justify-between font-pixel-display text-base text-amber-100">Treasure Recruits <small className="text-sm text-slate-400">{chestRecruits}/{CHEST_CHARACTERS.length}</small></h3>
        <p className="mb-3 text-base leading-tight text-slate-400">The rest of the crew, found only in Treasure Chests.</p>
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Filter treasure recruits by rarity">
          {(["all", ...[...CHEST_RARITIES].reverse()] as const).map(tier => <button key={tier} type="button" aria-pressed={chestTier === tier}
            onClick={() => { playClick(); setChestTier(tier); }}
            className={`border px-2.5 py-0.5 text-sm capitalize ${chestTier === tier ? "bg-white/10 text-white" : "border-white/10 text-slate-400 hover:text-white"}`}
            style={chestTier === tier && tier !== "all" ? { borderColor: TREASURE_RARITY_COLORS[tier], color: TREASURE_RARITY_COLORS[tier] } : undefined}>{tier}</button>)}
        </div>
        {tiers.map(tier => {
          const roster = CHEST_CHARACTERS.filter(character => character.rarity === tier);
          const owned = roster.filter(character => chestUnlockedIds.has(character.id)).length;
          const color = TREASURE_RARITY_COLORS[tier];
          return <div key={tier} className="mb-4" data-chest-tier={tier}>
            <p className="mb-1.5 flex items-center gap-2 text-sm uppercase tracking-[.2em]" style={{ color }}>
              <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${color})` }}/>{tier} · {owned}/{roster.length}<span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}/>
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" aria-label={`${tier} treasure recruits`}>
              {roster.map(character => {
                const available = chestUnlockedIds.has(character.id);
                const selected = character.id === equippedCharacter;
                return <article key={character.id} data-crew={character.id} data-unlocked={available} data-equipped={selected}
                  className={`chest-card chest-card-${tier} flex flex-col border ${selected ? "border-amber-300/70" : ""}`} style={{ "--chest-color": color } as CSSProperties}>
                  <div className="chest-stage relative grid h-[4.5rem] place-items-center">
                    <CharacterPortrait characterId={character.id} size={64} className={available ? "" : "brightness-0"}/>
                    {selected && <span className="absolute right-1 top-0 text-sm text-amber-300">✓</span>}
                  </div>
                  <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-1">
                    <h4 className="truncate text-sm leading-tight text-slate-100" title={available ? character.name : undefined}>{available ? character.shortName : "???"}</h4>
                    {available ? <button type="button" disabled={selected || !!equipping} onClick={() => equip(character.id)} aria-label={selected ? `${character.shortName} equipped` : `Equip ${character.shortName}`}
                      className={`px-btn mt-1 h-6 w-full text-sm ${selected ? "bg-amber-300/15 text-amber-200" : "bg-[#25415a] text-cyan-100 hover:bg-[#31566e] disabled:opacity-50"}`}>
                      {selected ? "✓ Equipped" : equipping === character.id ? "…" : "Equip ▸"}
                    </button> : <p className="mt-1 text-xs leading-tight" style={{ color }}>◇ Find in {/^[AEIOU]/i.test(character.grade) ? "an" : "a"} {character.grade} chest</p>}
                  </div>
                </article>;
              })}
            </div>
          </div>;
        })}
      </section>}
    </> : <>
      <div className="mb-3 flex gap-1.5" aria-label="Filter achievements">
        {([['all', 'All'], ['earned', 'Earned'], ['locked', 'Locked']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id}
          onClick={() => { playClick(); setFilter(id); }} className={`border px-3 py-1 text-base ${filter === id ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400 hover:text-white"}`}>{label}</button>)}
        <button type="button" aria-label="Refresh achievements" onClick={() => { playClick(); setRetry(n => n + 1); }} className="ml-auto px-2 text-xl text-slate-400 hover:text-cyan-200">↻</button>
      </div>
      {report && <div className="space-y-2">
        {badges.length === 0 && <p className="border border-dashed border-white/20 p-5 text-center text-slate-400">{filter === "earned"
          ? UPDATE_LIVE ? "Your first bounty is waiting. Set sail!" : "Your first recruit is waiting. Set sail!"
          : UPDATE_LIVE ? "Every emblem earned. The whole world knows your name." : "Every emblem earned. The entire crew is yours."}</p>}
        {UPDATE_LIVE && badges.map(a => <article key={a.id} className={`achievement-card flex gap-3 p-3 ${a.unlocked ? "achievement-earned" : ""}`} data-achievement={a.id} data-earned={a.unlocked}>
          <div className={`grid h-12 w-12 shrink-0 place-items-center border border-white/10 bg-[#081326] ${a.unlocked ? "" : "grayscale"}`}><PixelEmblem kind={a.emblem} size={40} dim={!a.unlocked}/></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><h3 className={`font-pixel-display text-base leading-snug ${a.unlocked ? "text-amber-100" : "text-slate-200"}`}>{a.title}</h3><span className={`shrink-0 text-sm ${a.unlocked ? "text-amber-300" : "text-slate-500"}`}>{a.unlocked ? "✓" : "◇"}</span></div>
            <p className="mt-0.5 text-base leading-tight text-slate-400">{a.description}</p>
            <p className="mt-1 text-base leading-tight">Reward: <span className={a.unlocked ? "text-amber-200" : "text-slate-300"}>{formatBerries(a.bounty ?? 0)} berries</span></p>
            {a.unlocked ? <p className="mt-1 text-sm text-emerald-300">Earned{a.unlockedAt ? ` · ${dateLabel(a.unlockedAt)}` : ""}{a.claimable && <span className="text-amber-200"> · reward ready to redeem</span>}</p> : <>
              <p className="mt-1 text-sm leading-tight text-cyan-200/70">{a.progressLabel}</p>
              <div role="progressbar" aria-label={`${a.title} progress`} aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={a.progress} className="mt-1 h-1 bg-[#24334a]">
                <div className="h-full bg-cyan-400/80 transition-[width]" style={{ width: `${Math.min(100, a.progress / a.target * 100)}%` }}/>
              </div>
            </>}
            {a.claimable && <button type="button" disabled={!!claiming} onClick={() => claim("legacy", a.id)} className="px-btn ach-claim mt-2 h-9 w-full bg-amber-400 text-base tracking-wider text-amber-950 hover:bg-amber-300 disabled:opacity-60">
              {claiming === a.id ? "Redeeming…" : `REDEEM ${formatBerries(a.bounty ?? 0)} BERRIES ▸`}
            </button>}
            <p className="mt-1.5 text-xs leading-snug text-slate-500">{a.detail}</p>
          </div>
        </article>)}
        {!UPDATE_LIVE && badges.map(a => {
          const reward = characterById(a.rewardCharacter), selected = reward.id === equippedCharacter;
          const rewardOwned = a.unlocked;
          return <details key={a.id} className={`group achievement-card ${a.unlocked ? "achievement-earned" : ""}`} data-achievement={a.id} data-earned={a.unlocked}>
            <summary onClick={playClick} className="flex cursor-pointer list-none gap-3 p-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center border border-white/10 bg-[#081326] ${a.unlocked ? "" : "grayscale"}`}><PixelEmblem kind={a.emblem} size={40} dim={!a.unlocked}/></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><h3 className={`font-pixel-display text-base leading-snug ${a.unlocked ? "text-amber-100" : "text-slate-200"}`}>{a.title}</h3><span className={`shrink-0 text-sm ${a.unlocked ? "text-amber-300" : "text-slate-500"}`}>{a.unlocked ? "✓" : "◇"}</span></div>
                <p className="mt-0.5 text-base leading-tight text-slate-400">{a.description}</p>
                <p className="mt-1 text-base leading-tight" style={{ color: rewardOwned ? reward.color : undefined }}>{rewardOwned ? `Recruited: ${reward.shortName}` : "Unlocks: ???"}{rewardOwned && <span className="text-xs text-slate-500"> · {reward.grade}</span>}</p>
                {a.unlocked ? <p className="mt-1 text-sm text-emerald-300">Earned{a.unlockedAt ? ` · ${dateLabel(a.unlockedAt)}` : ""}</p> : <>
                  <p className="mt-1 text-sm leading-tight text-cyan-200/70">{a.progressLabel}</p>
                  <div role="progressbar" aria-label={`${a.title} progress`} aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={a.progress} className="mt-1 h-1 bg-[#24334a]">
                    <div className="h-full bg-cyan-400/80 transition-[width]" style={{ width: `${Math.min(100, a.progress / a.target * 100)}%` }}/>
                  </div>
                </>}
              </div>
            </summary>
            <div className="border-t border-white/10 px-3 py-2.5">
              <p className="text-base leading-snug text-slate-300">{a.detail}</p>
              <div className="mt-2 flex items-center gap-3 border border-white/10 bg-[#0a1628] p-2">
                <CharacterPortrait characterId={reward.id} size={64} className={rewardOwned ? "shrink-0" : "shrink-0 brightness-0"}/>
                <div className="min-w-0 flex-1"><p className="font-pixel-display text-sm text-white">{rewardOwned ? reward.name : "???"}</p><p className="text-sm leading-tight text-slate-400">{rewardOwned ? reward.detail : "Unknown recruit"}</p></div>
              </div>
              {a.unlocked && <button type="button" onClick={() => equip(reward.id)} disabled={selected || !!equipping}
                aria-label={selected ? `${reward.shortName} equipped` : `Equip ${reward.shortName}`} className="px-btn mt-2 h-9 w-full bg-amber-400 text-base tracking-wider text-amber-950 hover:bg-amber-300 disabled:bg-amber-300/15 disabled:text-amber-200">
                {selected ? `✓ ${reward.shortName} equipped` : equipping === reward.id ? "Equipping…" : `EQUIP ${reward.shortName.toUpperCase()} ▸`}
              </button>}
            </div>
          </details>;
        })}
      </div>}
    </>}
    {UPDATE_LIVE && mode === "voyage" && report?.achievements.some(a => a.claimable) && <p className="mt-3 border-l-2 border-amber-300 px-2 py-1 text-sm leading-snug text-amber-100">You earned some of these before the update and kept their characters. Redeem them to add their berries to your bounty.</p>}
    <p className="mt-4 text-sm leading-snug text-slate-400">Characters are cosmetic: same timer, score and travel distance. {UPDATE_LIVE ? "Characters, bounty" : "All recruits"} and your selected character are saved to your account. Niche means Rare or better. Leaderboard medals settle after the Eastern daily reset.</p>
  </section>;
}
