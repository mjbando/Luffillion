"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { TREASURE_ROSTER } from "@/data/roster";
import { CODE_MAX_BERRIES, CODE_MAX_CHESTS, CODE_MAX_DAYS, describeReward, type CodeSummary } from "@/lib/codes";
import type { UnopenedChest } from "@/lib/ranked-achievements";
import { TREASURE_CHESTS, type ChestRarity } from "@/lib/treasure";
import { voyageRequest } from "@/lib/voyage-client";
import { playAchievement, playClick, playWrong } from "@/lib/sound";

export interface RedeemResult {
  code: string;
  message: string;
  coins: number;
  unopenedChests: UnopenedChest[];
  characterNew: boolean;
  reward: { characterId: string | null };
}

const nameOf = (id: string | null) => (id ? TREASURE_ROSTER.find((c) => c.id === id)?.name ?? id : null);
const label = (rarity: string) => rarity[0].toUpperCase() + rarity.slice(1);

/** Treasure Shop box where captains type a code for berries, chests or a character. */
export default function RedeemCodes({ onRedeemed }: { onRedeemed: (result: RedeemResult) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [creator, setCreator] = useState(false);
  const [codes, setCodes] = useState<CodeSummary[]>([]);

  useEffect(() => {
    let live = true;
    voyageRequest<{ creator: boolean; codes: CodeSummary[] }>("/api/codes")
      .then((data) => { if (live) { setCreator(data.creator); setCodes(data.codes); } })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    playClick();
    setBusy(true);
    setNotice(null);
    try {
      const result = await voyageRequest<RedeemResult>("/api/codes", "POST", { action: "redeem", code });
      playAchievement();
      setNotice({ ok: true, text: result.message });
      setCode("");
      onRedeemed(result);
      if (creator) voyageRequest<{ codes: CodeSummary[] }>("/api/codes").then((d) => setCodes(d.codes)).catch(() => {});
    } catch (cause) {
      playWrong();
      setNotice({ ok: false, text: cause instanceof Error ? cause.message : "That code didn't work." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-4 border border-cyan-300/25 bg-cyan-300/[.05] px-3 py-3" aria-labelledby="redeem-code-title">
      <h3 id="redeem-code-title" className="flex items-center gap-2 text-sm tracking-[.2em] text-cyan-200"><Ticket size={16} /> REDEEM A CODE</h3>
      <form onSubmit={redeem} className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={30}
          placeholder="ENTER CODE"
          aria-label="Reward code"
          autoComplete="off"
          spellCheck={false}
          className="h-10 min-w-0 flex-1 border border-white/15 bg-slate-950/70 px-3 font-pixel text-xl uppercase tracking-[.15em] text-white placeholder:text-slate-600 focus:border-cyan-300/60 focus:outline-none"
        />
        <button type="submit" disabled={busy || !code.trim()} className="px-btn h-10 shrink-0 bg-cyan-400 px-4 text-base text-cyan-950 hover:bg-cyan-300 disabled:opacity-50">
          {busy ? "…" : "REDEEM ▸"}
        </button>
      </form>
      {notice && <p role={notice.ok ? "status" : "alert"} className={`mt-2 text-sm ${notice.ok ? "text-emerald-300" : "text-rose-300"}`}>{notice.ok ? "✓ " : ""}{notice.text}</p>}
      <p className="mt-1 text-xs text-slate-500">Codes are shared by the creator. Each code works once per captain.</p>
      {creator && <CodeMaker codes={codes} onCodes={setCodes} />}
    </section>
  );
}

/** Creator-only: make new codes and switch old ones off. */
function CodeMaker({ codes, onCodes }: { codes: CodeSummary[]; onCodes: (codes: CodeSummary[]) => void }) {
  const [form, setForm] = useState({ code: "", berries: "500", chestRarity: "rare" as ChestRarity, chestCount: "0", characterId: "", maxUses: "", expiresInDays: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function send(body: Record<string, unknown>, ok: string) {
    playClick();
    setBusy(true);
    setNotice(null);
    try {
      const data = await voyageRequest<{ codes: CodeSummary[] }>("/api/codes", "POST", body);
      onCodes(data.codes);
      setNotice({ ok: true, text: ok });
      return true;
    } catch (cause) {
      setNotice({ ok: false, text: cause instanceof Error ? cause.message : "Something went wrong." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const made = await send({
      action: "create", code,
      berries: Number(form.berries || 0), chestCount: Number(form.chestCount || 0), chestRarity: form.chestRarity,
      characterId: form.characterId || null,
      maxUses: form.maxUses ? Number(form.maxUses) : null, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null,
    }, `Code ${code} is live.`);
    if (made) setForm((f) => ({ ...f, code: "" }));
  }

  const field = "h-8 min-w-0 border border-white/15 bg-slate-950/70 px-2 text-sm text-white focus:border-amber-300/60 focus:outline-none";
  return (
    <details className="mt-3 border-t border-white/10 pt-2">
      <summary className="cursor-pointer text-sm text-amber-200">Creator · make codes ({codes.length})</summary>
      <form onSubmit={create} className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <label className="col-span-2 flex flex-col gap-1">Code
          <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={24} placeholder="E.G. GEAR5-PARTY" className={`${field} uppercase tracking-wider`} />
        </label>
        <label className="flex flex-col gap-1">Berries (0–{CODE_MAX_BERRIES.toLocaleString()})
          <input type="number" min={0} max={CODE_MAX_BERRIES} value={form.berries} onChange={set("berries")} className={field} />
        </label>
        <label className="flex flex-col gap-1">Character (optional)
          <select value={form.characterId} onChange={set("characterId")} className={field}>
            <option value="">None</option>
            {TREASURE_ROSTER.map((c) => <option key={c.id} value={c.id}>{label(c.rarity)} · {c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Chests (0–{CODE_MAX_CHESTS})
          <input type="number" min={0} max={CODE_MAX_CHESTS} value={form.chestCount} onChange={set("chestCount")} className={field} />
        </label>
        <label className="flex flex-col gap-1">Chest rarity
          <select value={form.chestRarity} onChange={set("chestRarity")} className={field}>
            {TREASURE_CHESTS.map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Max uses (blank = unlimited)
          <input type="number" min={1} value={form.maxUses} onChange={set("maxUses")} className={field} />
        </label>
        <label className="flex flex-col gap-1">Expires in days (blank = never, max {CODE_MAX_DAYS})
          <input type="number" min={1} max={CODE_MAX_DAYS} value={form.expiresInDays} onChange={set("expiresInDays")} className={field} />
        </label>
        <button type="submit" disabled={busy} className="px-btn col-span-2 h-9 bg-amber-400 text-sm text-amber-950 hover:bg-amber-300 disabled:opacity-50">CREATE CODE ▸</button>
      </form>
      {notice && <p role={notice.ok ? "status" : "alert"} className={`mt-2 text-sm ${notice.ok ? "text-emerald-300" : "text-rose-300"}`}>{notice.text}</p>}
      {codes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {codes.map((c) => {
            const state = c.state.replace("-", " ").toUpperCase();
            return (
              <li key={c.code} className="flex items-center gap-2 border border-white/10 bg-white/[.02] px-2 py-1.5 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-pixel text-base tracking-wider text-white">{c.code} <span className={state === "LIVE" ? "text-emerald-300" : "text-slate-500"}>· {state}</span></p>
                  <p className="text-slate-400">{describeReward(c, nameOf(c.characterId))} · {c.uses}{c.maxUses != null ? `/${c.maxUses}` : ""} used{c.expiresAt ? ` · ends ${new Date(c.expiresAt).toLocaleDateString()}` : ""}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => void send({ action: c.disabledAt ? "enable" : "disable", code: c.code }, `${c.code} switched ${c.disabledAt ? "on" : "off"}.`)}
                  className="px-btn h-7 shrink-0 bg-slate-700 px-2 text-xs text-white hover:bg-slate-600 disabled:opacity-50">{c.disabledAt ? "TURN ON" : "TURN OFF"}</button>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
