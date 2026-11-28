"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import RankedLobby from "./RankedLobby";
import { LadderProvider } from "./RankedUsername";
import RankedBattle from "./RankedBattle";
import CaptainLog from "../CaptainLog";
import type { Captain, FinishedVoyage, Progress } from "@/lib/voyage";
import { fromRecap, mergeProgress } from "@/lib/voyage";
import { clearCaptainCache, clearLinkedGuest, readLocalRun, voyageRequest } from "@/lib/voyage-client";
import type { RankedLobbyResponse, RankedMatchView } from "@/lib/ranked-types";
import { isMuted, playClick, setMuted } from "@/lib/sound";

export default function Ranked() {
  const [data, setData] = useState<RankedLobbyResponse | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMutedState] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authProgress, setAuthProgress] = useState<Progress | undefined>();
  const [inspectingMatchId, setInspectingMatchId] = useState<string | null>(null);
  const lastFeedbackRef = useRef<RankedLobbyResponse["feedback"]>(undefined);
  const scope = useRef(0);

  const poll = useCallback(
    async (query: string, matchId: string | null) => {
      const version = scope.current;
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (matchId) params.set("match", matchId);
      const url = `/api/ranked${params.toString() ? `?${params.toString()}` : ""}`;
      const d = await voyageRequest<RankedLobbyResponse>(url);
      if (version !== scope.current) return;
      setData((prev) => ({
        ...d,
        feedback: d.activeMatch?.id === prev?.activeMatch?.id && d.activeMatch?.round?.roundNumber === prev?.activeMatch?.round?.roundNumber
          ? lastFeedbackRef.current
          : undefined,
      }));
      if (d.activeMatch?.status === "active") {
        setInspectingMatchId(d.activeMatch.id);
      }
      setError("");
    },
    [],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMutedState(isMuted()));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Poll faster during an active match or queue search, gentler in idle lobby.
  const pollMs = data?.activeMatch?.status === "active" ? 750 : data?.inQueue ? 1000 : 2500;
  useEffect(() => {
    let live = true;
    const run = () => {
      if (live) void poll(search, inspectingMatchId).catch((e) => setError(e instanceof Error ? e.message : "Could not connect to Ranked."));
    };
    run();
    const id = setInterval(run, pollMs);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [poll, search, inspectingMatchId, pollMs]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "luffillion:session-changed") {
        scope.current++;
        setInspectingMatchId(null);
        setAccountOpen(false);
        void poll(search, null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [poll, search]);

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
    if (!m) playClick();
  }

  async function openAccount() {
    playClick();
    setAuthProgress(undefined);
    try {
      const d = await voyageRequest<{ day: string; questions: { id: string }[]; captain: Captain | null; checkpoint: Progress | null; finished: FinishedVoyage | null }>("/api/daily");
      const ids = d.questions.map((q) => q.id);
      let p = readLocalRun(d.day, ids, d.captain?.id) ?? { day: d.day, ids, q: {}, runs: [] };
      if (d.checkpoint) p = mergeProgress(d.checkpoint, p);
      if (d.finished) p = fromRecap(d.finished) ?? p;
      setAuthProgress(p);
    } catch {
      // ignore if offline
    }
    setAccountOpen(true);
  }

  async function sessionChanged(captain: Captain | null, linkedGuest: boolean) {
    const prior = data?.captain?.id;
    scope.current++;
    setInspectingMatchId(null);
    lastFeedbackRef.current = undefined;
    await poll(search, null);
    setAccountOpen(false);
    if (prior && prior !== captain?.id) clearCaptainCache(prior);
    if (linkedGuest && authProgress) clearLinkedGuest(authProgress.day);
    try {
      localStorage.setItem("luffillion:session-changed", String(Date.now()));
    } catch {
      // ignore
    }
  }

  async function act(body: Record<string, unknown>): Promise<boolean> {
    if (!data?.captain) {
      void openAccount();
      return false;
    }
    setBusy(true);
    setError("");
    const version = scope.current;
    try {
      const res = await voyageRequest<RankedLobbyResponse>("/api/ranked", "POST", {
        accountId: data.captain.id,
        q: search,
        ...body,
      });
      if (version !== scope.current) return false;
      lastFeedbackRef.current = res.feedback;
      setData(res);
      if (res.activeMatch) setInspectingMatchId(res.activeMatch.id);
      return true;
    } catch (e) {
      if (version === scope.current) setError(e instanceof Error ? e.message : "Action failed. Try again.");
      return false;
    } finally {
      if (version === scope.current) setBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="rk-loading">
        <span className="rk-eyebrow">LUFFILLION ONLINE RANKED</span>
        <h1>Scanning the Grand Line…</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <button type="button" onClick={() => void poll(search, inspectingMatchId)}>
              Try again
            </button>
          </>
        )}
        <Link href="/">← Daily voyage</Link>
      </main>
    );
  }

  const currentMatch: RankedMatchView | null = data.activeMatch;

  return (
    <LadderProvider leaderboard={data.leaderboard}>
      {accountOpen && (
        <CaptainLog
          captain={data.captain}
          progress={authProgress}
          clockRunning={currentMatch?.status === "active"}
          historyRevision={`ranked:${data.profile?.rankPoints ?? 0}`}
          saveMessage="Your Ranked points and streaks are saved to your account."
          onSessionChange={sessionChanged}
          onClose={() => setAccountOpen(false)}
        />
      )}

      {currentMatch && inspectingMatchId === currentMatch.id ? (
        <RankedBattle
          match={currentMatch}
          feedback={data.feedback}
          serverNow={data.serverNow}
          busy={busy}
          error={error}
          muted={muted}
          onMute={toggleMute}
          onGuess={(guess) => void act({ action: "guess", matchId: currentMatch.id, guess })}
          onForfeit={() => {
            const prompt = currentMatch.mode === "friendly"
              ? "Forfeit this friendly battle?"
              : currentMatch.mode === "bot"
              ? "Forfeit this bot battle? You will lose a little RP and your win streak."
              : "Forfeit this ranked match? You will lose rank points.";
            if (window.confirm(prompt)) {
              void act({ action: "forfeit", matchId: currentMatch.id });
            }
          }}
          onDone={() => {
            playClick();
            lastFeedbackRef.current = undefined;
            setInspectingMatchId(null);
            void poll(search, null);
          }}
          onPlayAgain={() => {
            playClick();
            lastFeedbackRef.current = undefined;
            setInspectingMatchId(null);
            void act({ action: "queue" });
          }}
        />
      ) : (
        <RankedLobby
          data={data}
          search={search}
          onSearch={setSearch}
          busy={busy}
          error={error}
          muted={muted}
          onMute={toggleMute}
          onAccount={() => void openAccount()}
          onQueue={() => {
            playClick();
            void act({ action: "queue" });
          }}
          onUnqueue={() => {
            playClick();
            void act({ action: "unqueue" });
          }}
          onInviteFriend={(target) => {
            playClick();
            void act({ action: "friendlyInvite", ...target });
          }}
          onAddFriend={(target) => {
            playClick();
            void act({ action: "addFriend", ...target }).then((ok) => { if (ok) setSearch(""); });
          }}
          onPlayBot={() => {
            playClick();
            lastFeedbackRef.current = undefined;
            void act({ action: "playBot" });
          }}
          onRemoveFriend={(targetId) => {
            playClick();
            void act({ action: "removeFriend", targetId });
          }}
          onAcceptInvite={(challengeId) => {
            playClick();
            void act({ action: "acceptInvite", challengeId });
          }}
          onDeclineInvite={(challengeId) => {
            playClick();
            void act({ action: "declineInvite", challengeId });
          }}
          onCancelInvite={(challengeId) => {
            playClick();
            void act({ action: "cancelInvite", challengeId });
          }}
          onInspectMatch={(m) => {
            setInspectingMatchId(m.id);
            void poll(search, m.id);
          }}
        />
      )}
    </LadderProvider>
  );
}
