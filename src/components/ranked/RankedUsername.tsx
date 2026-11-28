"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { rankTierFor } from "@/lib/ranked";
import type { RankedLeaderboardEntry } from "@/lib/ranked-types";

/** Leaderboard positions (top 25) by lowercase username, shared by every name on the Ranked screens. */
const LadderContext = createContext<ReadonlyMap<string, { rank: number; pirateKing: boolean; color: string }>>(new Map());

export function LadderProvider({ leaderboard, children }: { leaderboard?: RankedLeaderboardEntry[]; children: ReactNode }) {
  const map = useMemo(
    () => new Map((leaderboard ?? []).map((e) => [e.username.trim().toLowerCase(), {
      rank: e.rank,
      color: rankTierFor(e.rankPoints).color,
      // The Most Wanted captain: #1 on the ladder with at least one win.
      pirateKing: e.rank === 1 && e.wins > 0,
    }])),
    [leaderboard],
  );
  return <LadderContext.Provider value={map}>{children}</LadderContext.Provider>;
}

/**
 * A captain's name with its tags: DEV for the developer, a gold "Pirate King · #1 Ranked" for the
 * Most Wanted captain, and a small rank-colored "#N" chip for the rest of the top 25. `plain` hides the ladder tag
 * (for names inside sentences); `kingOnly` keeps just the Pirate King tag (on the leaderboard itself).
 */
export default function RankedUsername({ username, className = "", plain = false, kingOnly = false }: { username: string; className?: string; plain?: boolean; kingOnly?: boolean }) {
  const isDeveloper = username.trim().toLowerCase() === "luffy";
  const ladder = useContext(LadderContext).get(username.trim().toLowerCase());
  const show = Boolean(ladder) && !plain && (!kingOnly || ladder!.pirateKing);
  const tag = !show ? null : ladder!.pirateKing ? "Pirate King · #1 Ranked" : `#${ladder!.rank} Ranked`;
  const label = [username, isDeveloper && "developer", tag].filter(Boolean).join(", ");

  return (
    <span className={className} aria-label={label}>
      <span>{username}</span>
      {isDeveloper && (
        <span aria-hidden="true" className="ml-1 border border-amber-300/40 bg-amber-300/10 px-1 text-[10px] tracking-wider text-amber-200">
          DEV
        </span>
      )}
      {show && (ladder!.pirateKing ? (
        <span aria-hidden="true" className="rk-ladder-tag is-king" title="Most Wanted captain: #1 on the ranked ladder">
          <span className="rk-ladder-crown">♛</span>{tag}
        </span>
      ) : (
        // A compact "#N" chip in the captain's rank color; the full "#N Ranked" is in the tooltip.
        <span aria-hidden="true" className="rk-ladder-chip" style={{ "--chip": ladder!.color } as CSSProperties} title={tag!}>
          #{ladder!.rank}
        </span>
      ))}
    </span>
  );
}
