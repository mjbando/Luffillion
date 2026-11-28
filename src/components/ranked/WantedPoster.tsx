"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import CharacterPortrait from "../CharacterPortrait";
import RankedUsername from "./RankedUsername";
import { characterById } from "@/data/playable-characters";
import { ACHIEVEMENTS, formatBerries } from "@/lib/achievements";
import { rankTierFor } from "@/lib/ranked";
import type { RankedMostWanted } from "@/lib/ranked-types";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";

/**
 * Full-size WANTED poster for the Most Wanted captain: #1 on the ranked ladder (Pirate King).
 * Opened from the little CHALLENGER poster in the Ranked lobby.
 */
export default function WantedPoster({ viewerId, onClose }: { viewerId: string | null; onClose: () => void }) {
  const [wanted, setWanted] = useState<RankedMostWanted | null | undefined>(undefined);
  const [error, setError] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const ctrl = new AbortController();
    voyageRequest<{ mostWanted: RankedMostWanted | null }>("/api/ranked/most-wanted", "GET", undefined, ctrl.signal)
      .then((data) => { if (!ctrl.signal.aborted) setWanted(data.mostWanted); })
      .catch((e) => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Couldn't find the Most Wanted poster."); });
    return () => ctrl.abort();
  }, []);

  function close() { playClick(); onClose(); }

  const tier = wanted ? rankTierFor(wanted.rankPoints) : null;
  const character = wanted ? characterById(wanted.characterId) : null;
  const isYou = Boolean(wanted && viewerId && wanted.accountId === viewerId);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wanted-poster-title"
      onKeyDown={(event) => { if (event.key === "Escape") close(); }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <article className="rk-poster" data-wanted={wanted?.accountId ?? "none"}>
        <button ref={closeButton} type="button" className="rk-poster-close" aria-label="Close wanted poster" onClick={close}>
          <X size={18} />
        </button>
        <h2 id="wanted-poster-title" className="rk-poster-head">WANTED</h2>
        <p className="rk-poster-sub">MOST WANTED CAPTAIN</p>

        <div className="rk-poster-photo">
          {wanted && character ? (
            <CharacterPortrait characterId={character.id} size={150} />
          ) : (
            <span className="rk-poster-unknown">?</span>
          )}
          {isYou && <span className="rk-poster-stamp">THAT&apos;S YOU!</span>}
        </div>

        <p className="rk-poster-doa">DEAD OR ALIVE</p>

        {wanted === undefined && !error && <p role="status" className="rk-poster-note">Searching the bounty records…</p>}
        {error && <p role="alert" className="rk-poster-note">{error}</p>}
        {wanted === null && (
          <p className="rk-poster-note">No captain has won a ranked battle yet. Climb to #1 to put your name on this poster.</p>
        )}

        {wanted && tier && character && (
          <>
            <p className="rk-poster-name"><RankedUsername username={wanted.username} /></p>
            <p className="rk-poster-epithet">&ldquo;{wanted.title}&rdquo; · sails as {character.name}</p>
            <p className="rk-poster-bounty" aria-label={`Bounty ${wanted.bounty.toLocaleString()} berries`}>
              {formatBerries(wanted.bounty)}<span>-</span>
            </p>

            <dl className="rk-poster-stats">
              <div><dt>RANK</dt><dd><span className="rk-poster-rank" style={{ background: tier.color }}>{wanted.rankName}</span></dd></div>
              <div><dt>RANK POINTS</dt><dd>{wanted.rankPoints} RP</dd></div>
              <div><dt>LADDER</dt><dd>{wanted.ladderPosition ? `#${wanted.ladderPosition}` : "Unranked"}</dd></div>
              <div><dt>W-L-D</dt><dd>{wanted.wins}-{wanted.losses}-{wanted.draws}</dd></div>
              <div><dt>WIN STREAK</dt><dd>{wanted.winStreak}</dd></div>
              <div><dt>BEST STREAK</dt><dd>{wanted.bestStreak}</dd></div>
              <div className="is-wide"><dt>ACHIEVEMENTS</dt><dd>{wanted.achievements.length} / {ACHIEVEMENTS.length}</dd></div>
            </dl>
          </>
        )}

        <p className="rk-poster-foot">MARINE</p>
      </article>
    </div>
  );
}
