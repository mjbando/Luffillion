"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Coins, PackageOpen } from "lucide-react";
import "./treasure.css";
import CharacterPortrait from "./CharacterPortrait";
import ChestOpening, { type ChestReward } from "./ChestOpening";
import PixelChest from "./PixelChest";
import UnopenedChests, { type RewardOpenResult } from "./UnopenedChests";
import type { UnopenedChest } from "@/lib/ranked-achievements";
import { characterById, type CharacterId } from "@/data/playable-characters";
import { TREASURE_ROSTER } from "@/data/roster";
import { COINS_PER_ADVENTURE_LEVEL, COINS_PER_DAILY_VOYAGE, COINS_PER_RANKED_WIN } from "@/lib/coins";
import { CHARACTER_POOLS, CHEST_PRICES, chestOdds, TREASURE_CHESTS, TREASURE_RARITIES, TREASURE_RARITY_COLORS, type ChestRarity, type TreasureRarity } from "@/lib/treasure";
import type { Captain } from "@/lib/voyage";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";

interface ChestOpeningRecord {
  chestRarity: ChestRarity;
  rewardRarity: TreasureRarity;
  characterId: CharacterId;
  duplicateCoins: number;
  cost: number;
  createdAt: string;
}

interface ShopData {
  coins: number;
  unlockedCharacterIds: CharacterId[];
  recentOpenings: ChestOpeningRecord[];
  unopenedChests: UnopenedChest[];
}

interface OpenResult {
  coins: number;
  result: ChestReward;
}

interface Session {
  id: number;
  chest: ChestRarity;
  reward: ChestReward | null;
}

function displayRarity(rarity: string) {
  return rarity[0].toUpperCase() + rarity.slice(1);
}

function oddsLabel(basisPoints: number) {
  return `${Number((basisPoints / 100).toFixed(2))}%`;
}

const EARN_RULES = [
  { label: "Daily Voyage completed", coins: `+${COINS_PER_DAILY_VOYAGE}` },
  { label: "Adventure level beaten", coins: `+${COINS_PER_ADVENTURE_LEVEL}` },
  { label: "Ranked battle won", coins: `+${COINS_PER_RANKED_WIN}` },
];

export default function TreasureShop({ captain, onSignIn }: { captain: Captain | null; onSignIn: () => void }) {
  const [data, setData] = useState<ShopData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(captain));
  const [session, setSession] = useState<Session | null>(null);
  const sessionCounter = useRef(0);
  const captainId = captain?.id;

  useEffect(() => {
    if (!captainId) return;
    let active = true;
    voyageRequest<ShopData>("/api/treasure")
      .then((response) => { if (active) setData(response); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your coin pouch."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [captainId]);

  async function open(chest: ChestRarity) {
    if (!captain || !data || data.coins < CHEST_PRICES[chest]) return;
    if (session && !session.reward) return; // a roll is already in flight
    playClick();
    const id = ++sessionCounter.current;
    setSession({ id, chest, reward: null });
    setError("");
    try {
      const response = await voyageRequest<OpenResult>("/api/treasure", "POST", { chest });
      setSession((current) => current && current.id === id ? { ...current, reward: response.result } : current);
      setData((current) => current ? {
        ...current,
        coins: response.coins,
        unlockedCharacterIds: response.result.duplicateCoins
          ? current.unlockedCharacterIds
          : [...new Set([...current.unlockedCharacterIds, response.result.characterId])],
        recentOpenings: [{ ...response.result, createdAt: new Date().toISOString() }, ...current.recentOpenings].slice(0, 8),
      } : current);
    } catch (cause) {
      setSession((current) => current && current.id === id ? null : current);
      setError(cause instanceof Error ? cause.message : "The chest could not be opened.");
    }
  }

  const owned = new Set(data?.unlockedCharacterIds ?? []);

  function rewardOpened(response: RewardOpenResult) {
    setData((current) => current ? {
      ...current,
      coins: response.coins,
      unopenedChests: response.unopenedChests,
      unlockedCharacterIds: response.result.duplicateCoins
        ? current.unlockedCharacterIds
        : [...new Set([...current.unlockedCharacterIds, response.result.characterId])],
      recentOpenings: [{ ...response.result, createdAt: new Date().toISOString() }, ...current.recentOpenings].slice(0, 8),
    } : current);
  }

  return (
    <div className="px-3 py-3">
      <header className="mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center border border-amber-300/25 bg-amber-300/[.06] text-amber-200">
          <PackageOpen size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-[.25em] text-amber-300">CAPTAIN&apos;S TREASURE</p>
          <h2 className="font-pixel-display text-xl font-bold text-white">Treasure Chests</h2>
          <p className="text-sm text-slate-400">Spend coins to recruit new characters.</p>
        </div>
      </header>

      {!captain ? (
        <div className="border border-amber-300/30 bg-amber-300/[.07] p-4 text-center">
          <p className="text-base text-slate-200">Sign in to earn and spend coins.</p>
          <button type="button" onClick={() => { playClick(); onSignIn(); }} className="px-btn mt-3 h-9 bg-amber-400 px-5 text-base text-amber-950 hover:bg-amber-300">
            SIGN IN / CREATE ACCOUNT ▸
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between border border-amber-300/30 bg-amber-300/[.07] px-4 py-3">
            <span className="text-sm tracking-wider text-amber-100">YOUR COINS</span>
            <span className="flex items-center gap-2 font-pixel-display text-2xl tabular-nums text-amber-200">
              <Coins size={20} /> {loading ? "…" : (data?.coins ?? 0).toLocaleString()}
            </span>
          </div>

          <details className="mb-4 border border-white/10 bg-white/[.02] px-3 py-2 text-sm text-slate-300">
            <summary className="cursor-pointer text-amber-100">How to earn coins</summary>
            <ul className="mt-2 space-y-1">
              {EARN_RULES.map((rule) => (
                <li key={rule.label} className="flex justify-between gap-3">
                  <span>{rule.label}</span>
                  <span className="shrink-0 tabular-nums text-amber-200">{rule.coins}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Duplicate recruits refund half the chest&apos;s price.</p>
          </details>

          {error && <p role="alert" className="ts-error mb-3">{error}</p>}
          {!data && !error && <p role="status" className="py-4 text-center text-cyan-200">Counting your coins…</p>}

          {data && <UnopenedChests chests={data.unopenedChests ?? []} coins={data.coins} onOpened={rewardOpened} />}

          {data && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TREASURE_CHESTS.map((chest) => {
                const price = CHEST_PRICES[chest];
                const odds = chestOdds(chest);
                const color = TREASURE_RARITY_COLORS[chest];
                const canAfford = data.coins >= price;
                return (
                  <article key={chest} className={`ts-card ts-card-${chest} p-3`} style={{ "--ts-color": color } as CSSProperties}>
                    <div className="mb-2 flex items-center gap-3">
                      <PixelChest chest={chest} size={52} className="ts-card-chest shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-pixel-display text-lg leading-tight" style={{ color }}>{displayRarity(chest)} Chest</h3>
                        <span className="flex items-center gap-1 text-base text-amber-200"><Coins size={14} /> {price.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      {TREASURE_RARITIES.filter((rarity) => odds[rarity] > 0).map((rarity) => (
                        <span key={rarity} className="flex justify-between gap-1 text-slate-400">
                          <span style={{ color: TREASURE_RARITY_COLORS[rarity] }}>{displayRarity(rarity)}</span>
                          <span className="tabular-nums">{oddsLabel(odds[rarity])}</span>
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={loading || Boolean(session) || !canAfford}
                      onClick={() => void open(chest)}
                      className="ts-btn ts-btn-gold h-9 w-full"
                    >
                      {canAfford ? "OPEN CHEST" : `NEED ${(price - data.coins).toLocaleString()} MORE COINS`}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {data && (
            <section className="mt-5 border-t border-white/10 pt-3">
              <h3 className="mb-1 font-pixel-display text-lg text-white">TREASURE RECRUITS</h3>
              <p className="mb-2 text-xs text-slate-400">{TREASURE_ROSTER.length} characters, including the Straw Hats and legends that achievements used to award.</p>
              <div className="space-y-1.5">
                {[...TREASURE_RARITIES].map((rarity) => {
                  const pool = CHARACTER_POOLS[rarity];
                  const have = pool.filter((id) => owned.has(id)).length;
                  return (
                    <details key={rarity} className="ts-pool border border-white/10 bg-white/[.02]" style={{ "--ts-color": TREASURE_RARITY_COLORS[rarity] } as CSSProperties}>
                      <summary className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm">
                        <span className="w-20 shrink-0" style={{ color: TREASURE_RARITY_COLORS[rarity] }}>{displayRarity(rarity)}</span>
                        <span className="h-1 flex-1 bg-white/10"><span className="block h-full" style={{ width: `${have / pool.length * 100}%`, background: TREASURE_RARITY_COLORS[rarity] }} /></span>
                        <span className="w-14 shrink-0 text-right tabular-nums text-slate-300">{have}/{pool.length}</span>
                      </summary>
                      <div className="flex flex-wrap gap-1 px-2 pb-2">
                        {pool.map((id) => {
                          const character = characterById(id);
                          const mine = owned.has(id);
                          return (
                            <span key={id} title={mine ? character.name : `??? · ${displayRarity(rarity)}`}
                              className={`border ${mine ? "border-amber-300/50 bg-amber-300/[.06]" : "border-white/10 bg-white/[.02]"}`}>
                              <CharacterPortrait characterId={id} size={36} className={mine ? "" : "brightness-0 opacity-60"} />
                            </span>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}

          {!!data?.recentOpenings.length && (
            <section className="mt-5 border-t border-white/10 pt-3">
              <h3 className="mb-2 font-pixel-display text-lg text-white">RECENT FINDS</h3>
              <ul className="space-y-1.5">
                {data.recentOpenings.map((item, index) => {
                  const character = characterById(item.characterId);
                  return (
                    <li key={`${item.createdAt}:${index}`} className="flex items-center gap-2 border border-white/5 bg-white/[.03] px-2 py-1.5">
                      <CharacterPortrait characterId={character.id} size={34} />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{character.shortName}</span>
                      <span className="shrink-0 text-xs" style={{ color: TREASURE_RARITY_COLORS[item.rewardRarity] }}>{displayRarity(item.rewardRarity)}</span>
                      {item.duplicateCoins > 0 && <span className="shrink-0 text-xs text-amber-200">+{item.duplicateCoins}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {session && (
        <ChestOpening
          key={session.id}
          chest={session.chest}
          reward={session.reward}
          coins={data?.coins ?? 0}
          onAgain={() => void open(session.chest)}
          onClose={() => setSession(null)}
        />
      )}
    </div>
  );
}
