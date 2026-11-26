"use client";

import { useEffect, useState } from "react";
import { Coins, PackageOpen } from "lucide-react";
import CharacterPortrait from "./CharacterPortrait";
import { characterById, type CharacterId } from "@/data/playable-characters";
import { CHEST_PRICES, chestOdds, TREASURE_CHESTS, TREASURE_RARITIES, TREASURE_RARITY_COLORS, type ChestRarity, type TreasureRarity } from "@/lib/treasure";
import type { Captain } from "@/lib/voyage";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";

interface ChestOpening {
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
  recentOpenings: ChestOpening[];
}

interface OpenResult {
  coins: number;
  result: Omit<ChestOpening, "createdAt"> & { characterName: string };
}

function displayRarity(rarity: string) {
  return rarity[0].toUpperCase() + rarity.slice(1);
}

function oddsLabel(basisPoints: number) {
  return `${Number((basisPoints / 100).toFixed(2))}%`;
}

export default function TreasureShop({ captain, onSignIn }: { captain: Captain | null; onSignIn: () => void }) {
  const [data, setData] = useState<ShopData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(captain));
  const [opening, setOpening] = useState<ChestRarity | null>(null);
  const [result, setResult] = useState<OpenResult["result"] | null>(null);
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
    if (!captain || opening || !data || data.coins < CHEST_PRICES[chest]) return;
    playClick();
    setOpening(chest);
    setError("");
    setResult(null);
    try {
      const response = await voyageRequest<OpenResult>("/api/treasure", "POST", { chest });
      setResult(response.result);
      setData((current) => current ? {
        ...current,
        coins: response.coins,
        unlockedCharacterIds: response.result.duplicateCoins
          ? current.unlockedCharacterIds
          : [...new Set([...current.unlockedCharacterIds, response.result.characterId])],
        recentOpenings: [{ ...response.result, createdAt: new Date().toISOString() }, ...current.recentOpenings].slice(0, 8),
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The chest could not be opened.");
    } finally {
      setOpening(null);
    }
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
          <p className="text-sm text-slate-400">Find new characters in the Grand Line.</p>
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
          <div className="mb-4 flex items-center justify-between border border-amber-300/30 bg-amber-300/[.07] px-4 py-3">
            <span className="text-sm tracking-wider text-amber-100">YOUR COINS</span>
            <span className="flex items-center gap-2 font-pixel-display text-2xl tabular-nums text-amber-200">
              <Coins size={20} /> {loading ? "…" : (data?.coins ?? 0).toLocaleString()}
            </span>
          </div>

          {error && <p role="alert" className="rk-error mb-3">{error}</p>}
          {!data && !error && <p role="status" className="py-4 text-center text-cyan-200">Counting your coins…</p>}

          {result && (
            <div className="mb-4 flex items-center gap-3 border border-amber-300/40 bg-amber-300/[.08] p-3" role="status">
              <CharacterPortrait characterId={result.characterId} size={56} />
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-widest text-amber-300">{result.duplicateCoins ? "DUPLICATE TREASURE" : "NEW RECRUIT"}</p>
                <p className="font-pixel-display text-lg text-white">{result.characterName}</p>
                <p className="text-sm" style={{ color: TREASURE_RARITY_COLORS[result.rewardRarity] }}>
                  {displayRarity(result.rewardRarity)} pull{result.duplicateCoins ? ` · +${result.duplicateCoins} coins` : ""}
                </p>
              </div>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TREASURE_CHESTS.map((chest) => {
                const price = CHEST_PRICES[chest];
                const odds = chestOdds(chest);
                const color = TREASURE_RARITY_COLORS[chest];
                const canAfford = data.coins >= price;
                return (
                  <article key={chest} className="border border-white/10 bg-white/[.03] p-3" style={{ borderTopColor: color }}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-pixel-display text-lg" style={{ color }}>{displayRarity(chest)} Chest</h3>
                      <span className="flex shrink-0 items-center gap-1 text-base text-amber-200"><Coins size={14} /> {price}</span>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      {TREASURE_RARITIES.filter((rarity) => odds[rarity] > 0).map((rarity) => (
                        <span key={rarity} className="flex justify-between gap-1 text-slate-400">
                          <span style={{ color: TREASURE_RARITY_COLORS[rarity] }}>{displayRarity(rarity)}</span>
                          <span>{oddsLabel(odds[rarity])}</span>
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={loading || !!opening || !canAfford}
                      onClick={() => void open(chest)}
                      className="rk-btn-gold h-9 w-full text-base"
                    >
                      {opening === chest ? "OPENING…" : canAfford ? "OPEN CHEST" : `NEED ${price - data.coins} MORE COINS`}
                    </button>
                  </article>
                );
              })}
            </div>
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
    </div>
  );
}