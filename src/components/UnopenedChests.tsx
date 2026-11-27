"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Gift } from "lucide-react";
import "./treasure.css";
import ChestOpening, { type ChestReward } from "./ChestOpening";
import PixelChest from "./PixelChest";
import { TREASURE_RARITY_COLORS, type ChestRarity } from "@/lib/treasure";
import type { UnopenedChest } from "@/lib/ranked-achievements";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";

export interface RewardOpenResult {
  coins: number;
  result: ChestReward;
  unopenedChests: UnopenedChest[];
}

interface Session { id: number; chest: ChestRarity; reward: ChestReward | null }

const label = (rarity: string) => rarity[0].toUpperCase() + rarity.slice(1);

/** Earned reward chests waiting to be opened. Opening is free and plays the full chest animation. */
export default function UnopenedChests({ chests, coins, onOpened, compact = false, emptyText }: {
  chests: UnopenedChest[];
  coins: number;
  onOpened: (data: RewardOpenResult) => void;
  compact?: boolean;
  /** Shown when there are no chests; omit to render nothing. */
  emptyText?: string;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<UnopenedChest[] | null>(null);
  const counter = useRef(0);
  const list = remaining ?? chests;

  async function open(chest: UnopenedChest) {
    if (session && !session.reward) return;
    playClick();
    setError("");
    const id = ++counter.current;
    setSession({ id, chest: chest.chestRarity, reward: null });
    try {
      const data = await voyageRequest<RewardOpenResult>("/api/treasure", "POST", { rewardChestId: chest.id });
      setSession((current) => (current && current.id === id ? { ...current, reward: data.result } : current));
      setRemaining(data.unopenedChests);
      onOpened(data);
    } catch (cause) {
      setSession((current) => (current && current.id === id ? null : current));
      setError(cause instanceof Error ? cause.message : "The chest could not be opened.");
    }
  }

  if (!list.length && !session && !error) {
    return emptyText ? <p className="uc-empty">{emptyText}</p> : null;
  }

  const next = list[0];

  return (
    <section className={`uc-wrap ${compact ? "is-compact" : ""}`} aria-labelledby="uc-title">
      <h3 id="uc-title" className="uc-title">
        <Gift size={16} aria-hidden="true" /> UNOPENED CHESTS
        <span className="uc-count">{list.length}</span>
      </h3>
      {error && <p role="alert" className="ts-error mb-2">{error}</p>}
      {list.length > 0 && (
        <ul className="uc-list">
          {list.map((chest) => {
            const color = TREASURE_RARITY_COLORS[chest.chestRarity];
            return (
              <li key={chest.id} className="uc-item" style={{ "--uc-color": color } as CSSProperties}>
                <PixelChest chest={chest.chestRarity} size={compact ? 40 : 48} className="uc-chest shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-pixel-display text-base leading-tight" style={{ color }}>{label(chest.chestRarity)} Chest</p>
                  <p className="truncate text-xs text-slate-400">{chest.label}</p>
                </div>
                <button type="button" className="ts-btn ts-btn-gold h-9 px-3" disabled={Boolean(session)} onClick={() => void open(chest)}>
                  OPEN
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {session && (
        <ChestOpening
          key={session.id}
          chest={session.chest}
          reward={session.reward}
          coins={coins}
          free
          onAgain={next ? () => void open(next) : undefined}
          onClose={() => { setSession(null); setRemaining(null); }}
        />
      )}
    </section>
  );
}
