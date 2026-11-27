"use client";

import { useEffect, useRef, useState } from "react";
import PixelEmblem from "./pixel-emblems";
import { playClick } from "@/lib/sound";
import { UPDATE_LIVE } from "@/lib/release";

/** Saturday, November 28, 2026 at 2:00 PM EST (UTC−5). */
const LAUNCH = Date.UTC(2026, 10, 28, 19, 0, 0);
const SEEN_KEY = "luffillion-update-announcement-2026-11-28";

/** "Tomorrow", "Today" or nothing, judged by the calendar day in New York. */
function dayWord(now: number) {
  const day = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(t);
  if (day(now) === day(LAUNCH)) return "Today";
  if (day(now + 86_400_000) === day(LAUNCH)) return "Tomorrow";
  return null;
}

function countdown(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), min = m % 60;
  return [d ? `${d}d` : null, `${h}h`, `${String(min).padStart(2, "0")}m`].filter(Boolean).join(" ");
}

/**
 * Pre-launch popup: announces the major update once per visit (browser session) while the release
 * switch is still off. It never shows once the update is live, or after the launch time has passed.
 */
export default function UpdateAnnouncement() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (UPDATE_LIVE || Date.now() >= LAUNCH) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* storage blocked: show it anyway */ }
    if (seen) return;
    const show = window.setTimeout(() => { setNow(Date.now()); setOpen(true); }, 0);
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { window.clearTimeout(show); window.clearInterval(id); };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (open && el && !el.open) el.showModal();
  }, [open]);

  const close = () => {
    playClick();
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    dialog.current?.close();
    setOpen(false);
  };

  if (!open || now === null) return null;
  const word = dayWord(now);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="update-title"
      aria-describedby="update-description"
      onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      className="locked-dialog"
    >
      <div className="px-scan border border-[#3a2f14] border-t-[3px] border-t-amber-300 bg-[#0d182b] text-center text-slate-100">
        <div className="px-6 py-7">
          <PixelEmblem kind="seal" size={44} className="mx-auto" />
          <p className="mt-3 text-xl tracking-[0.3em] text-amber-300">MAJOR UPDATE</p>
          <h2 id="update-title" className="mt-1 font-pixel-display text-2xl font-bold text-white">
            Coming {word ? `${word}, ` : ""}Saturday, November 28th at 2 PM EST
          </h2>
          <p id="update-description" className="mt-2 text-lg leading-tight text-slate-300">
            A major update is on the horizon, introducing everything we&apos;ve been working on. Set sail with us {word ? word.toLowerCase() : "soon"}!
          </p>
          <p className="mt-3 text-base tracking-[0.2em] text-amber-200/80 tabular-nums">SETS SAIL IN {countdown(LAUNCH - now)}</p>
          <button
            type="button"
            onClick={close}
            className="px-btn mt-4 h-11 w-full bg-amber-400 text-lg tracking-[0.2em] text-amber-950 hover:bg-amber-300"
          >
            CAN&apos;T WAIT ▸
          </button>
        </div>
      </div>
    </dialog>
  );
}
