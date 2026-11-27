"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import AchievementsPanel from "../AchievementsPanel";
import BerryMark from "../BerryMark";
import CharacterPortrait from "../CharacterPortrait";
import MilestonesPanel from "../MilestonesPanel";
import PixelChest from "../PixelChest";
import PixelEmblem from "../pixel-emblems";
import TreasureShop from "../TreasureShop";
import { DEFAULT_CHARACTER, type CharacterId } from "@/data/playable-characters";
import type { MilestoneReport, RankedBerryAchievementStatus, UnopenedChest } from "@/lib/ranked-achievements";
import type { Captain } from "@/lib/voyage";
import { voyageRequest } from "@/lib/voyage-client";
import { playClick } from "@/lib/sound";

export type RankedMenuTab = "milestones" | "shop" | "achievements" | "characters";
const TABS: readonly { id: RankedMenuTab; label: string; title: string }[] = [
  { id: "milestones", label: "MILESTONES", title: "Bounty Milestones" },
  { id: "shop", label: "SHOP", title: "Treasure Shop" },
  { id: "achievements", label: "ACHIEVEMENTS", title: "Ranked Achievements" },
  { id: "characters", label: "CHARACTERS", title: "Characters" },
];

interface Claimables {
  milestones?: MilestoneReport;
  rankedBerryAchievements?: RankedBerryAchievementStatus[];
  unopenedChests?: UnopenedChest[];
  equippedCharacter?: CharacterId;
}

function TabIcon({ id, characterId }: { id: RankedMenuTab; characterId: CharacterId }) {
  if (id === "milestones") return <BerryMark size={22} />;
  if (id === "shop") return <PixelChest chest="legendary" size={26} />;
  if (id === "achievements") return <PixelEmblem kind="seal" size={24} />;
  return <CharacterPortrait characterId={characterId} size={30} />;
}

/** The Ranked menu: Milestones, Shop, Ranked Achievements and Characters. */
export default function RankedMenu({ captain, onSignIn, onChanged }: {
  captain: Captain | null;
  onSignIn: () => void;
  /** Something in the lobby may have changed (equipped character, berries). */
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState<RankedMenuTab | null>(null);
  const [loaded, setInfo] = useState<Claimables | null>(null);
  const [equipped, setEquipped] = useState<CharacterId>(DEFAULT_CHARACTER);
  const [revision, setRevision] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const captainId = captain?.id;

  // Red dots: rewards waiting to be claimed or opened.
  useEffect(() => {
    if (!captainId) return;
    const ctrl = new AbortController();
    voyageRequest<Claimables>("/api/account/achievements", "GET", undefined, ctrl.signal)
      .then(d => { if (!ctrl.signal.aborted) { setInfo(d); if (d.equippedCharacter) setEquipped(d.equippedCharacter); } })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [captainId, revision]);

  const close = useCallback(() => {
    setOpen(null);
    setRevision(n => n + 1);
    onChanged?.();
    trigger.current?.focus();
  }, [onChanged]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { playClick(); close(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);
  const isOpen = open !== null;
  // Focus the selected tab when the dialog first opens.
  useEffect(() => {
    if (isOpen) dialog.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, [isOpen]);

  const info = captainId ? loaded : null;
  const badge: Record<RankedMenuTab, number> = {
    milestones: info?.milestones?.milestones.filter(m => m.reached && !m.claimed).length ?? 0,
    shop: info?.unopenedChests?.length ?? 0,
    achievements: (info?.rankedBerryAchievements?.filter(a => a.unlocked && !a.claimed).length ?? 0) + (info?.unopenedChests?.length ?? 0),
    characters: 0,
  };

  function show(id: RankedMenuTab, from?: HTMLElement) {
    playClick();
    if (from) trigger.current = from;
    setOpen(id);
  }
  function navigate(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const n = TABS.length;
    const next = e.key === "ArrowRight" ? (index + 1) % n : e.key === "ArrowLeft" ? (index + n - 1) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    show(TABS[next].id);
    dialog.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  const handleEquip = useCallback((id: CharacterId) => setEquipped(id), []);
  const noop = useCallback(() => undefined, []);
  const signIn = () => { setOpen(null); onSignIn(); };
  const current = TABS.find(t => t.id === open);

  return <>
    <nav className="rk-menu" aria-label="Ranked menu">
      {TABS.map(t => <button key={t.id} type="button" data-ranked-menu={t.id} onClick={e => show(t.id, e.currentTarget)}
        aria-haspopup="dialog" aria-expanded={open === t.id} className="rk-menu-btn px-btn">
        <span className="rk-menu-icon"><TabIcon id={t.id} characterId={equipped} /></span>
        <span className="rk-menu-label">{t.label}</span>
        {badge[t.id] > 0 && <span className="rk-menu-badge" aria-label={`${badge[t.id]} waiting`}>{badge[t.id]}</span>}
      </button>)}
    </nav>

    {open && current && <div className="rk-menu-backdrop" onClick={e => { if (e.target === e.currentTarget) { playClick(); close(); } }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={current.title} className="rk-menu-dialog px-box px-scan">
        <div className="flex shrink-0 items-stretch border-b border-white/10">
          <div role="tablist" aria-label="Ranked menu sections" className="grid min-w-0 flex-1 grid-cols-4">
            {TABS.map((t, i) => <button key={t.id} type="button" role="tab" aria-selected={open === t.id} onKeyDown={e => navigate(e, i)}
              tabIndex={open === t.id ? 0 : -1} onClick={() => show(t.id)}
              className={`relative flex h-14 flex-col items-center justify-center gap-0.5 border-b-2 text-[11px] leading-none tracking-wider sm:text-sm ${open === t.id ? "border-amber-300 bg-[#21314a] text-amber-200" : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"}`}>
              <span className="grid h-7 place-items-center"><TabIcon id={t.id} characterId={equipped} /></span>{t.label}
              {badge[t.id] > 0 && <span className="rk-menu-dot" aria-hidden="true" />}
            </button>)}
          </div>
          <button type="button" aria-label="Close ranked menu" onClick={() => { playClick(); close(); }} className="w-10 shrink-0 border-l border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"><X size={16} className="mx-auto" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {open === "milestones" && <MilestonesPanel captain={captain} onSignIn={signIn} />}
          {open === "shop" && <TreasureShop key={captain?.id ?? "guest"} captain={captain} onSignIn={signIn} />}
          {(open === "achievements" || open === "characters") && (captain
            ? <AchievementsPanel key={`${captain.id}:${open}`} mode={open === "achievements" ? "ranked" : "characters"} captain={captain}
                refreshKey={String(revision)} onUnlock={noop} equippedCharacter={equipped} onEquip={handleEquip} />
            : <div className="m-4 border border-amber-300/30 bg-amber-300/[.07] p-4 text-center">
                <p className="text-base text-slate-200">Sign in to see your {open === "achievements" ? "ranked achievements" : "characters"}.</p>
                <button type="button" onClick={() => { playClick(); signIn(); }} className="px-btn mt-3 h-9 bg-amber-400 px-5 text-base text-amber-950 hover:bg-amber-300">SIGN IN / CREATE ACCOUNT ▸</button>
              </div>)}
        </div>
        <div className="shrink-0 border-t border-white/10 px-4 py-1.5 text-sm text-slate-400">{captain ? `Captain ${captain.username} · berries and characters are saved to your account` : "Sign in to earn berries"}</div>
      </div>
    </div>}
  </>;
}
