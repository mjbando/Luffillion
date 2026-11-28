"use client";

import { useEffect, useState } from "react";
import { RANKED_SEASON } from "@/lib/ranked";

export type SeasonPhase = "upcoming" | "live" | "ended";
export interface SeasonClock { phase: SeasonPhase; remainingMs: number }

function clockAt(now: number): SeasonClock {
  if (now < RANKED_SEASON.startsAt) return { phase: "upcoming", remainingMs: RANKED_SEASON.startsAt - now };
  if (now < RANKED_SEASON.endsAt) return { phase: "live", remainingMs: RANKED_SEASON.endsAt - now };
  return { phase: "ended", remainingMs: 0 };
}

/** Ticks once a second. Null until mounted, so server and client markup always match. */
export function useSeasonClock(): SeasonClock | null {
  const [clock, setClock] = useState<SeasonClock | null>(null);
  useEffect(() => {
    const tick = () => setClock(clockAt(Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return clock;
}

const pad = (n: number) => String(n).padStart(2, "0");
const END_LABEL = new Date(RANKED_SEASON.endsAt).toLocaleString("en-US", {
  timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const START_LABEL = new Date(RANKED_SEASON.startsAt).toLocaleString("en-US", {
  timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});

/** "SEASON 1 ENDS IN 29d 23h 59m 59s" under the Season ribbon in the ranked lobby. */
export default function SeasonCountdown({ clock }: { clock: SeasonClock | null }) {
  if (!clock) return <div className="rk-season-clock is-loading" aria-hidden="true" />;
  const n = RANKED_SEASON.number;

  if (clock.phase === "ended") {
    return (
      <div className="rk-season-clock is-ended" role="status">
        <p className="rk-season-clock-label">SEASON {n} HAS ENDED</p>
        <p className="rk-season-clock-sub">Final standings are locked in. Season {n + 1} is coming soon.</p>
      </div>
    );
  }

  const s = Math.floor(clock.remainingMs / 1000);
  const parts: [string, string][] = [
    [String(Math.floor(s / 86400)), "DAYS"],
    [pad(Math.floor(s / 3600) % 24), "HRS"],
    [pad(Math.floor(s / 60) % 60), "MIN"],
    [pad(s % 60), "SEC"],
  ];
  const finalDay = clock.phase === "live" && s < 86400;
  const label = clock.phase === "upcoming" ? `SEASON ${n} BEGINS IN` : finalDay ? `FINAL DAY · SEASON ${n} ENDS IN` : `SEASON ${n} ENDS IN`;
  const when = clock.phase === "upcoming" ? `Starts ${START_LABEL}` : `Ends ${END_LABEL}`;
  const spoken = `${label.toLowerCase()} ${parts.map(([v, u]) => `${Number(v)} ${u.toLowerCase()}`).join(", ")}`;

  return (
    <div className={`rk-season-clock ${finalDay ? "is-final" : ""}`} title={when}>
      <p className="rk-season-clock-label">{label}</p>
      <p className="rk-season-clock-digits" role="timer" aria-label={spoken}>
        {parts.map(([value, unit], i) => (
          <span key={unit} className="rk-season-clock-cell" aria-hidden="true">
            <b>{value}</b>
            <small>{unit}</small>
            {i < parts.length - 1 && <i className="rk-season-clock-sep">:</i>}
          </span>
        ))}
      </p>
      <p className="rk-season-clock-sub">{when}</p>
    </div>
  );
}
