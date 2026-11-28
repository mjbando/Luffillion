"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { RankedLeaderboardEntry } from "@/lib/ranked-types";

/** Leaderboard positions (top 25) by lowercase username, shared by every name on the Ranked screens. */
const LadderContext = createContext<ReadonlyMap<string, { rank: number; pirateKing: boolean }>>(new Map());

export function LadderProvider({ leaderboard, children }: { leaderboard?: RankedLeaderboardEntry[]; children: ReactNode }) {
  const map = useMemo(
    () => new Map((leaderboard ?? []).map((e) => [e.username.trim().toLowerCase(), {
      rank: e.rank,
      // The Most Wanted captain: #1 on the ladder with at least one win.
      pirateKing: e.rank === 1 && e.wins > 0,
    }])),
    [leaderboard],
  );
  return <LadderContext.Provider value={map}>{children}</LadderContext.Provider>;
}

/**
 * A captain's name with its tags: DEV for the developer, a gold "Pirate King · #1 Ranked" for the
 * Most Wanted captain, and "#N Ranked" for the rest of the top 25. `plain` hides the ladder tag
 * (for names inside sentences); `kingOnly` keeps just the Pirate King tag (on the leaderboard itself).
 */
export default function RankedUsername({ username, className = "", plain = false, kingOnly = false }: { username: string; className?: string; plain?: boolean; kingOnly?: boolean }) {
  const isDeveloper = username.trim().toLowerCase() === "luffy";
  const ladder = useContext(LadderContext).get(username.trim().toLowerCase());
  const tag = plain || !ladder || (kingOnly && !ladder.pirateKing) ? null : ladder.pirateKing ? "Pirate King · #1 Ranked" : `#${ladder.rank} Ranked`;
  const label = [username, isDeveloper && "developer", tag].filter(Boolean).join(", ");

  return (
    <span className={className} aria-label={label}>
      <span>{username}</span>
      {isDeveloper && (
        <span aria-hidden="true" className="ml-1 border border-amber-300/40 bg-amber-300/10 px-1 text-[10px] tracking-wider text-amber-200">
          DEV
        </span>
      )}
      {tag && (
        <span aria-hidden="true" className={`rk-ladder-tag ${ladder!.pirateKing ? "is-king" : ""}`} title={ladder!.pirateKing ? "Most Wanted captain: #1 on the ranked ladder" : `#${ladder!.rank} on the ranked ladder`}>
          {ladder!.pirateKing && <span className="rk-ladder-crown">♛</span>}{tag}
        </span>
      )}
    </span>
  );
}
